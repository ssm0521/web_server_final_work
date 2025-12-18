import { prisma } from "./db"
import { NotificationType } from "@prisma/client"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  content: string
  link?: string
}

// 알림 생성 헬퍼 함수
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        content: params.content,
        link: params.link || null,
      },
    })
    return notification
  } catch (error) {
    console.error("알림 생성 오류:", error)
    return null
  }
}

// 여러 사용자에게 알림 생성
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: params.type,
            title: params.title,
            content: params.content,
            link: params.link || null,
          },
        })
      )
    )
    return notifications
  } catch (error) {
    console.error("알림 일괄 생성 오류:", error)
    return []
  }
}

// 출석 오픈 알림 생성
export async function notifyAttendanceOpen(sessionId: string, courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  })
  const studentIds = enrollments.map((e) => e.userId)
  if (studentIds.length === 0) return []
  
  return createNotificationsForUsers(studentIds, {
    type: "ATTENDANCE_OPEN",
    title: "출석이 열렸습니다",
    content: "출석 체크가 시작되었습니다. 지금 출석을 체크하세요.",
    link: `/student/attendance?sessionId=${sessionId}`,
  })
}

// 출석 마감 알림 생성
export async function notifyAttendanceClose(sessionId: string, courseId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  })
  const studentIds = enrollments.map((e) => e.userId)
  if (studentIds.length === 0) return []
  
  return createNotificationsForUsers(studentIds, {
    type: "ATTENDANCE_CLOSE",
    title: "출석이 마감되었습니다",
    content: "출석 체크가 마감되었습니다.",
    link: `/student/attendance`,
  })
}

// 공결 결과 알림 생성
export async function notifyExcuseResult(
  studentId: string,
  excuseId: string,
  status: "APPROVED" | "REJECTED",
  courseTitle: string
) {
  return createNotification({
    userId: studentId,
    type: "EXCUSE_RESULT",
    title: status === "APPROVED" ? "공결이 승인되었습니다" : "공결이 반려되었습니다",
    content: `${courseTitle}의 공결 신청이 ${status === "APPROVED" ? "승인" : "반려"}되었습니다.`,
    link: `/student/excuses`,
  })
}

// 이의제기 결과 알림 생성
export async function notifyAppealResult(
  studentId: string,
  appealId: string,
  status: "APPROVED" | "REJECTED",
  courseTitle: string
) {
  return createNotification({
    userId: studentId,
    type: "APPEAL_RESULT",
    title: status === "APPROVED" ? "이의제기가 승인되었습니다" : "이의제기가 반려되었습니다",
    content: `${courseTitle}의 이의제기가 ${status === "APPROVED" ? "승인" : "반려"}되었습니다.`,
    link: `/student/appeals`,
  })
}

// 결석 경고 알림 생성
export async function notifyAbsenceWarning(
  studentId: string,
  courseId: string,
  courseTitle: string,
  absenceCount: number
) {
  const isDanger = absenceCount >= 3
  return createNotification({
    userId: studentId,
    type: "ABSENCE_WARNING",
    title: isDanger ? "⚠️ 결석 위험 경고" : "결석 경고",
    content: `${courseTitle}에서 ${absenceCount}회 결석이 확인되었습니다. ${
      isDanger
        ? "출석 관리에 주의하시기 바랍니다."
        : "출석에 주의하시기 바랍니다."
    }`,
    link: `/student/attendance`,
  })
}

