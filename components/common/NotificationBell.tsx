"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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

export default function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchNotifications()
      // SSE 연결 (선택사항 - 실시간 알림)
      // connectSSE()
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
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

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    setShowDropdown(false)
  }

  if (!session) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-full p-2 text-white hover:bg-[#3a3a3a] transition-colors"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">알림</h3>
                <Link
                  href="/notifications"
                  className="text-xs text-blue-600 hover:text-blue-800"
                  onClick={() => setShowDropdown(false)}
                >
                  전체 보기
                </Link>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  로딩 중...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  알림이 없습니다
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 px-4 py-3 hover:bg-gray-50 ${
                      !notification.isRead ? "bg-blue-50" : ""
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => handleNotificationClick(notification)}
                        className="block"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {notification.content}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString("ko-KR")}
                        </div>
                      </Link>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {notification.content}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString("ko-KR")}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

