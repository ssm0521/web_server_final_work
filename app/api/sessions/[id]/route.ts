import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 수업 세션 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            instructor: true,
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
          },
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "수업 세션을 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    return NextResponse.json(classSession)
  } catch (error) {
    console.error("수업 세션 조회 오류:", error)
    return NextResponse.json(
      { error: "수업 세션을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 수업 세션 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
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

    // 교원은 자신의 강의만 수정 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.startAt) updateData.startAt = new Date(body.startAt)
    if (body.endAt) updateData.endAt = new Date(body.endAt)
    if (body.room !== undefined) updateData.room = body.room
    if (body.attendanceMethod) updateData.attendanceMethod = body.attendanceMethod

    // 출석 방식이 CODE로 변경되면 새 인증번호 생성
    if (body.attendanceMethod === "CODE" && classSession.attendanceMethod !== "CODE") {
      updateData.attendanceCode = Math.floor(1000 + Math.random() * 9000).toString()
    }

    const updated = await prisma.classSession.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("수업 세션 수정 오류:", error)
    return NextResponse.json(
      { error: "수업 세션 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 수업 세션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
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

    // 교원은 자신의 강의만 삭제 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    await prisma.classSession.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "수업 세션이 삭제되었습니다" })
  } catch (error) {
    console.error("수업 세션 삭제 오류:", error)
    return NextResponse.json(
      { error: "수업 세션 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


