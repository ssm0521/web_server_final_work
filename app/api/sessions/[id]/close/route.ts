import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 출석 마감
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원만 출석 마감 가능
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

    // 교원은 자신의 강의만 출석 마감 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (!classSession.isOpen) {
      return NextResponse.json({ error: "출석이 열려있지 않습니다" }, { status: 400 })
    }

    if (classSession.isClosed) {
      return NextResponse.json({ error: "이미 출석이 마감되었습니다" }, { status: 400 })
    }

    const updated = await prisma.classSession.update({
      where: { id: params.id },
      data: {
        isOpen: false,
        isClosed: true,
      },
    })

    // 출석하지 않은 학생들을 자동으로 결석 처리
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: classSession.courseId },
    })

    for (const enrollment of enrollments) {
      const attendance = await prisma.attendance.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: params.id,
            studentId: enrollment.userId,
          },
        },
      })

      if (!attendance) {
        // 출석 기록이 없으면 결석으로 생성
        await prisma.attendance.create({
          data: {
            sessionId: params.id,
            studentId: enrollment.userId,
            status: "ABSENT",
          },
        })
      } else if (attendance.status === "PENDING") {
        // 미정 상태면 결석으로 변경
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: { status: "ABSENT" },
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("출석 마감 오류:", error)
    return NextResponse.json(
      { error: "출석 마감 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


