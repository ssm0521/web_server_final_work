"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  content: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const url = `/api/notifications?isRead=${filter === "unread" ? "false" : ""}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("알림 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err: any) {
      console.error("알림 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      await fetchNotifications()
    } catch (err) {
      console.error("알림 읽음 처리 오류:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead)
      await Promise.all(
        unreadNotifications.map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          })
        )
      )
      await fetchNotifications()
    } catch (err) {
      console.error("전체 읽음 처리 오류:", err)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!confirm("알림을 삭제하시겠습니까?")) return

    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      })
      await fetchNotifications()
    } catch (err) {
      console.error("알림 삭제 오류:", err)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ATTENDANCE_OPEN":
        return "출석 오픈"
      case "ATTENDANCE_CLOSE":
        return "출석 마감"
      case "EXCUSE_RESULT":
        return "공결 결과"
      case "APPEAL_RESULT":
        return "이의제기 결과"
      case "COURSE_ANNOUNCEMENT":
        return "강의 공지"
      case "VOTE_NOTIFICATION":
        return "투표 알림"
      case "ABSENCE_WARNING":
        return "결석 경고"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">알림</h1>
            <p className="mt-2 text-gray-600">
              읽지 않은 알림 {unreadCount}개
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                모두 읽음 처리
              </button>
            )}
            <button
              onClick={() => setFilter(filter === "all" ? "unread" : "all")}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              {filter === "all" ? "읽지 않은 것만" : "전체"}
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          {notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              알림이 없습니다
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-gray-50 ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          {getTypeLabel(notification.type)}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      {notification.link ? (
                        <Link
                          href={notification.link}
                          onClick={() => markAsRead(notification.id)}
                          className="block"
                        >
                          <h3 className="mt-1 text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.content}
                          </p>
                        </Link>
                      ) : (
                        <div>
                          <h3 className="mt-1 text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {notification.content}
                          </p>
                        </div>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          읽음
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

