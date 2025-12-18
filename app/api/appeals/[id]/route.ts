import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AppealStatus, AttendanceStatus } from "@prisma/client"
import { notifyAppealResult } from "@/lib/notifications"
import { logAppealAction, logAttendanceAction } from "@/lib/audit"

const updateAppealSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  instructorComment: z.string().optional(),
  newStatus: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]).optional(), // 승인 시 출석 상태 변경
})

// 이의제기 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: params.id },
      include: {
        attendance: {
          include: {
            session: {
              include: {
                course: {
                  include: {
                    instructor: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!appeal) {
      return NextResponse.json({ error: "이의제기를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "STUDENT" && appeal.studentId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role === "INSTRUCTOR" && appeal.attendance.session.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    return NextResponse.json(appeal)
  } catch (error) {
    console.error("이의제기 조회 오류:", error)
    return NextResponse.json(
      { error: "이의제기를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 이의제기 처리 (승인/반려 및 출석 상태 정정)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 처리 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const appeal = await prisma.appeal.findUnique({
      where: { id: params.id },
      include: {
        attendance: {
          include: {
            session: {
              include: {
                course: {
                  include: {
                    instructor: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!appeal) {
      return NextResponse.json({ error: "이의제기를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 처리 가능
    if (session.user.role === "INSTRUCTOR" && appeal.attendance.session.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 이미 처리된 경우
    if (appeal.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 처리된 이의제기입니다" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateAppealSchema.parse(body)

    const oldAttendanceStatus = appeal.attendance.status

    // 이의제기 승인 시 출석 상태 변경
    if (validatedData.status === "APPROVED" && validatedData.newStatus) {
      await prisma.attendance.update({
        where: { id: appeal.attendanceId },
        data: {
          status: validatedData.newStatus as AttendanceStatus,
        },
      })

      // 출석 상태 변경 감사 로그
      await logAttendanceAction(
        "STATUS_CHANGE",
        session.user.id,
        appeal.attendanceId,
        { status: oldAttendanceStatus },
        { status: validatedData.newStatus },
        request
      )
    }

    // 이의제기 상태 업데이트
    const updated = await prisma.appeal.update({
      where: { id: params.id },
      data: {
        status: validatedData.status as AppealStatus,
        instructorComment: validatedData.instructorComment || null,
      },
      include: {
        attendance: {
          include: {
            session: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    code: true,
                    section: true,
                  },
                },
              },
            },
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // 감사 로그 기록
    await logAppealAction(
      validatedData.status === "APPROVED" ? "APPROVE" : "REJECT",
      session.user.id,
      params.id,
      {
        status: appeal.status,
      },
      {
        status: updated.status,
        instructorComment: updated.instructorComment,
        newAttendanceStatus: validatedData.newStatus || null,
      },
      request
    )

    // 이의제기 결과 알림 전송
    await notifyAppealResult(
      appeal.studentId,
      params.id,
      validatedData.status,
      updated.attendance.session.course.title
    )

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("이의제기 처리 오류:", error)
    return NextResponse.json(
      { error: "이의제기 처리 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

