import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
})

// 공지사항 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
            enrollments: true,
          },
        },
      },
    })

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && announcement.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학생은 수강 중인 강의만 조회 가능
    if (session.user.role === "STUDENT") {
      const enrollment = announcement.course.enrollments.find((e) => e.userId === session.user.id)
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    return NextResponse.json(announcement)
  } catch (error) {
    console.error("공지사항 조회 오류:", error)
    return NextResponse.json(
      { error: "공지사항을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 공지사항 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    })

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원만 수정 가능
    if (session.user.role === "INSTRUCTOR" && announcement.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateAnnouncementSchema.parse(body)

    const updateData: any = {}
    if (validatedData.title) updateData.title = validatedData.title
    if (validatedData.content) updateData.content = validatedData.content

    const updated = await prisma.announcement.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("공지사항 수정 오류:", error)
    return NextResponse.json(
      { error: "공지사항 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 공지사항 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    })

    if (!announcement) {
      return NextResponse.json({ error: "공지사항을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원만 삭제 가능
    if (session.user.role === "INSTRUCTOR" && announcement.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    await prisma.announcement.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "공지사항이 삭제되었습니다" })
  } catch (error) {
    console.error("공지사항 삭제 오류:", error)
    return NextResponse.json(
      { error: "공지사항 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

