import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 공결 승인율 리포트
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    const where: any = {}

    // 교원은 자신의 강의만
    if (session.user.role === "INSTRUCTOR") {
      where.session = {
        course: {
          instructorId: session.user.id,
        },
      }
    }

    if (courseId) {
      where.session = {
        ...where.session,
        courseId,
      }
    }

    const excuses = await prisma.excuseRequest.findMany({
      where,
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
      },
    })

    // 통계 계산
    const total = excuses.length
    const approved = excuses.filter((e) => e.status === "APPROVED").length
    const rejected = excuses.filter((e) => e.status === "REJECTED").length
    const pending = excuses.filter((e) => e.status === "PENDING").length

    const approvalRate = total > 0 ? (approved / total) * 100 : 0

    // 강의별 통계
    const courseStats = new Map<string, any>()
    for (const excuse of excuses) {
      const courseId = excuse.session.courseId
      if (!courseStats.has(courseId)) {
        courseStats.set(courseId, {
          course: excuse.session.course,
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        })
      }
      const stat = courseStats.get(courseId)!
      stat.total++
      if (excuse.status === "APPROVED") stat.approved++
      else if (excuse.status === "REJECTED") stat.rejected++
      else stat.pending++
    }

    return NextResponse.json({
      overall: {
        total,
        approved,
        rejected,
        pending,
        approvalRate: Math.round(approvalRate * 100) / 100,
      },
      byCourse: Array.from(courseStats.values()).map((stat) => ({
        ...stat,
        approvalRate:
          stat.total > 0 ? Math.round((stat.approved / stat.total) * 100 * 100) / 100 : 0,
      })),
    })
  } catch (error) {
    console.error("공결 승인율 리포트 조회 오류:", error)
    return NextResponse.json(
      { error: "공결 승인율 리포트를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

