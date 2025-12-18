import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 출석 현황 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
            enrollments: {
              include: {
                user: {
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
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "수업 세션을 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학생은 자신의 출석만 조회 가능
    if (session.user.role === "STUDENT") {
      const enrollment = classSession.course.enrollments.find(
        (e) => e.userId === session.user.id
      )
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    // 출석 기록 조회
    const attendances = await prisma.attendance.findMany({
      where: { sessionId: params.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 수강생 전체 목록과 출석 기록 매칭
    const summary = classSession.course.enrollments.map((enrollment) => {
      const attendance = attendances.find((a) => a.studentId === enrollment.userId)
      return {
        student: enrollment.user,
        attendance: attendance || null,
      }
    })

    // 통계 계산
    const stats = {
      total: summary.length,
      present: summary.filter((s) => s.attendance?.status === "PRESENT").length,
      late: summary.filter((s) => s.attendance?.status === "LATE").length,
      absent: summary.filter((s) => s.attendance?.status === "ABSENT").length,
      pending: summary.filter((s) => s.attendance?.status === "PENDING" || !s.attendance).length,
      excused: summary.filter((s) => s.attendance?.status === "EXCUSED").length,
    }

    return NextResponse.json({
      session: classSession,
      summary,
      stats,
    })
  } catch (error) {
    console.error("출석 현황 조회 오류:", error)
    return NextResponse.json(
      { error: "출석 현황을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


