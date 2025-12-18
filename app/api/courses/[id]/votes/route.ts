import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { createNotificationsForUsers } from "@/lib/notifications"
import { NotificationType } from "@prisma/client"

const createVoteSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  description: z.string().optional(),
  endAt: z.string().datetime("종료 시간을 올바르게 입력하세요"),
  options: z.array(z.string().min(1, "옵션을 입력하세요")).min(2, "최소 2개 이상의 옵션이 필요합니다"),
})

// 강의별 투표 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
        enrollments: {
          where: session.user.role === "STUDENT" ? { userId: session.user.id } : undefined,
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "STUDENT") {
      const enrollment = course.enrollments.find((e) => e.userId === session.user.id)
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    const votes = await prisma.vote.findMany({
      where: { courseId: params.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            section: true,
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
      orderBy: { createdAt: "desc" },
    })

    // 응답 데이터 변환
    const votesWithStatus = votes.map((vote) => {
      const isEnded = new Date(vote.endAt) <= new Date()
      const hasVoted =
        session.user.role === "STUDENT" && vote.voteRecords && vote.voteRecords.length > 0

      return {
        id: vote.id,
        title: vote.title,
        description: vote.description,
        endAt: vote.endAt.toISOString(),
        createdAt: vote.createdAt.toISOString(),
        course: vote.course,
        voteOptions: vote.voteOptions.map((option) => ({
          id: option.id,
          label: option.label,
          _count: option._count, // _count 정보 포함
        })),
        _count: vote._count, // _count 정보 포함
        isEnded,
        hasVoted: hasVoted || false,
      }
    })

    return NextResponse.json(votesWithStatus)
  } catch (error) {
    console.error("투표 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "투표 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 투표 생성 (교원만)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 투표 생성 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
        enrollments: {
          select: { userId: true },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 투표 생성 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createVoteSchema.parse(body)

    // 종료 시간이 현재보다 미래인지 확인
    const endAt = new Date(validatedData.endAt)
    if (endAt <= new Date()) {
      return NextResponse.json(
        { error: "종료 시간은 현재보다 미래여야 합니다" },
        { status: 400 }
      )
    }

    // 투표 생성
    const vote = await prisma.vote.create({
      data: {
        courseId: params.id,
        title: validatedData.title,
        description: validatedData.description || null,
        endAt,
        voteOptions: {
          create: validatedData.options.map((label) => ({
            label,
          })),
        },
      },
      include: {
        voteOptions: true,
      },
    })

    // 수강생에게 투표 알림 전송
    const studentIds = course.enrollments.map((e) => e.userId)
    if (studentIds.length > 0) {
      await createNotificationsForUsers(studentIds, {
        type: NotificationType.VOTE_NOTIFICATION,
        title: "새로운 투표가 생성되었습니다",
        content: `${vote.title} - 투표에 참여해주세요.`,
        link: `/student/votes?courseId=${params.id}&voteId=${vote.id}`,
      })
    }

    return NextResponse.json(vote, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("투표 생성 오류:", error)
    return NextResponse.json(
      { error: "투표 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

