import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AttendanceStatus } from "@prisma/client"
import { logAttendanceAction } from "@/lib/audit"

const attendSchema = z.object({
  code: z.string().optional(), // 인증번호 (CODE 방식인 경우)
})

/**
 * @swagger
 * /api/sessions/{id}/attend:
 *   post:
 *     summary: 학생 출석 체크
 *     tags: [출석]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 세션 ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: 인증번호 (CODE 방식인 경우 필수)
 *                 example: "1234"
 *     responses:
 *       201:
 *         description: 출석 체크 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       400:
 *         description: 잘못된 요청 (출석이 열려있지 않음, 인증번호 오류 등)
 *       403:
 *         description: 권한 없음 (학생이 아님, 수강생이 아님)
 *       500:
 *         description: 서버 오류
 */
// 학생 출석 체크
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 학생만 출석 체크 가능
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "학생만 출석 체크할 수 있습니다" }, { status: 403 })
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: params.id },
      include: {
        course: {
          include: {
            enrollments: true,
          },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: "수업 세션을 찾을 수 없습니다" }, { status: 404 })
    }

    // 수강생인지 확인
    const enrollment = classSession.course.enrollments.find(
      (e) => e.userId === session.user.id
    )

    if (!enrollment) {
      return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
    }

    // 출석이 열려있는지 확인
    if (!classSession.isOpen) {
      return NextResponse.json(
        { error: "출석이 열려있지 않습니다" },
        { status: 400 }
      )
    }

    if (classSession.isClosed) {
      return NextResponse.json(
        { error: "이미 출석이 마감되었습니다" },
        { status: 400 }
      )
    }

    // 인증번호 확인 (CODE 방식인 경우)
    if (classSession.attendanceMethod === "CODE") {
      const body = await request.json()
      const validatedData = attendSchema.parse(body)

      if (!validatedData.code) {
        return NextResponse.json(
          { error: "인증번호를 입력하세요" },
          { status: 400 }
        )
      }

      if (validatedData.code !== classSession.attendanceCode) {
        return NextResponse.json(
          { error: "인증번호가 올바르지 않습니다" },
          { status: 400 }
        )
      }
    }

    // 이미 출석했는지 확인
    const existing = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: params.id,
          studentId: session.user.id,
        },
      },
    })

    // 항상 출석으로 설정 (교수가 상세 페이지에서 수정 가능)
    const now = new Date()
    let status: AttendanceStatus = "PRESENT"

    if (existing) {
      // 이미 출석했으면 업데이트
      const oldStatus = existing.status
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          checkedAt: now,
        },
      })
      
      // 감사 로그 기록
      await logAttendanceAction("UPDATE", session.user.id, updated.id, {
        status: oldStatus,
      }, {
        status: updated.status,
        checkedAt: updated.checkedAt,
      }, request)
      
      return NextResponse.json(updated)
    } else {
      // 새로 출석 기록 생성
      const attendance = await prisma.attendance.create({
        data: {
          sessionId: params.id,
          studentId: session.user.id,
          status,
          checkedAt: now,
        },
      })
      
      // 감사 로그 기록
      await logAttendanceAction("CHECK", session.user.id, attendance.id, null, {
        status: attendance.status,
        checkedAt: attendance.checkedAt,
      }, request)
      
      return NextResponse.json(attendance, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("출석 체크 오류:", error)
    return NextResponse.json(
      { error: "출석 체크 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


