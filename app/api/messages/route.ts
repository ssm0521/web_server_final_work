import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { createNotification } from "@/lib/notifications"
import { NotificationType } from "@prisma/client"

const messageSchema = z.object({
  receiverId: z.string().min(1, "수신자를 선택하세요"),
  courseId: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  content: z.string().min(1, "메시지 내용을 입력하세요"),
})

// 메시지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "sent" 또는 "received"
    const courseId = searchParams.get("courseId")

    const where: any = {}

    if (type === "sent") {
      where.senderId = session.user.id
    } else if (type === "received") {
      where.receiverId = session.user.id
    } else {
      // 기본: 받은 메시지와 보낸 메시지 모두
      where.OR = [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ]
    }

    if (courseId) {
      where.courseId = courseId
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("메시지 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "메시지 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 메시지 전송
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = messageSchema.parse(body)

    // 수신자 확인
    const receiver = await prisma.user.findUnique({
      where: { id: validatedData.receiverId },
    })

    if (!receiver) {
      return NextResponse.json({ error: "수신자를 찾을 수 없습니다" }, { status: 404 })
    }

    // 학생은 담당교원에게만, 교원은 수강생에게만 메시지 전송 가능
    if (session.user.role === "STUDENT") {
      if (receiver.role !== "INSTRUCTOR") {
        return NextResponse.json(
          { error: "학생은 담당교원에게만 메시지를 보낼 수 있습니다" },
          { status: 403 }
        )
      }

      // 강의 확인 (학생이 수강 중인 강의인지)
      if (validatedData.courseId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: validatedData.courseId,
            },
          },
        })

        if (!enrollment) {
          return NextResponse.json(
            { error: "수강 중인 강의가 아닙니다" },
            { status: 403 }
          )
        }
      }
    } else if (session.user.role === "INSTRUCTOR") {
      if (receiver.role !== "STUDENT") {
        return NextResponse.json(
          { error: "교원은 수강생에게만 메시지를 보낼 수 있습니다" },
          { status: 403 }
        )
      }

      // 강의 확인 (교원이 담당하는 강의인지)
      if (validatedData.courseId) {
        const course = await prisma.course.findUnique({
          where: { id: validatedData.courseId },
        })

        if (!course || course.instructorId !== session.user.id) {
          return NextResponse.json(
            { error: "담당 강의가 아닙니다" },
            { status: 403 }
          )
        }
      }
    }

    // 강의 정보 조회 (알림에 사용)
    let courseInfo = null
    if (validatedData.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: validatedData.courseId },
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
        },
      })
      courseInfo = course
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: validatedData.receiverId,
        courseId: validatedData.courseId || null,
        subject: validatedData.subject || null,
        content: validatedData.content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // 메시지 수신자에게 알림 전송
    try {
      const courseTitle = courseInfo
        ? `${courseInfo.title} (${courseInfo.code})`
        : "시스템"
      const messagePreview = message.content.length > 50
        ? message.content.substring(0, 50) + "..."
        : message.content

      await createNotification({
        userId: validatedData.receiverId,
        type: NotificationType.COURSE_ANNOUNCEMENT, // 메시지 알림으로 재사용
        title: `새 메시지: ${session.user.name}${courseInfo ? ` (${courseTitle})` : ""}`,
        content: message.subject
          ? `${message.subject}: ${messagePreview}`
          : messagePreview,
        link: receiver.role === "STUDENT"
          ? `/student/messages`
          : `/instructor/messages`,
      })
    } catch (notificationError) {
      // 알림 생성 실패해도 메시지 전송은 성공으로 처리
      console.error("메시지 알림 생성 오류:", notificationError)
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("메시지 전송 오류:", error)
    return NextResponse.json(
      { error: "메시지 전송 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

