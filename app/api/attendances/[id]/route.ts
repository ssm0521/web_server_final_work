import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AttendanceStatus } from "@prisma/client"
import { logAttendanceAction } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const updateAttendanceSchema = z.object({
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED", "PENDING"]),
})

/**
 * @swagger
 * /api/attendances/{id}:
 *   patch:
 *     summary: 출석 상태 수정 (교원만 가능)
 *     tags: [출석]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 출석 기록 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PRESENT, LATE, ABSENT, EXCUSED, PENDING]
 *                 description: 새로운 출석 상태
 *     responses:
 *       200:
 *         description: 출석 상태 수정 성공
 *       403:
 *         description: 권한 없음 (교원이 아니거나 해당 강의의 교원이 아님)
 *       404:
 *         description: 출석 기록을 찾을 수 없음
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 교원 또는 관리자만 수정 가능
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateAttendanceSchema.parse(body)

    // 출석 기록 조회
    const attendance = await prisma.attendance.findUnique({
      where: { id: params.id },
      include: {
        session: {
          include: {
            course: {
              include: {
                instructor: true,
              },
            },
          },
        },
      },
    })

    if (!attendance) {
      return NextResponse.json({ error: "출석 기록을 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만 수정 가능
    if (session.user.role === "INSTRUCTOR" && attendance.session.course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const oldStatus = attendance.status

    // 출석 상태 업데이트
    const updated = await prisma.attendance.update({
      where: { id: params.id },
      data: {
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
      "STATUS_CHANGE",
      session.user.id,
      params.id,
      { status: oldStatus },
      { status: updated.status },
      request
    )

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("출석 상태 수정 오류:", error)
    return NextResponse.json(
      { error: "출석 상태 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

