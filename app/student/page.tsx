import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function StudentDashboard() {
  const session = await auth()

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">수강생 대시보드</h1>
          <p className="mt-2 text-gray-600">환영합니다, {session.user.name}님</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/student/attendance"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">출석 체크</h2>
            <p className="mt-2 text-sm text-gray-600">현재 열린 출석 체크</p>
          </a>
          <a
            href="/student/enrollments"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">수강신청</h2>
            <p className="mt-2 text-sm text-gray-600">강의 검색 및 수강신청</p>
          </a>
          <a
            href="/student/attendance-status"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">출석 현황</h2>
            <p className="mt-2 text-sm text-gray-600">수강 과목별 출석 현황 확인</p>
          </a>
          <a
            href="/student/excuses"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">공결 신청</h2>
            <p className="mt-2 text-sm text-gray-600">공결 신청 및 증빙 파일 업로드</p>
          </a>
          <a
            href="/student/appeals"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">이의제기</h2>
            <p className="mt-2 text-sm text-gray-600">출결 이의신청</p>
          </a>
          <a
            href="/student/messages"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">메시지</h2>
            <p className="mt-2 text-sm text-gray-600">담당교원에게 메시지 작성</p>
          </a>
          <a
            href="/notifications"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">알림</h2>
            <p className="mt-2 text-sm text-gray-600">수업 알림 및 공지사항</p>
          </a>
          <a
            href="/student/votes"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">투표</h2>
            <p className="mt-2 text-sm text-gray-600">공강 투표 및 설문 조사</p>
          </a>
          <a
            href="/student/announcements"
            className="rounded-lg bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-lg font-semibold text-gray-900">공지사항</h2>
            <p className="mt-2 text-sm text-gray-600">강의별 공지사항 확인</p>
          </a>
        </div>
      </div>
    </div>
  )
}

