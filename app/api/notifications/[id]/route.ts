import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 알림 상세 조회 및 읽음 처리
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인의 알림만 조회 가능
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 읽음 처리
    if (!notification.isRead) {
      await prisma.notification.update({
        where: { id: params.id },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ ...notification, isRead: true })
  } catch (error) {
    console.error("알림 조회 오류:", error)
    return NextResponse.json(
      { error: "알림을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 알림 읽음 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인의 알림만 수정 가능
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    const isRead = body.isRead !== undefined ? body.isRead : true

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: { isRead },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("알림 읽음 처리 오류:", error)
    return NextResponse.json(
      { error: "알림 읽음 처리 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 알림 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인의 알림만 삭제 가능
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    await prisma.notification.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "알림이 삭제되었습니다" })
  } catch (error) {
    console.error("알림 삭제 오류:", error)
    return NextResponse.json(
      { error: "알림 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

