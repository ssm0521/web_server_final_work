import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { logPolicyAction } from "@/lib/audit"

const policySchema = z.object({
  maxAbsent: z.number().int().min(0).default(3),
  lateToAbsent: z.number().int().min(1).default(3),
})

// 출석 정책 조회
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
        policy: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 정책이 없으면 기본값 반환
    if (!course.policy) {
      return NextResponse.json({
        maxAbsent: 3,
        lateToAbsent: 3,
      })
    }

    return NextResponse.json(course.policy)
  } catch (error) {
    console.error("출석 정책 조회 오류:", error)
    return NextResponse.json(
      { error: "출석 정책을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 출석 정책 설정/수정
export async function PUT(
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
        policy: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원만 정책 설정 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = policySchema.parse(body)

    // 정책이 있으면 업데이트, 없으면 생성
    const oldPolicy = course.policy
      ? {
          maxAbsent: course.policy.maxAbsent,
          lateToAbsent: course.policy.lateToAbsent,
        }
      : null

    const policy = course.policy
      ? await prisma.attendancePolicy.update({
          where: { id: course.policy.id },
          data: {
            maxAbsent: validatedData.maxAbsent,
            lateToAbsent: validatedData.lateToAbsent,
          },
        })
      : await prisma.attendancePolicy.create({
          data: {
            courseId: params.id,
            maxAbsent: validatedData.maxAbsent,
            lateToAbsent: validatedData.lateToAbsent,
          },
        })

    // 감사 로그 기록
    await logPolicyAction(
      course.policy ? "UPDATE" : "CREATE",
      session.user.id,
      policy.id,
      oldPolicy,
      {
        maxAbsent: policy.maxAbsent,
        lateToAbsent: policy.lateToAbsent,
      }
    )

    return NextResponse.json(policy)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("출석 정책 설정 오류:", error)
    return NextResponse.json(
      { error: "출석 정책 설정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


