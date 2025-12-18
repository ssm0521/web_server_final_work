import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  section: z.string().min(1).optional(),
  instructorId: z.string().optional(), // 관리자가 담당교수 변경 가능
  semesterId: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

// 강의 상세 조회
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
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        semester: true,
        department: true,
        enrollments: {
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
        sessions: {
          orderBy: { week: "asc" },
        },
        policy: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 조회 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error("강의 조회 오류:", error)
    return NextResponse.json(
      { error: "강의를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 강의 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateCourseSchema.parse(body)

    // 강의 존재 확인
    const existing = await prisma.course.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 관리자만 수정 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 교과목을 수정할 수 있습니다" }, { status: 403 })
    }

    // 담당교수 변경 시 유효성 확인
    if (validatedData.instructorId) {
      const instructor = await prisma.user.findUnique({
        where: { id: validatedData.instructorId },
      })

      if (!instructor || instructor.role !== "INSTRUCTOR") {
        return NextResponse.json({ error: "유효한 교수를 선택하세요" }, { status: 400 })
      }
    }

    // 코드/분반/학기 변경 시 중복 확인
    if (validatedData.code || validatedData.section || validatedData.semesterId) {
      const code = validatedData.code ?? existing.code
      const section = validatedData.section ?? existing.section
      const semesterId = validatedData.semesterId ?? existing.semesterId

      const duplicate = await prisma.course.findUnique({
        where: {
          code_section_semesterId: {
            code,
            section,
            semesterId,
          },
        },
      })

      if (duplicate && duplicate.id !== params.id) {
        return NextResponse.json(
          { error: "이미 존재하는 강의입니다 (과목코드 + 분반 + 학기)" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (validatedData.title) updateData.title = validatedData.title
    if (validatedData.code) updateData.code = validatedData.code
    if (validatedData.section) updateData.section = validatedData.section
    if (validatedData.instructorId) updateData.instructorId = validatedData.instructorId
    if (validatedData.semesterId) updateData.semesterId = validatedData.semesterId
    if (validatedData.departmentId !== undefined) updateData.departmentId = validatedData.departmentId
    if (validatedData.description !== undefined) updateData.description = validatedData.description

    const course = await prisma.course.update({
      where: { id: params.id },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        semester: true,
        department: true,
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("강의 수정 오류:", error)
    return NextResponse.json(
      { error: "강의 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 강의 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const existing = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        enrollments: true,
        sessions: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 삭제 가능
    if (session.user.role === "INSTRUCTOR" && existing.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 수강생이 있으면 삭제 불가 (선택사항)
    if (existing.enrollments.length > 0) {
      return NextResponse.json(
        { error: "수강생이 있어 삭제할 수 없습니다" },
        { status: 400 }
      )
    }

    await prisma.course.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "강의가 삭제되었습니다" })
  } catch (error) {
    console.error("강의 삭제 오류:", error)
    return NextResponse.json(
      { error: "강의 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


