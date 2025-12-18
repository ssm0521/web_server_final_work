import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * @swagger
 * /api/admin/reports/errors:
 *   get:
 *     summary: 오류 리포트 조회 (관리자만)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 조회할 기간 (일)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 최대 반환 개수
 *     responses:
 *       200:
 *         description: 오류 리포트 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errorLogs:
 *                   type: array
 *                   items:
 *                     type: object
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalErrors: { type: integer }
 *                     byAction: { type: object }
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 *       500:
 *         description: 서버 오류
 */

// 오류 리포트
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 조회 가능합니다" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")
    const limit = parseInt(searchParams.get("limit") || "50")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 감사 로그에서 오류 관련 액션 조회
    // 실제로는 별도의 오류 로그 테이블이 있으면 좋지만, 여기서는 감사 로그를 활용
    const errorLogs = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
        action: {
          contains: "ERROR",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    // 액션별 오류 통계
    const errorLogsByAction = await prisma.auditLog.groupBy({
      by: ["action"],
      where: {
        createdAt: { gte: startDate },
        action: {
          contains: "ERROR",
        },
      },
      _count: {
        action: true,
      },
    })

    const errorsByAction = errorLogsByAction.reduce(
      (acc, item) => {
        acc[item.action] = item._count.action
        return acc
      },
      {} as Record<string, number>
    )

    // 최근 실패한 인증 시도
    const failedAuthAttempts = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate },
        action: "AUTH_LOGIN_FAILED",
      },
    })

    // 최근 삭제된 항목들 (복구 가능성 확인)
    const deletedItems = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
        action: {
          in: ["USER_DELETE", "COURSE_DELETE", "SESSION_DELETE"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })

    return NextResponse.json({
      errorLogs: errorLogs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        user: log.user,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        oldValue: log.oldValue,
        newValue: log.newValue,
      })),
      summary: {
        totalErrors: errorLogs.length,
        byAction: errorsByAction,
        failedAuthAttempts,
        deletedItems: deletedItems.length,
      },
      deletedItems: deletedItems.map((item) => ({
        id: item.id,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        user: item.user,
        createdAt: item.createdAt,
      })),
    })
  } catch (error) {
    console.error("오류 리포트 조회 오류:", error)
    return NextResponse.json(
      { error: "오류 리포트를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

