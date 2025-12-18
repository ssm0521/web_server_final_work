"use client"

import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import NotificationBell from "./NotificationBell"

export default function Header() {
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const getDashboardUrl = () => {
    if (!session?.user?.role) return "/"
    switch (session.user.role) {
      case "ADMIN":
        return "/admin"
      case "INSTRUCTOR":
        return "/instructor"
      case "STUDENT":
        return "/student"
      default:
        return "/"
    }
  }

  if (!session) return null

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#2a2a2a] border-b border-[#3a3a3a]">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center">
          <h2 className="text-lg font-bold text-white">
            {session.user.role === "ADMIN" ? "관리자" : session.user.role === "INSTRUCTOR" ? "교원" : "수강생"} 대시보드
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link
            href="/api-docs"
            className="text-sm font-semibold text-white hover:opacity-70 transition-opacity"
            target="_blank"
          >
            API 문서
          </Link>
          <span className="text-sm font-semibold text-white">
            {session.user.name}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  )
}


