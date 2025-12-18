import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NotificationType } from "@prisma/client"

// 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const isRead = searchParams.get("isRead") // true, false, null (전체)
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {
      userId: session.user.id,
    }

    if (isRead === "true") {
      where.isRead = true
    } else if (isRead === "false") {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    // 읽지 않은 알림 개수
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("알림 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "알림 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 알림 생성 (내부 API용)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 관리자만 직접 알림 생성 가능 (일반적으로는 시스템이 자동 생성)
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, type, title, content, link } = body

    if (!userId || !type || !title || !content) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        content,
        link: link || null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error("알림 생성 오류:", error)
    return NextResponse.json(
      { error: "알림 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

