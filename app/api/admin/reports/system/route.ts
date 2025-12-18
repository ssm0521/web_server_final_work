import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * @swagger
 * /api/admin/reports/system:
 *   get:
 *     summary: 시스템 상태 리포트 조회 (관리자만)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 시스템 상태 리포트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     byRole: { type: object }
 *                 courses:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     active: { type: integer }
 *                 sessions:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     upcoming: { type: integer }
 *                     completed: { type: integer }
 *                 attendances:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     byStatus: { type: object }
 *                 enrollments:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     averagePerCourse: { type: number }
 *                 recentActivity:
 *                   type: object
 *                   properties:
 *                     newUsers: { type: integer }
 *                     newCourses: { type: integer }
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 *       500:
 *         description: 서버 오류
 */

// 시스템 상태 리포트
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 조회 가능합니다" }, { status: 403 })
    }

    // 사용자 통계
    const [totalUsers, usersByRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          role: true,
        },
      }),
    ])

    const usersByRoleMap = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count.role
        return acc
      },
      {} as Record<string, number>
    )

    // 강의 통계
    const [totalCourses, activeCourses] = await Promise.all([
      prisma.course.count(),
      prisma.course.count({
        where: {
          semester: {
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      }),
    ])

    // 세션 통계
    const now = new Date()
    const [totalSessions, upcomingSessions, completedSessions] = await Promise.all([
      prisma.classSession.count(),
      prisma.classSession.count({
        where: {
          startAt: { gt: now },
        },
      }),
      prisma.classSession.count({
        where: {
          isClosed: true,
        },
      }),
    ])

    // 출석 통계
    const [totalAttendances, attendancesByStatus] = await Promise.all([
      prisma.attendance.count(),
      prisma.attendance.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
    ])

    const attendancesByStatusMap = attendancesByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status
        return acc
      },
      {} as Record<string, number>
    )

    // 수강신청 통계
    const [totalEnrollments, coursesWithEnrollments] = await Promise.all([
      prisma.enrollment.count(),
      prisma.course.findMany({
        include: {
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
    ])

    const averageEnrollmentsPerCourse =
      coursesWithEnrollments.length > 0
        ? totalEnrollments / coursesWithEnrollments.length
        : 0

    // 최근 활동 (지난 7일)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [newUsers, newCourses] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.course.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ])

    // 공결/이의제기 통계
    const [pendingExcuses, pendingAppeals] = await Promise.all([
      prisma.excuseRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.appeal.count({
        where: { status: "PENDING" },
      }),
    ])

    // 알림 통계
    const [totalNotifications, unreadNotifications] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({
        where: { isRead: false },
      }),
    ])

    // 투표 통계
    const [totalVotes, activeVotes] = await Promise.all([
      prisma.vote.count(),
      prisma.vote.count({
        where: {
          endAt: { gt: now },
        },
      }),
    ])

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: usersByRoleMap,
      },
      courses: {
        total: totalCourses,
        active: activeCourses,
      },
      sessions: {
        total: totalSessions,
        upcoming: upcomingSessions,
        completed: completedSessions,
      },
      attendances: {
        total: totalAttendances,
        byStatus: attendancesByStatusMap,
      },
      enrollments: {
        total: totalEnrollments,
        averagePerCourse: Math.round(averageEnrollmentsPerCourse * 100) / 100,
      },
      recentActivity: {
        newUsers,
        newCourses,
      },
      pending: {
        excuses: pendingExcuses,
        appeals: pendingAppeals,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      votes: {
        total: totalVotes,
        active: activeVotes,
      },
    })
  } catch (error) {
    console.error("시스템 리포트 조회 오류:", error)
    return NextResponse.json(
      { error: "시스템 리포트를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

