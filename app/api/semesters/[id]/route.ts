import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateSemesterSchema = z.object({
  year: z.number().int().min(2000).max(3000).optional(),
  term: z.number().int().min(1).max(2).optional(),
  name: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// 학기 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateSemesterSchema.parse(body)

    // 학기 존재 확인
    const existing = await prisma.semester.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "학기를 찾을 수 없습니다" }, { status: 404 })
    }

    // year와 term이 변경되는 경우 중복 확인
    if (validatedData.year || validatedData.term) {
      const year = validatedData.year ?? existing.year
      const term = validatedData.term ?? existing.term

      const duplicate = await prisma.semester.findFirst({
        where: {
          year,
          term,
          id: { not: params.id },
        },
      })

      if (duplicate && duplicate.id !== params.id) {
        return NextResponse.json(
          { error: "이미 존재하는 학기입니다" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.year) updateData.year = validatedData.year
    if (validatedData.term) updateData.term = validatedData.term
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate)
    if (validatedData.endDate) updateData.endDate = new Date(validatedData.endDate)

    const semester = await prisma.semester.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(semester)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("학기 수정 오류:", error)
    return NextResponse.json(
      { error: "학기 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 학기 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학기 존재 확인
    const existing = await prisma.semester.findUnique({
      where: { id: params.id },
      include: {
        courses: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "학기를 찾을 수 없습니다" }, { status: 404 })
    }

    // 관련 강의가 있는지 확인
    if (existing.courses.length > 0) {
      return NextResponse.json(
        { error: "관련 강의가 있어 삭제할 수 없습니다" },
        { status: 400 }
      )
    }

    await prisma.semester.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "학기가 삭제되었습니다" })
  } catch (error) {
    console.error("학기 삭제 오류:", error)
    return NextResponse.json(
      { error: "학기 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

