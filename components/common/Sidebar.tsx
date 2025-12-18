"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface NavItem {
  name: string
  href: string
  icon?: string
}

const adminNavItems: NavItem[] = [
  { name: "대시보드", href: "/admin" },
  { name: "학과 관리", href: "/admin/departments" },
  { name: "학기 관리", href: "/admin/semesters" },
  { name: "교과목 관리", href: "/admin/courses" },
  { name: "사용자 관리", href: "/admin/users" },
  { name: "시스템 설정", href: "/admin/settings" },
  { name: "리포트", href: "/admin/reports" },
  { name: "감사 로그", href: "/admin/audit-logs" },
  { name: "수강신청 일괄 등록", href: "/admin/enrollments" },
]

const instructorNavItems: NavItem[] = [
  { name: "대시보드", href: "/instructor" },
  { name: "강의 관리", href: "/instructor/courses" },
  { name: "공결 승인", href: "/instructor/excuses" },
  { name: "이의제기 처리", href: "/instructor/appeals" },
  { name: "메시지", href: "/instructor/messages" },
]

const studentNavItems: NavItem[] = [
  { name: "대시보드", href: "/student" },
  { name: "출석 체크", href: "/student/attendance" },
  { name: "출석 현황", href: "/student/attendance-status" },
  { name: "수강신청", href: "/student/enrollments" },
  { name: "공결 신청", href: "/student/excuses" },
  { name: "이의제기", href: "/student/appeals" },
  { name: "메시지", href: "/student/messages" },
  { name: "공지사항", href: "/student/announcements" },
  { name: "투표", href: "/student/votes" },
]

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)

  if (!session) return null

  const getNavItems = (): NavItem[] => {
    switch (session.user.role) {
      case "ADMIN":
        return adminNavItems
      case "INSTRUCTOR":
        return instructorNavItems
      case "STUDENT":
        return studentNavItems
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-[#1a1a1a] transition-all duration-300 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <div className="flex h-full flex-col">
        {/* 로고/토글 */}
        <div className="flex h-16 items-center justify-between border-b border-[#2a2a2a] px-4">
          {isOpen && (
            <h1 className="text-lg font-bold text-white !text-white">출석 관리</h1>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-md p-2 text-white !text-white hover:bg-[#2a2a2a] transition-colors"
            aria-label="메뉴 토글"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-[#2a2a2a] text-white !text-white"
                        : "text-white !text-white hover:bg-[#2a2a2a] hover:text-white"
                    }`}
                  >
                    <span className="flex-shrink-0 text-white">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                    {isOpen && (
                      <span className="flex-1 transition-opacity duration-200 text-white !text-white">
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}

