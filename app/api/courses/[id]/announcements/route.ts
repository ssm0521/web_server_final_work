import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { createNotificationsForUsers } from "@/lib/notifications"

const announcementSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  content: z.string().min(1, "내용을 입력하세요"),
})

// 공지사항 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
        enrollments: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학생은 수강 중인 강의만 조회 가능
    if (session.user.role === "STUDENT") {
      const enrollment = course.enrollments.find((e) => e.userId === session.user.id)
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    const announcements = await prisma.announcement.findMany({
      where: { courseId: params.id },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(announcements)
  } catch (error) {
    console.error("공지사항 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "공지사항 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 공지사항 작성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
        enrollments: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원만 공지사항 작성 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = announcementSchema.parse(body)

    const announcement = await prisma.announcement.create({
      data: {
        courseId: params.id,
        title: validatedData.title,
        content: validatedData.content,
      },
    })

    // 수강생 전체에게 알림 전송
    const studentIds = course.enrollments.map((e) => e.userId)
    if (studentIds.length > 0) {
      await createNotificationsForUsers(studentIds, {
        type: "COURSE_ANNOUNCEMENT",
        title: `[${course.title}] ${validatedData.title}`,
        content: validatedData.content,
        link: `/courses/${params.id}/announcements`,
      })
    }

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("공지사항 작성 오류:", error)
    return NextResponse.json(
      { error: "공지사항 작성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

