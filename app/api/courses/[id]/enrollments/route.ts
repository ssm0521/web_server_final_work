import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 수강생 목록 조회
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
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만, 관리자는 모든 강의 조회 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error("수강생 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "수강생 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 수강신청
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 학생만 수강신청 가능
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "학생만 수강신청할 수 있습니다" }, { status: 403 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 이미 수강신청했는지 확인
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: params.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 수강신청한 강의입니다" },
        { status: 400 }
      )
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            section: true,
          },
        },
      },
    })

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    console.error("수강신청 오류:", error)
    return NextResponse.json(
      { error: "수강신청 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 수강신청 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || session.user.id

    // 관리자 또는 본인만 취소 가능
    if (session.user.role !== "ADMIN" && userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: params.id,
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ error: "수강신청 내역을 찾을 수 없습니다" }, { status: 404 })
    }

    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId,
          courseId: params.id,
        },
      },
    })

    return NextResponse.json({ message: "수강신청이 취소되었습니다" })
  } catch (error) {
    console.error("수강신청 취소 오류:", error)
    return NextResponse.json(
      { error: "수강신청 취소 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


