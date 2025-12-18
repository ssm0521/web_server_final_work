"use client"

import { ReactNode } from "react"
import { useSession } from "next-auth/react"
import Sidebar from "./Sidebar"
import Header from "./Header"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()
  
  // 로그인 페이지나 공개 페이지는 레이아웃 적용 안 함
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <Sidebar />
      <div className="flex flex-1 flex-col ml-64">
        <Header />
        <main className="flex-1 transition-all duration-300 bg-[#f5f5f5]">
          {children}
        </main>
      </div>
    </div>
  )
}

