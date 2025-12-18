"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface ExcuseRequest {
  id: string
  reason: string
  reasonCode: string | null
  status: string
  files: string[] | null
  instructorComment: string | null
  createdAt: string
  session: {
    week: number
    startAt: string
    course: {
      id: string
      title: string
      code: string
      section: string
    }
  }
}

export default function ExcusesPage() {
  const router = useRouter()
  const [excuses, setExcuses] = useState<ExcuseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [sessions, setSessions] = useState<any[]>([])
  const [formData, setFormData] = useState({
    reason: "",
    reasonCode: "",
    files: [] as File[],
  })

  useEffect(() => {
    fetchExcuses()
    fetchAvailableSessions()
  }, [])

  const fetchExcuses = async () => {
    try {
      const response = await fetch("/api/excuses")
      if (!response.ok) throw new Error("공결 신청 목록을 불러올 수 없습니다")
      const data = await response.json()
      setExcuses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSessions = async () => {
    try {
      const coursesResponse = await fetch("/api/courses")
      if (!coursesResponse.ok) return
      const courses = await coursesResponse.json()

      const allSessions: any[] = []
      for (const course of courses) {
        const sessionsResponse = await fetch(`/api/courses/${course.id}/sessions`)
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json()
          for (const session of sessions) {
            allSessions.push({
              ...session,
              course: {
                id: course.id,
                title: course.title,
                code: course.code,
                section: course.section,
              },
            })
          }
        }
      }
      setSessions(allSessions)
    } catch (err) {
      console.error("세션 목록 조회 오류:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedSessionId) {
      setError("수업 세션을 선택하세요")
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("reason", formData.reason)
      if (formData.reasonCode) {
        formDataToSend.append("reasonCode", formData.reasonCode)
      }
      formData.files.forEach((file) => {
        formDataToSend.append("files", file)
      })

      const response = await fetch(`/api/sessions/${selectedSessionId}/excuses`, {
        method: "POST",
        body: formDataToSend,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "공결 신청에 실패했습니다")
      }

      await fetchExcuses()
      resetForm()
      alert("공결 신청이 완료되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      reason: "",
      reasonCode: "",
      files: [],
    })
    setSelectedSessionId("")
    setShowForm(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">대기</span>
      case "APPROVED":
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">승인</span>
      case "REJECTED":
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">반려</span>
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">{status}</span>
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
            <h1 className="text-3xl font-bold text-gray-900">공결 신청</h1>
            <p className="mt-2 text-gray-600">수업별 공결을 신청하고 증빙 파일을 업로드할 수 있습니다</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 공결 신청"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">공결 신청</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  수업 세션 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">세션 선택</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.course.title} - {session.week}주차 ({new Date(session.startAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="공결 사유를 상세히 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  사유 코드 (선택)
                </label>
                <input
                  type="text"
                  value={formData.reasonCode}
                  onChange={(e) => setFormData({ ...formData, reasonCode: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="예: 병가, 경조사 등"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  증빙 파일 (최대 5개, 이미지/PDF/워드)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setFormData({ ...formData, files })
                  }}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  각 파일 최대 10MB, 총 5개까지 업로드 가능
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  신청
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  강의
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  주차
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  사유
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  교원 코멘트
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  신청일
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {excuses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    공결 신청 내역이 없습니다
                  </td>
                </tr>
              ) : (
                excuses.map((excuse) => (
                  <tr key={excuse.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {excuse.session.course.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {excuse.session.course.code} / {excuse.session.course.section}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {excuse.session.week}주차
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{excuse.reason}</div>
                      {excuse.reasonCode && (
                        <div className="text-xs text-gray-400">코드: {excuse.reasonCode}</div>
                      )}
                      {excuse.files && excuse.files.length > 0 && (
                        <div className="mt-1 text-xs text-blue-600">
                          증빙 파일 {excuse.files.length}개
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {getStatusBadge(excuse.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {excuse.instructorComment || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(excuse.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

