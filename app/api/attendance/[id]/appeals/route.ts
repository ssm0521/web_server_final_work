import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const appealSchema = z.object({
  message: z.string().min(1, "이의 내용을 입력하세요"),
})

// 이의제기 신청
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 학생만 이의제기 신청 가능
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "학생만 이의제기를 신청할 수 있습니다" }, { status: 403 })
    }

    // 출석 기록 확인
    const attendance = await prisma.attendance.findUnique({
      where: { id: params.id },
      include: {
        session: {
          include: {
            course: {
              include: {
                enrollments: true,
              },
            },
          },
        },
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: "출석 기록을 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인의 출석 기록인지 확인
    if (attendance.studentId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 수강생인지 확인
    const enrollment = attendance.session.course.enrollments.find(
      (e) => e.userId === session.user.id
    )

    if (!enrollment) {
      return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
    }

    // 이미 이의제기가 있는지 확인
    const existing = await prisma.appeal.findFirst({
      where: {
        attendanceId: params.id,
        studentId: session.user.id,
        status: "PENDING",
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 대기 중인 이의제기가 있습니다" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = appealSchema.parse(body)

    const appeal = await prisma.appeal.create({
      data: {
        attendanceId: params.id,
        studentId: session.user.id,
        message: validatedData.message,
        status: "PENDING",
      },
      include: {
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
    })

    return NextResponse.json(appeal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("이의제기 신청 오류:", error)
    return NextResponse.json(
      { error: "이의제기 신청 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

