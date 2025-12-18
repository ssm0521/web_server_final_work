import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const departmentSchema = z.object({
  name: z.string().min(1, "학과명을 입력하세요"),
  code: z.string().optional(),
})

// 학과 목록 조회 (관리자, 교원 모두 접근 가능)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 관리자와 교원만 접근 가능
    if (session.user.role !== "ADMIN" && session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("학과 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "학과 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 학과 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = departmentSchema.parse(body)

    // 중복 확인
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: validatedData.name },
          ...(validatedData.code ? [{ code: validatedData.code }] : []),
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 학과명 또는 코드입니다" },
        { status: 400 }
      )
    }

    const department = await prisma.department.create({
      data: {
        name: validatedData.name,
        code: validatedData.code || null,
      },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("학과 생성 오류:", error)
    return NextResponse.json(
      { error: "학과 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


