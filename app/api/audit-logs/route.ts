import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

// 감사 로그 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 조회 가능합니다" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get("targetType")
    const targetId = searchParams.get("targetId")
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // 필터 조건 구성
    const where: any = {}

    if (targetType) {
      where.targetType = targetType
    }

    if (targetId) {
      where.targetId = targetId
    }

    if (userId) {
      where.userId = userId
    }

    if (action) {
      where.action = {
        contains: action,
      }
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // 감사 로그 조회
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("감사 로그 조회 오류:", error)
    return NextResponse.json(
      { error: "감사 로그를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

