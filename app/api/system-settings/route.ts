import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSystemSettings, updateSystemSettings, SystemSettings } from "@/lib/system-settings"
import { z } from "zod"
import { logSystemSettingsAction } from "@/lib/audit"

const systemSettingsSchema = z.object({
  defaultMaxAbsent: z.number().int().min(1).max(20).optional(),
  defaultLateToAbsent: z.number().int().min(1).max(10).optional(),
  maxFileSize: z.number().int().min(1024).max(100 * 1024 * 1024).optional(), // 1KB ~ 100MB
  allowedFileTypes: z.array(z.string()).optional(),
  enableNotifications: z.boolean().optional(),
  notificationRetentionDays: z.number().int().min(1).max(365).optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(), // 5분 ~ 24시간
  attendanceCodeLength: z.number().int().min(3).max(8).optional(),
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  maintenanceMode: z.boolean().optional(),
})

/**
 * @swagger
 * /api/system-settings:
 *   get:
 *     summary: 시스템 설정 조회 (관리자만)
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 시스템 설정 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 defaultMaxAbsent: { type: integer, description: "기본 최대 결석 횟수" }
 *                 defaultLateToAbsent: { type: integer, description: "지각 몇 회 = 결석 1회" }
 *                 maxFileSize: { type: integer, description: "최대 파일 크기 (바이트)" }
 *                 allowedFileTypes: { type: array, items: { type: string }, description: "허용된 파일 타입" }
 *                 enableNotifications: { type: boolean, description: "알림 활성화 여부" }
 *                 notificationRetentionDays: { type: integer, description: "알림 보관 기간 (일)" }
 *                 sessionTimeoutMinutes: { type: integer, description: "세션 타임아웃 (분)" }
 *                 attendanceCodeLength: { type: integer, description: "인증번호 길이" }
 *                 siteName: { type: string, description: "사이트 이름" }
 *                 siteDescription: { type: string, description: "사이트 설명" }
 *                 maintenanceMode: { type: boolean, description: "점검 모드 여부" }
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 *       500:
 *         description: 서버 오류
 *   put:
 *     summary: 시스템 설정 업데이트 (관리자만)
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultMaxAbsent: { type: integer, minimum: 1, maximum: 20 }
 *               defaultLateToAbsent: { type: integer, minimum: 1, maximum: 10 }
 *               maxFileSize: { type: integer, minimum: 1024, maximum: 104857600 }
 *               allowedFileTypes: { type: array, items: { type: string } }
 *               enableNotifications: { type: boolean }
 *               notificationRetentionDays: { type: integer, minimum: 1, maximum: 365 }
 *               sessionTimeoutMinutes: { type: integer, minimum: 5, maximum: 1440 }
 *               attendanceCodeLength: { type: integer, minimum: 3, maximum: 8 }
 *               siteName: { type: string, minLength: 1, maxLength: 100 }
 *               siteDescription: { type: string, maxLength: 500 }
 *               maintenanceMode: { type: boolean }
 *     responses:
 *       200:
 *         description: 시스템 설정 업데이트 성공
 *       400:
 *         description: 잘못된 요청 (유효성 검사 실패)
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 *       500:
 *         description: 서버 오류
 */

// 시스템 설정 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 조회 가능합니다" }, { status: 403 })
    }

    const settings = await getSystemSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error("시스템 설정 조회 오류:", error)
    return NextResponse.json(
      { error: "시스템 설정을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 시스템 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 수정 가능합니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = systemSettingsSchema.parse(body)

    const oldSettings = await getSystemSettings()
    const newSettings = await updateSystemSettings(validatedData, session.user.id)

    // 감사 로그 기록
    await logSystemSettingsAction(
      "UPDATE_SYSTEM_SETTINGS",
      session.user.id,
      oldSettings,
      newSettings,
      request
    )

    return NextResponse.json(newSettings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("시스템 설정 업데이트 오류:", error)
    return NextResponse.json(
      { error: "시스템 설정 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

