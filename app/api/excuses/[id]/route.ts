import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { ExcuseStatus } from "@prisma/client"
import { notifyExcuseResult } from "@/lib/notifications"
import { logExcuseAction } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const updateExcuseSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  instructorComment: z.string().optional(),
})

// 공결 신청 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const excuse = await prisma.excuseRequest.findUnique({
      where: { id: params.id },
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
    })

    if (!excuse) {
      return NextResponse.json({ error: "공결 신청을 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "STUDENT" && excuse.studentId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role === "INSTRUCTOR" && excuse.session.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    return NextResponse.json(excuse)
  } catch (error) {
    console.error("공결 신청 조회 오류:", error)
    return NextResponse.json(
      { error: "공결 신청을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 공결 승인/반려
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 승인/반려 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const excuse = await prisma.excuseRequest.findUnique({
      where: { id: params.id },
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
    })

    if (!excuse) {
      return NextResponse.json({ error: "공결 신청을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 승인/반려 가능
    if (session.user.role === "INSTRUCTOR" && excuse.session.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 이미 처리된 경우
    if (excuse.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 처리된 공결 신청입니다" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateExcuseSchema.parse(body)

    // 공결 승인 시 출석 상태를 EXCUSED로 변경
    if (validatedData.status === "APPROVED") {
      // 출석 기록 찾기 또는 생성
      const attendance = await prisma.attendance.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: excuse.sessionId,
            studentId: excuse.studentId,
          },
        },
      })

      if (attendance) {
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: { status: "EXCUSED" },
        })
      } else {
        await prisma.attendance.create({
          data: {
            sessionId: excuse.sessionId,
            studentId: excuse.studentId,
            status: "EXCUSED",
          },
        })
      }
    }

    // 공결 신청 상태 업데이트
    const updated = await prisma.excuseRequest.update({
      where: { id: params.id },
      data: {
        status: validatedData.status as ExcuseStatus,
        instructorComment: validatedData.instructorComment || null,
      },
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
    })

    // 감사 로그 기록
    await logExcuseAction(
      validatedData.status === "APPROVED" ? "APPROVE" : "REJECT",
      session.user.id,
      params.id,
      {
        status: excuse.status,
      },
      {
        status: updated.status,
        instructorComment: updated.instructorComment,
      },
      request
    )

    // 공결 결과 알림 전송
    await notifyExcuseResult(
      excuse.studentId,
      params.id,
      validatedData.status,
      updated.session.course.title
    )

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("공결 승인/반려 오류:", error)
    return NextResponse.json(
      { error: "공결 승인/반려 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

