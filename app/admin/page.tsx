import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminDashboard() {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">관리자 대시보드</h1>
        <p className="text-black">환영합니다, {session.user.name}님</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/departments"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">학과 관리</h2>
            <p className="mt-2 text-sm text-black opacity-60">학과 개설/수정/삭제</p>
          </a>
          <a
            href="/admin/semesters"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">학기 관리</h2>
            <p className="mt-2 text-sm text-black opacity-60">학기 개설/수정/삭제</p>
          </a>
          <a
            href="/admin/users"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">사용자 관리</h2>
            <p className="mt-2 text-sm text-black opacity-60">사용자 등록/수정/권한 관리</p>
          </a>
          <a
            href="/admin/settings"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">시스템 설정</h2>
            <p className="mt-2 text-sm text-black opacity-60">시스템 전반 설정</p>
          </a>
          <a
            href="/admin/reports"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">리포트</h2>
            <p className="mt-2 text-sm text-black opacity-60">시스템 상태, 오류 리포트</p>
          </a>
          <a
            href="/admin/audit-logs"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">감사 로그</h2>
            <p className="mt-2 text-sm text-black opacity-60">모든 민감 이벤트 추적</p>
          </a>
          <a
            href="/admin/enrollments"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">수강신청 일괄 등록</h2>
            <p className="mt-2 text-sm text-black opacity-60">엑셀/CSV 파일로 일괄 등록</p>
          </a>
          <a
            href="/admin/courses"
            className="group rounded-lg bg-white p-6 border border-gray-200 transition-all duration-200 hover:border-black hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-black group-hover:opacity-80 transition-opacity">교과목 관리</h2>
            <p className="mt-2 text-sm text-black opacity-60">교과목 개설/수정/삭제</p>
          </a>
      </div>
    </div>
  )
}

