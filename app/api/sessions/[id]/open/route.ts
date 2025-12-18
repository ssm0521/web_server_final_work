import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notifyAttendanceOpen } from "@/lib/notifications"
import { logSessionAction } from "@/lib/audit"

// 출석 열기
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원만 출석 열기 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "수업 세션을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 출석 열기 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (classSession.isOpen) {
      return NextResponse.json({ error: "이미 출석이 열려있습니다" }, { status: 400 })
    }

    if (classSession.isClosed) {
      return NextResponse.json({ error: "이미 출석이 마감되었습니다" }, { status: 400 })
    }

    // CODE 방식인 경우 인증번호 재생성 (없으면 생성)
    let attendanceCode = classSession.attendanceCode
    if (classSession.attendanceMethod === "CODE" && !attendanceCode) {
      attendanceCode = Math.floor(1000 + Math.random() * 9000).toString()
    }

    const updated = await prisma.classSession.update({
      where: { id: params.id },
      data: {
        isOpen: true,
        attendanceCode,
      },
    })

    // 감사 로그 기록
    await logSessionAction(
      "OPEN",
      session.user.id,
      params.id,
      {
        isOpen: classSession.isOpen,
        attendanceCode: classSession.attendanceCode,
      },
      {
        isOpen: updated.isOpen,
        attendanceCode: updated.attendanceCode,
      },
      request
    )

    // 수강생에게 출석 오픈 알림 전송
    await notifyAttendanceOpen(params.id, classSession.courseId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("출석 열기 오류:", error)
    return NextResponse.json(
      { error: "출석 열기 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


