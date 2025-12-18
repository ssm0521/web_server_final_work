import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 투표 상세 조회
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
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            enrollments: {
              where: session.user.role === "STUDENT" ? { userId: session.user.id } : undefined,
            },
          },
        },
        voteOptions: {
          include: {
            _count: {
              select: {
                voteRecords: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        voteRecords: session.user.role === "STUDENT"
          ? {
              where: { userId: session.user.id },
            }
          : true,
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
    const hasVoted = session.user.role === "STUDENT" && vote.voteRecords.length > 0

    return NextResponse.json({
      ...vote,
      isEnded,
      hasVoted,
    })
  } catch (error) {
    console.error("투표 조회 오류:", error)
    return NextResponse.json(
      { error: "투표를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 투표 삭제 (교원만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 투표 삭제 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const vote = await prisma.vote.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    })

    if (!vote) {
      return NextResponse.json({ error: "투표를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 투표 삭제 가능
    if (session.user.role === "INSTRUCTOR" && vote.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    await prisma.vote.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "투표가 삭제되었습니다" })
  } catch (error) {
    console.error("투표 삭제 오류:", error)
    return NextResponse.json(
      { error: "투표 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

