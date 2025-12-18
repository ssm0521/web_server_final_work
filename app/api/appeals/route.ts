import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 이의제기 목록 조회
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

    // 교원은 자신의 강의 이의제기만 조회
    if (session.user.role === "INSTRUCTOR") {
      where.attendance = {
        session: {
          course: {
            instructorId: session.user.id,
          },
        },
      }
    }

    // 학생은 자신의 이의제기만 조회
    if (session.user.role === "STUDENT") {
      where.studentId = session.user.id
    } else if (studentId && session.user.role === "ADMIN") {
      where.studentId = studentId
    }

    // 강의 필터
    if (courseId) {
      where.attendance = {
        ...where.attendance,
        session: {
          ...where.attendance?.session,
          courseId,
        },
      }
    }

    const appeals = await prisma.appeal.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendance: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(appeals)
  } catch (error) {
    console.error("이의제기 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "이의제기 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

