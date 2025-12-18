import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AttendanceStatus } from "@prisma/client"
import { logAttendanceAction } from "@/lib/audit"

const createAttendanceSchema = z.object({
  sessionId: z.string(),
  studentId: z.string(),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED", "PENDING"]),
})

/**
 * @swagger
 * /api/attendances:
 *   post:
 *     summary: 출석 기록 생성 (교원만 가능)
 *     tags: [출석]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - studentId
 *               - status
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: 세션 ID
 *               studentId:
 *                 type: string
 *                 description: 학생 ID
 *               status:
 *                 type: string
 *                 enum: [PRESENT, LATE, ABSENT, EXCUSED, PENDING]
 *                 description: 출석 상태
 *     responses:
 *       201:
 *         description: 출석 기록 생성 성공
 *       403:
 *         description: 권한 없음 (교원이 아니거나 해당 강의의 교원이 아님)
 *       404:
 *         description: 세션 또는 학생을 찾을 수 없음
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 생성 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createAttendanceSchema.parse(body)

    // 세션 확인
    const classSession = await prisma.classSession.findUnique({
      where: { id: validatedData.sessionId },
      include: {
        course: {
          include: {
            instructor: true,
            enrollments: true,
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "수업 세션을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 생성 가능
    if (session.user.role === "INSTRUCTOR" && classSession.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 수강생인지 확인
    const enrollment = classSession.course.enrollments.find(
      (e) => e.userId === validatedData.studentId
    )

    if (!enrollment) {
      return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 400 })
    }

    // 이미 출석 기록이 있는지 확인
    const existing = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: validatedData.sessionId,
          studentId: validatedData.studentId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 출석 기록이 존재합니다. 수정 API를 사용하세요." },
        { status: 400 }
      )
    }

    // 출석 기록 생성
    const attendance = await prisma.attendance.create({
      data: {
        sessionId: validatedData.sessionId,
        studentId: validatedData.studentId,
        status: validatedData.status as AttendanceStatus,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      },
    })

    // 감사 로그 기록
    await logAttendanceAction(
      "CREATE",
      session.user.id,
      attendance.id,
      null,
      { status: attendance.status },
      request
    )

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("출석 기록 생성 오류:", error)
    return NextResponse.json(
      { error: "출석 기록 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

