import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 메시지 상세 조회 및 읽음 처리
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: "메시지를 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인이 보낸 메시지이거나 받은 메시지인지 확인
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 받은 메시지인 경우 읽음 처리
    if (message.receiverId === session.user.id && !message.isRead) {
      await prisma.message.update({
        where: { id: params.id },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ ...message, isRead: true })
  } catch (error) {
    console.error("메시지 조회 오류:", error)
    return NextResponse.json(
      { error: "메시지를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 메시지 읽음 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
    })

    if (!message) {
      return NextResponse.json({ error: "메시지를 찾을 수 없습니다" }, { status: 404 })
    }

    // 받은 메시지만 읽음 처리 가능
    if (message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const updated = await prisma.message.update({
      where: { id: params.id },
      data: { isRead: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("메시지 읽음 처리 오류:", error)
    return NextResponse.json(
      { error: "메시지 읽음 처리 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 메시지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
    })

    if (!message) {
      return NextResponse.json({ error: "메시지를 찾을 수 없습니다" }, { status: 404 })
    }

    // 본인이 보낸 메시지이거나 받은 메시지만 삭제 가능
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    await prisma.message.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "메시지가 삭제되었습니다" })
  } catch (error) {
    console.error("메시지 삭제 오류:", error)
    return NextResponse.json(
      { error: "메시지 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

