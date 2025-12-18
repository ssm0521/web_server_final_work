import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 인증번호 재생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원만 인증번호 생성 가능
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

    // 교원은 자신의 강의만 인증번호 생성 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    if (classSession.attendanceMethod !== "CODE") {
      return NextResponse.json(
        { error: "인증번호 방식이 아닙니다" },
        { status: 400 }
      )
    }

    // 새 인증번호 생성
    const newCode = Math.floor(1000 + Math.random() * 9000).toString()

    const updated = await prisma.classSession.update({
      where: { id: params.id },
      data: {
        attendanceCode: newCode,
      },
    })

    return NextResponse.json({ code: newCode, session: updated })
  } catch (error) {
    console.error("인증번호 생성 오류:", error)
    return NextResponse.json(
      { error: "인증번호 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


