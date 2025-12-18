import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 위험군 식별 리포트
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
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
        sessions: {
          include: {
            attendances: true,
          },
          orderBy: { week: "asc" },
        },
        policy: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원만 위험군 리포트 조회 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const maxAbsent = course.policy?.maxAbsent || 3
    const lateToAbsent = course.policy?.lateToAbsent || 3

    // 학생별 위험도 분석
    const riskAnalysis = course.enrollments.map((enrollment) => {
      const studentAttendances = course.sessions.flatMap((session) =>
        session.attendances.filter((a) => a.studentId === enrollment.userId)
      )

      const absent = studentAttendances.filter((a) => a.status === "ABSENT").length
      const late = studentAttendances.filter((a) => a.status === "LATE").length
      const lateToAbsentCount = Math.floor(late / lateToAbsent)
      const totalAbsent = absent + lateToAbsentCount

      // 연속 지각 계산
      let consecutiveLate = 0
      let maxConsecutiveLate = 0
      for (const session of course.sessions) {
        const attendance = session.attendances.find((a) => a.studentId === enrollment.userId)
        if (attendance?.status === "LATE") {
          consecutiveLate++
          maxConsecutiveLate = Math.max(maxConsecutiveLate, consecutiveLate)
        } else {
          consecutiveLate = 0
        }
      }

      // 위험도 판정
      let riskLevel: "NORMAL" | "WARNING" | "DANGER" = "NORMAL"
      let riskReason: string[] = []

      if (totalAbsent >= maxAbsent) {
        riskLevel = "DANGER"
        riskReason.push(`결석 ${totalAbsent}회 (기준: ${maxAbsent}회)`)
      } else if (totalAbsent >= maxAbsent - 1) {
        riskLevel = "WARNING"
        riskReason.push(`결석 ${totalAbsent}회 (기준: ${maxAbsent}회)`)
      }

      if (maxConsecutiveLate >= 3) {
        if (riskLevel === "NORMAL") riskLevel = "WARNING"
        riskReason.push(`연속 지각 ${maxConsecutiveLate}회`)
      }

      return {
        student: enrollment.user,
        absent,
        late,
        lateToAbsentCount,
        totalAbsent,
        consecutiveLate: maxConsecutiveLate,
        riskLevel,
        riskReason,
      }
    })

    // 위험군 분류
    const riskGroups = {
      danger: riskAnalysis.filter((r) => r.riskLevel === "DANGER"),
      warning: riskAnalysis.filter((r) => r.riskLevel === "WARNING"),
      normal: riskAnalysis.filter((r) => r.riskLevel === "NORMAL"),
    }

    // 누적 결석 상위
    const topAbsent = [...riskAnalysis]
      .sort((a, b) => b.totalAbsent - a.totalAbsent)
      .slice(0, 10)

    // 연속 지각 상위
    const topConsecutiveLate = [...riskAnalysis]
      .sort((a, b) => b.consecutiveLate - a.consecutiveLate)
      .filter((r) => r.consecutiveLate > 0)
      .slice(0, 10)

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        code: course.code,
        section: course.section,
      },
      policy: course.policy,
      riskGroups,
      topAbsent,
      topConsecutiveLate,
      summary: {
        total: riskAnalysis.length,
        danger: riskGroups.danger.length,
        warning: riskGroups.warning.length,
        normal: riskGroups.normal.length,
      },
    })
  } catch (error) {
    console.error("위험군 리포트 조회 오류:", error)
    return NextResponse.json(
      { error: "위험군 리포트를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

