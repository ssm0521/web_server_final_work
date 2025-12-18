import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const participateSchema = z.object({
  optionId: z.string().min(1, "옵션을 선택하세요"),
})

// 투표 참여 (학생만)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 학생만 투표 참여 가능
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "학생만 투표에 참여할 수 있습니다" }, { status: 403 })
    }

    const vote = await prisma.vote.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            enrollments: {
              where: { userId: session.user.id },
            },
          },
        },
        voteOptions: true,
      },
    })

    if (!vote) {
      return NextResponse.json({ error: "투표를 찾을 수 없습니다" }, { status: 404 })
    }

    // 수강생인지 확인
    const enrollment = vote.course.enrollments.find((e) => e.userId === session.user.id)
    if (!enrollment) {
      return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
    }

    // 투표 종료 여부 확인
    if (new Date(vote.endAt) <= new Date()) {
      return NextResponse.json(
        { error: "이미 종료된 투표입니다" },
        { status: 400 }
      )
    }

    // 이미 투표했는지 확인
    const existingVote = await prisma.voteRecord.findUnique({
      where: {
        voteId_userId: {
          voteId: params.id,
          userId: session.user.id,
        },
      },
    })

    if (existingVote) {
      return NextResponse.json(
        { error: "이미 투표에 참여했습니다" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = participateSchema.parse(body)

    // 옵션이 해당 투표에 속하는지 확인
    const option = vote.voteOptions.find((o) => o.id === validatedData.optionId)
    if (!option) {
      return NextResponse.json(
        { error: "유효하지 않은 옵션입니다" },
        { status: 400 }
      )
    }

    // 투표 기록 생성
    const voteRecord = await prisma.voteRecord.create({
      data: {
        voteId: params.id,
        optionId: validatedData.optionId,
        userId: session.user.id,
      },
      include: {
        option: true,
      },
    })

    return NextResponse.json(voteRecord, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("투표 참여 오류:", error)
    return NextResponse.json(
      { error: "투표 참여 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

