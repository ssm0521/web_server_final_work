import { prisma } from "./db"

export interface SystemSettings {
  // 출석 정책 기본값
  defaultMaxAbsent: number
  defaultLateToAbsent: number

  // 파일 업로드 설정
  maxFileSize: number // 바이트 단위
  allowedFileTypes: string[] // MIME 타입 배열

  // 알림 설정
  enableNotifications: boolean
  notificationRetentionDays: number // 알림 보관 기간 (일)

  // 세션 설정
  sessionTimeoutMinutes: number // 세션 타임아웃 (분)
  attendanceCodeLength: number // 인증번호 길이

  // 기타 설정
  siteName: string
  siteDescription: string
  maintenanceMode: boolean // 점검 모드
}

const DEFAULT_SETTINGS: SystemSettings = {
  defaultMaxAbsent: 3,
  defaultLateToAbsent: 3,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  enableNotifications: true,
  notificationRetentionDays: 30,
  sessionTimeoutMinutes: 30,
  attendanceCodeLength: 4,
  siteName: "학교 출석 관리 시스템",
  siteDescription: "학과/학기/과목 단위 출석 관리 시스템",
  maintenanceMode: false,
}

/**
 * 시스템 설정 조회
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { key: "main" },
    })

    if (!settings) {
      // 기본 설정 생성
      await prisma.systemSettings.create({
        data: {
          key: "main",
          value: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
        },
      })
      return DEFAULT_SETTINGS
    }

    return settings.value as unknown as SystemSettings
  } catch (error) {
    console.error("시스템 설정 조회 오류:", error)
    return DEFAULT_SETTINGS
  }
}

/**
 * 시스템 설정 업데이트
 */
export async function updateSystemSettings(
  updates: Partial<SystemSettings>,
  updatedBy?: string
): Promise<SystemSettings> {
  try {
    const current = await getSystemSettings()
    const newSettings = { ...current, ...updates }

    await prisma.systemSettings.upsert({
      where: { key: "main" },
      update: {
        value: newSettings,
        updatedBy: updatedBy || null,
      },
      create: {
        key: "main",
        value: newSettings,
        updatedBy: updatedBy || null,
      },
    })

    return newSettings
  } catch (error) {
    console.error("시스템 설정 업데이트 오류:", error)
    throw error
  }
}

/**
 * 특정 설정 값 조회
 */
export async function getSetting<K extends keyof SystemSettings>(
  key: K
): Promise<SystemSettings[K]> {
  const settings = await getSystemSettings()
  return settings[key]
}

