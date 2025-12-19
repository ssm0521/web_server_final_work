import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional().nullable(),
})

// 학과 수정
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
    const validatedData = updateDepartmentSchema.parse(body)

    // 학과 존재 확인
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "학과를 찾을 수 없습니다" }, { status: 404 })
    }

    // 중복 확인
    if (validatedData.name || validatedData.code !== undefined) {
      const name = validatedData.name ?? existing.name
      const code = validatedData.code ?? existing.code

      const duplicate = await prisma.department.findFirst({
        where: {
          AND: [
            { id: { not: params.id } },
            {
              OR: [
                { name },
                ...(code ? [{ code }] : []),
              ],
            },
          ],
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "이미 존재하는 학과명 또는 코드입니다" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.code !== undefined) updateData.code = validatedData.code

    const department = await prisma.department.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(department)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("학과 수정 오류:", error)
    return NextResponse.json(
      { error: "학과 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 학과 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학과 존재 확인
    const existing = await prisma.department.findUnique({
      where: { id: params.id },
      include: {
        courses: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "학과를 찾을 수 없습니다" }, { status: 404 })
    }

    // 관련 강의가 있는지 확인
    if (existing.courses.length > 0) {
      return NextResponse.json(
        { error: "관련 강의가 있어 삭제할 수 없습니다" },
        { status: 400 }
      )
    }

    await prisma.department.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "학과가 삭제되었습니다" })
  } catch (error) {
    console.error("학과 삭제 오류:", error)
    return NextResponse.json(
      { error: "학과 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


