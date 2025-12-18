import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

/**
 * @swagger
 * /api/admin/reports/errors/test:
 *   post:
 *     summary: 테스트용 오류 로그 생성 (관리자만)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: integer
 *                 default: 5
 *                 description: 생성할 오류 로그 개수
 *     responses:
 *       200:
 *         description: 테스트 오류 로그 생성 성공
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 사용 가능합니다" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const count = body.count || 5

    // 다양한 유형의 테스트 오류 로그 생성
    const errorTypes = [
      "ERROR_DATABASE_CONNECTION",
      "ERROR_VALIDATION_FAILED",
      "ERROR_FILE_UPLOAD",
      "ERROR_AUTHENTICATION",
      "ERROR_PERMISSION_DENIED",
      "ERROR_API_REQUEST",
      "ERROR_DATA_PROCESSING",
    ]

    const targetTypes = ["User", "Course", "Attendance", "Session", "System"]
    const errorMessages = [
      "데이터베이스 연결 실패",
      "유효성 검증 실패",
      "파일 업로드 오류",
      "인증 실패",
      "권한 없음",
      "API 요청 오류",
      "데이터 처리 오류",
    ]

    const createdLogs = []

    for (let i = 0; i < count; i++) {
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)]
      const targetType = targetTypes[Math.floor(Math.random() * targetTypes.length)]
      const errorMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)]

      await createAuditLog({
        userId: session.user.id,
        action: errorType,
        targetType: targetType,
        targetId: `test-${Date.now()}-${i}`,
        oldValue: null,
        newValue: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
          details: `테스트 오류 로그 #${i + 1}`,
        },
        request,
      })

      createdLogs.push({
        action: errorType,
        targetType,
        errorMessage,
      })
    }

    return NextResponse.json({
      success: true,
      message: `${count}개의 테스트 오류 로그가 생성되었습니다`,
      createdLogs,
    })
  } catch (error) {
    console.error("테스트 오류 로그 생성 오류:", error)
    return NextResponse.json(
      { error: "테스트 오류 로그 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

