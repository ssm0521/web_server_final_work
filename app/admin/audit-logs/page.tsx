"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AuditLog {
  id: string
  userId: string | null
  action: string
  targetType: string | null
  targetId: string | null
  oldValue: any
  newValue: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // 필터 상태
  const [filters, setFilters] = useState({
    targetType: "",
    targetId: "",
    userId: "",
    action: "",
    startDate: "",
    endDate: "",
    page: 1,
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.targetType) params.append("targetType", filters.targetType)
      if (filters.targetId) params.append("targetId", filters.targetId)
      if (filters.userId) params.append("userId", filters.userId)
      if (filters.action) params.append("action", filters.action)
      if (filters.startDate) params.append("startDate", filters.startDate)
      if (filters.endDate) params.append("endDate", filters.endDate)
      params.append("page", filters.page.toString())
      params.append("limit", "50")

      const response = await fetch(`/api/audit-logs?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("감사 로그를 불러올 수 없습니다")
      }

      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // 필터 변경 시 첫 페이지로
    }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const resetFilters = () => {
    setFilters({
      targetType: "",
      targetId: "",
      userId: "",
      action: "",
      startDate: "",
      endDate: "",
      page: 1,
    })
  }

  const formatValue = (value: any): string => {
    if (!value) return "-"
    if (typeof value === "string") return value
    return JSON.stringify(value, null, 2)
  }

  if (loading && logs.length === 0) {
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
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← 관리자 대시보드로
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">감사 로그</h1>
          <p className="mt-2 text-gray-600">시스템의 모든 민감한 작업 기록</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* 필터 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">필터</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">대상 타입</label>
              <select
                value={filters.targetType}
                onChange={(e) => handleFilterChange("targetType", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">전체</option>
                <option value="User">사용자</option>
                <option value="Course">강의</option>
                <option value="ClassSession">세션</option>
                <option value="Attendance">출석</option>
                <option value="ExcuseRequest">공결</option>
                <option value="Appeal">이의제기</option>
                <option value="AttendancePolicy">출석 정책</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">대상 ID</label>
              <input
                type="text"
                value={filters.targetId}
                onChange={(e) => handleFilterChange("targetId", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="대상 ID 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">사용자 ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="사용자 ID 입력"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">작업</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="작업 검색"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">시작 날짜</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">종료 날짜</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 로그 목록 */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold">
              로그 목록 {pagination && `(${pagination.total}건)`}
            </h2>
          </div>
          {logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">감사 로그가 없습니다</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        시간
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        작업
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        대상
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        변경 전
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        변경 후
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        IP 주소
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {log.user ? (
                            <div>
                              <div className="font-medium text-gray-900">{log.user.name}</div>
                              <div className="text-gray-500">{log.user.email}</div>
                              <div className="text-xs text-gray-400">{log.user.role}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">시스템</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.targetType && (
                            <div>
                              <div className="font-medium">{log.targetType}</div>
                              {log.targetId && (
                                <div className="text-xs text-gray-400">{log.targetId}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <pre className="max-w-xs overflow-auto text-xs">
                            {formatValue(log.oldValue)}
                          </pre>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <pre className="max-w-xs overflow-auto text-xs">
                            {formatValue(log.newValue)}
                          </pre>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {log.ipAddress || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {pagination.page} / {pagination.totalPages} 페이지
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

