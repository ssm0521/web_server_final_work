import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

// SSE (Server-Sent Events) 실시간 알림 스트림
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return new Response("Unauthorized", { status: 401 })
    }

    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // 연결 확인 메시지 전송
        const send = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        send({ type: "connected", message: "알림 스트림이 연결되었습니다" })

        // 주기적으로 새 알림 확인 (5초마다)
        const interval = setInterval(async () => {
          try {
            const unreadNotifications = await prisma.notification.findMany({
              where: {
                userId: session.user.id,
                isRead: false,
                createdAt: {
                  gte: new Date(Date.now() - 60000), // 최근 1분 이내
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            })

            if (unreadNotifications.length > 0) {
              send({
                type: "notifications",
                notifications: unreadNotifications,
                count: unreadNotifications.length,
              })
            }
          } catch (error) {
            console.error("SSE 알림 조회 오류:", error)
          }
        }, 5000)

        // 연결 종료 시 정리
        request.signal.addEventListener("abort", () => {
          clearInterval(interval)
          controller.close()
        })
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    console.error("SSE 연결 오류:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

