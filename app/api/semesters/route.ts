import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const semesterSchema = z.object({
  year: z.number().int().min(2000).max(3000),
  term: z.number().int().min(1).max(2),
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

// 학기 목록 조회 (관리자, 교원 모두 접근 가능)
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

    const semesters = await prisma.semester.findMany({
      orderBy: [
        { year: "desc" },
        { term: "desc" },
      ],
    })

    return NextResponse.json(semesters)
  } catch (error) {
    console.error("학기 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "학기 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 학기 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = semesterSchema.parse(body)

    // 중복 확인
    const existing = await prisma.semester.findFirst({
      where: {
        year: validatedData.year,
        term: validatedData.term,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 학기입니다" },
        { status: 400 }
      )
    }

    const semester = await prisma.semester.create({
      data: {
        year: validatedData.year,
        term: validatedData.term,
        name: validatedData.name,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
      },
    })

    return NextResponse.json(semester, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("학기 생성 오류:", error)
    return NextResponse.json(
      { error: "학기 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

