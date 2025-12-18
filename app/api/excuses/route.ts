import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 공결 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // PENDING, APPROVED, REJECTED
    const courseId = searchParams.get("courseId")
    const studentId = searchParams.get("studentId")

    const where: any = {}

    // 상태 필터
    if (status) {
      where.status = status
    }

    // 교원은 자신의 강의 공결만 조회
    if (session.user.role === "INSTRUCTOR") {
      where.session = {
        course: {
          instructorId: session.user.id,
        },
      }
    }

    // 학생은 자신의 공결만 조회
    if (session.user.role === "STUDENT") {
      where.studentId = session.user.id
    } else if (studentId && session.user.role === "ADMIN") {
      where.studentId = studentId
    }

    // 강의 필터
    if (courseId) {
      where.session = {
        ...where.session,
        courseId,
      }
    }

    const excuses = await prisma.excuseRequest.findMany({
      where,
      include: {
        session: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                code: true,
                section: true,
                instructor: {
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
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(excuses)
  } catch (error) {
    console.error("공결 신청 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "공결 신청 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

