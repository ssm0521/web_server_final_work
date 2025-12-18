import { prisma } from "./db"
import { NextRequest } from "next/server"

interface CreateAuditLogProps {
  userId?: string | null
  action: string
  targetType?: string | null
  targetId?: string | null
  oldValue?: any
  newValue?: any
  request?: NextRequest
}

/**
 * 감사 로그 생성 (공통)
 */
export async function createAuditLog({
  userId,
  action,
  targetType,
  targetId,
  oldValue,
  newValue,
  request,
}: CreateAuditLogProps) {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (request) {
      ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0] ??
        request.headers.get("x-real-ip") ??
        null
      userAgent = request.headers.get("user-agent")
    }

    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // 감사 로그 실패는 서비스 흐름에 영향 주지 않음
    console.error("감사 로그 생성 실패:", error)
  }
}

/**
 * 인증 관련 로그
 */
export async function logAuthAction(
  action: "LOGIN" | "LOGOUT" | "REGISTER",
  userId: string | null,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `AUTH_${action}`,
    request,
  })
}

/**
 * 사용자 관리 로그
 */
export async function logUserAction(
  action: "CREATE" | "UPDATE" | "DELETE" | "ROLE_CHANGE",
  userId: string,
  targetUserId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `USER_${action}`,
    targetType: "User",
    targetId: targetUserId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 강의 관리 로그
 */
export async function logCourseAction(
  action: "CREATE" | "UPDATE" | "DELETE",
  userId: string,
  courseId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `COURSE_${action}`,
    targetType: "Course",
    targetId: courseId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 출석 관리 로그 ✅ (CHECK → CHECK_IN / CHECK_OUT 정리 완료)
 */
export async function logAttendanceAction(
  action:
    | "CREATE"
    | "UPDATE"
    | "CHECK_IN"
    | "CHECK_OUT"
    | "STATUS_CHANGE",
  userId: string,
  attendanceId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `ATTENDANCE_${action}`,
    targetType: "Attendance",
    targetId: attendanceId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 공결 신청 로그
 */
export async function logExcuseAction(
  action: "CREATE" | "APPROVE" | "REJECT",
  userId: string,
  excuseId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `EXCUSE_${action}`,
    targetType: "ExcuseRequest",
    targetId: excuseId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 이의제기 로그
 */
export async function logAppealAction(
  action: "CREATE" | "APPROVE" | "REJECT",
  userId: string,
  appealId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `APPEAL_${action}`,
    targetType: "Appeal",
    targetId: appealId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 출석 정책 로그
 */
export async function logPolicyAction(
  action: "CREATE" | "UPDATE",
  userId: string,
  policyId: string,
  oldValue?: any,
  newValue?: any
) {
  await createAuditLog({
    userId,
    action: `POLICY_${action}`,
    targetType: "AttendancePolicy",
    targetId: policyId,
    oldValue,
    newValue,
  })
}

/**
 * 세션 관리 로그
 */
export async function logSessionAction(
  action: "CREATE" | "UPDATE" | "DELETE" | "OPEN" | "CLOSE" | "CODE_REGENERATE",
  userId: string,
  sessionId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action: `SESSION_${action}`,
    targetType: "ClassSession",
    targetId: sessionId,
    oldValue,
    newValue,
    request,
  })
}

/**
 * 시스템 설정 로그
 */
export async function logSystemSettingsAction(
  action: string,
  userId: string,
  oldValue?: any,
  newValue?: any,
  request?: NextRequest
) {
  await createAuditLog({
    userId,
    action,
    targetType: "SystemSettings",
    targetId: "main",
    oldValue,
    newValue,
    request,
  })
}
