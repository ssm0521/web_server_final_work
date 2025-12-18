"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface SystemReport {
  users: {
    total: number
    byRole: Record<string, number>
  }
  courses: {
    total: number
    active: number
  }
  sessions: {
    total: number
    upcoming: number
    completed: number
  }
  attendances: {
    total: number
    byStatus: Record<string, number>
  }
  enrollments: {
    total: number
    averagePerCourse: number
  }
  recentActivity: {
    newUsers: number
    newCourses: number
  }
  pending: {
    excuses: number
    appeals: number
  }
  notifications: {
    total: number
    unread: number
  }
  votes: {
    total: number
    active: number
  }
}

interface ErrorReport {
  errorLogs: any[]
  summary: {
    totalErrors: number
    byAction: Record<string, number>
    failedAuthAttempts: number
    deletedItems: number
  }
  deletedItems: any[]
}

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"system" | "errors">("system")
  const [systemReport, setSystemReport] = useState<SystemReport | null>(null)
  const [errorReport, setErrorReport] = useState<ErrorReport | null>(null)
  const [errorDays, setErrorDays] = useState(7)

  useEffect(() => {
    fetchSystemReport()
  }, [])

  useEffect(() => {
    if (activeTab === "errors") {
      fetchErrorReport()
    }
  }, [activeTab, errorDays])

  const fetchSystemReport = async () => {
    try {
      const response = await fetch("/api/admin/reports/system")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("시스템 리포트를 불러올 수 없습니다")
      }
      const data = await response.json()
      setSystemReport(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchErrorReport = async () => {
    try {
      const response = await fetch(`/api/admin/reports/errors?days=${errorDays}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("오류 리포트를 불러올 수 없습니다")
      }
      const data = await response.json()
      setErrorReport(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const createTestErrors = async () => {
    if (!confirm("테스트용 오류 로그 5개를 생성하시겠습니까?")) {
      return
    }

    try {
      setLoading(true)
      setError("")
      const response = await fetch("/api/admin/reports/errors/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "테스트 오류 로그 생성에 실패했습니다")
      }

      const result = await response.json()
      alert(result.message)
      // 오류 리포트 새로고침
      await fetchErrorReport()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "미정",
      PRESENT: "출석",
      LATE: "지각",
      ABSENT: "결석",
      EXCUSED: "공결",
    }
    return labels[status] || status
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "관리자",
      INSTRUCTOR: "교원",
      STUDENT: "수강생",
    }
    return labels[role] || role
  }

  if (loading && !systemReport) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a href="/admin" className="text-blue-600 hover:text-blue-800">
            ← 관리자 대시보드로
          </a>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">시스템 리포트</h1>
          <p className="mt-2 text-gray-600">시스템 상태 및 오류 리포트를 확인할 수 있습니다</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* 탭 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("system")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "system"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              시스템 상태
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "errors"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              오류 리포트
            </button>
          </nav>
        </div>

        {/* 시스템 상태 리포트 */}
        {activeTab === "system" && systemReport && (
          <div className="space-y-6">
            {/* 사용자 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">사용자 통계</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {systemReport.users.total}
                  </div>
                  <div className="text-sm text-gray-600">전체 사용자</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {systemReport.users.byRole.ADMIN || 0}
                  </div>
                  <div className="text-sm text-gray-600">관리자</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {systemReport.users.byRole.INSTRUCTOR || 0}
                  </div>
                  <div className="text-sm text-gray-600">교원</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {systemReport.users.byRole.STUDENT || 0}
                  </div>
                  <div className="text-sm text-gray-600">수강생</div>
                </div>
              </div>
            </div>

            {/* 강의 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">강의 통계</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {systemReport.courses.total}
                  </div>
                  <div className="text-sm text-gray-600">전체 강의</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {systemReport.courses.active}
                  </div>
                  <div className="text-sm text-gray-600">진행 중인 강의</div>
                </div>
              </div>
            </div>

            {/* 세션 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">수업 세션 통계</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {systemReport.sessions.total}
                  </div>
                  <div className="text-sm text-gray-600">전체 세션</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {systemReport.sessions.upcoming}
                  </div>
                  <div className="text-sm text-gray-600">예정된 세션</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {systemReport.sessions.completed}
                  </div>
                  <div className="text-sm text-gray-600">완료된 세션</div>
                </div>
              </div>
            </div>

            {/* 출석 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">출석 통계</h2>
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">
                  {systemReport.attendances.total}
                </div>
                <div className="text-sm text-gray-600">전체 출석 기록</div>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {Object.entries(systemReport.attendances.byStatus).map(([status, count]) => (
                  <div key={status}>
                    <div className="text-xl font-bold text-gray-700">{count}</div>
                    <div className="text-xs text-gray-600">{getStatusLabel(status)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 수강신청 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">수강신청 통계</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {systemReport.enrollments.total}
                  </div>
                  <div className="text-sm text-gray-600">전체 수강신청</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {systemReport.enrollments.averagePerCourse}
                  </div>
                  <div className="text-sm text-gray-600">강의당 평균 수강생</div>
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">최근 활동 (지난 7일)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {systemReport.recentActivity.newUsers}
                  </div>
                  <div className="text-sm text-gray-600">신규 사용자</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {systemReport.recentActivity.newCourses}
                  </div>
                  <div className="text-sm text-gray-600">신규 강의</div>
                </div>
              </div>
            </div>

            {/* 대기 중인 항목 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">대기 중인 항목</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {systemReport.pending.excuses}
                  </div>
                  <div className="text-sm text-gray-600">대기 중인 공결 신청</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {systemReport.pending.appeals}
                  </div>
                  <div className="text-sm text-gray-600">대기 중인 이의제기</div>
                </div>
              </div>
            </div>

            {/* 알림 및 투표 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold">알림</h2>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {systemReport.notifications.total}
                    </div>
                    <div className="text-sm text-gray-600">전체 알림</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">
                      {systemReport.notifications.unread}
                    </div>
                    <div className="text-sm text-gray-600">읽지 않은 알림</div>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold">투표</h2>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {systemReport.votes.total}
                    </div>
                    <div className="text-sm text-gray-600">전체 투표</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      {systemReport.votes.active}
                    </div>
                    <div className="text-sm text-gray-600">진행 중인 투표</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 오류 리포트 */}
        {activeTab === "errors" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
              <h2 className="text-xl font-semibold">오류 리포트</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">조회 기간:</label>
                <select
                  value={errorDays}
                  onChange={(e) => setErrorDays(parseInt(e.target.value))}
                  className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                >
                  <option value={1}>1일</option>
                  <option value={7}>7일</option>
                  <option value={30}>30일</option>
                  <option value={90}>90일</option>
                </select>
                <button
                  onClick={createTestErrors}
                  disabled={loading}
                  className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:bg-gray-400"
                >
                  테스트 오류 생성
                </button>
              </div>
            </div>

            {errorReport && (
              <>
                {/* 요약 */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-semibold">요약</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {errorReport.summary.totalErrors}
                      </div>
                      <div className="text-sm text-gray-600">전체 오류</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {errorReport.summary.failedAuthAttempts}
                      </div>
                      <div className="text-sm text-gray-600">인증 실패</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {errorReport.summary.deletedItems}
                      </div>
                      <div className="text-sm text-gray-600">삭제된 항목</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {Object.keys(errorReport.summary.byAction).length}
                      </div>
                      <div className="text-sm text-gray-600">오류 유형</div>
                    </div>
                  </div>
                </div>

                {/* 액션별 오류 통계 */}
                {Object.keys(errorReport.summary.byAction).length > 0 && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold">액션별 오류 통계</h3>
                    <div className="space-y-2">
                      {Object.entries(errorReport.summary.byAction).map(([action, count]) => (
                        <div key={action} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{action}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 최근 삭제된 항목 */}
                {errorReport.deletedItems.length > 0 && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold">최근 삭제된 항목</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              액션
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              대상 타입
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              삭제자
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              삭제 시간
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {errorReport.deletedItems.map((item) => (
                            <tr key={item.id}>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                {item.action}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {item.targetType}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {item.user ? `${item.user.name} (${item.user.email})` : "시스템"}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {new Date(item.createdAt).toLocaleString("ko-KR")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 오류 로그 */}
                {errorReport.errorLogs.length > 0 ? (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg font-semibold">오류 로그</h3>
                    <div className="space-y-4">
                      {errorReport.errorLogs.map((log) => (
                        <div key={log.id} className="rounded-md border border-gray-200 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{log.action}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          {log.user && (
                            <div className="mb-1 text-xs text-gray-600">
                              사용자: {log.user.name} ({getRoleLabel(log.user.role)})
                            </div>
                          )}
                          {log.targetType && (
                            <div className="mb-1 text-xs text-gray-600">
                              대상: {log.targetType} {log.targetId && `(${log.targetId})`}
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="text-xs text-gray-500">IP: {log.ipAddress}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-white p-6 shadow text-center text-gray-500">
                    조회 기간 내 오류 로그가 없습니다.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

