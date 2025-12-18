import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function InstructorDashboard() {
  const session = await auth()

  if (!session || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">담당교원 대시보드</h1>
          <p className="mt-2 text-gray-600">환영합니다, {session.user.name}님</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/instructor/courses"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">강의 관리</h2>
            <p className="mt-2 text-sm text-gray-600">강의 일정 및 출석 방식 설정</p>
          </a>
          <a
            href="/instructor/appeals"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">이의제기 처리</h2>
            <p className="mt-2 text-sm text-gray-600">출결 이의제기 검토 및 정정</p>
          </a>
          <a
            href="/instructor/excuses"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">공결 승인</h2>
            <p className="mt-2 text-sm text-gray-600">공결 신청 승인/반려</p>
          </a>
          <a
            href="/instructor/messages"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">메시지</h2>
            <p className="mt-2 text-sm text-gray-600">수강생 개인 메시지</p>
          </a>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">공강 투표</h2>
            <p className="mt-2 text-sm text-gray-600">수업 공강 찬반 투표 생성</p>
          </div>
        </div>
      </div>
    </div>
  )
}

