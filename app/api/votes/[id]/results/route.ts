import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 투표 결과 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const vote = await prisma.vote.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
            enrollments: {
              where: session.user.role === "STUDENT" ? { userId: session.user.id } : undefined,
            },
          },
        },
        voteOptions: {
          include: {
            voteRecords: {
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
            _count: {
              select: {
                voteRecords: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            voteRecords: true,
          },
        },
      },
    })

    if (!vote) {
      return NextResponse.json({ error: "투표를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "STUDENT") {
      const enrollment = vote.course.enrollments.find((e) => e.userId === session.user.id)
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    // 투표 종료 여부 확인
    const isEnded = new Date(vote.endAt) <= new Date()

    // 교원 또는 관리자는 항상 결과 조회 가능, 학생은 종료 후에만 조회 가능
    if (session.user.role === "STUDENT" && !isEnded) {
      return NextResponse.json(
        { error: "투표가 종료된 후에만 결과를 조회할 수 있습니다" },
        { status: 403 }
      )
    }

    // 결과 계산
    const totalVotes = vote._count.voteRecords
    const results = vote.voteOptions.map((option) => {
      const count = option._count.voteRecords
      const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0

      return {
        id: option.id,
        label: option.label,
        count,
        percentage: Math.round(percentage * 100) / 100,
        voters: isEnded && (session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN")
          ? option.voteRecords.map((r) => ({
              id: r.user.id,
              name: r.user.name,
              email: r.user.email,
            }))
          : undefined,
      }
    })

    return NextResponse.json({
      vote: {
        id: vote.id,
        title: vote.title,
        description: vote.description,
        endAt: vote.endAt,
        isEnded,
      },
      totalVotes,
      results: results.sort((a, b) => b.count - a.count), // 득표수 순으로 정렬
    })
  } catch (error) {
    console.error("투표 결과 조회 오류:", error)
    return NextResponse.json(
      { error: "투표 결과를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

