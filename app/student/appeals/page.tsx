"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Appeal {
  id: string
  message: string
  status: string
  instructorComment: string | null
  createdAt: string
  attendance: {
    id: string
    status: string
    checkedAt: string | null
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
}

export default function AppealsPage() {
  const router = useRouter()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [selectedAttendanceId, setSelectedAttendanceId] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchAppeals()
    fetchMyAttendances()
  }, [])

  const fetchAppeals = async () => {
    try {
      const response = await fetch("/api/appeals")
      if (!response.ok) throw new Error("이의제기 목록을 불러올 수 없습니다")
      const data = await response.json()
      setAppeals(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyAttendances = async () => {
    try {
      const coursesResponse = await fetch("/api/courses")
      if (!coursesResponse.ok) return
      const courses = await coursesResponse.json()

      const allAttendances: any[] = []
      for (const course of courses) {
        const sessionsResponse = await fetch(`/api/courses/${course.id}/sessions`)
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json()
          for (const session of sessions) {
            const attendanceResponse = await fetch(`/api/sessions/${session.id}/attendance`)
            if (attendanceResponse.ok) {
              const data = await attendanceResponse.json()
              for (const item of data.summary) {
                if (item.attendance) {
                  allAttendances.push({
                    ...item.attendance,
                    session: {
                      ...session,
                      course: {
                        id: course.id,
                        title: course.title,
                        code: course.code,
                        section: course.section,
                      },
                    },
                  })
                }
              }
            }
          }
        }
      }
      setAttendances(allAttendances)
    } catch (err) {
      console.error("출석 기록 조회 오류:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!selectedAttendanceId) {
      setError("출석 기록을 선택하세요")
      return
    }

    try {
      const response = await fetch(`/api/attendance/${selectedAttendanceId}/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "이의제기 신청에 실패했습니다")
      }

      await fetchAppeals()
      resetForm()
      alert("이의제기가 신청되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setMessage("")
    setSelectedAttendanceId("")
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

  const getAttendanceStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">출석</span>
      case "LATE":
        return <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">지각</span>
      case "ABSENT":
        return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">결석</span>
      case "EXCUSED":
        return <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">공결</span>
      default:
        return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">미정</span>
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
            <h1 className="text-3xl font-bold text-gray-900">이의제기</h1>
            <p className="mt-2 text-gray-600">출석 기록에 대한 이의를 신청할 수 있습니다</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 이의제기"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">이의제기 신청</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  출석 기록 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedAttendanceId}
                  onChange={(e) => setSelectedAttendanceId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">출석 기록 선택</option>
                  {attendances.map((attendance) => (
                    <option key={attendance.id} value={attendance.id}>
                      {attendance.session.course.title} - {attendance.session.week}주차 ({getAttendanceStatusBadge(attendance.status).props.children}) - {new Date(attendance.session.startAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  이의 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="이의 내용을 상세히 입력하세요. 예: 출석했는데 결석으로 기록되었습니다."
                />
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
                  현재 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  이의 내용
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
              {appeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    이의제기 내역이 없습니다
                  </td>
                </tr>
              ) : (
                appeals.map((appeal) => (
                  <tr key={appeal.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {appeal.attendance.session.course.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appeal.attendance.session.course.code} / {appeal.attendance.session.course.section}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {appeal.attendance.session.week}주차
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {getAttendanceStatusBadge(appeal.attendance.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">{appeal.message}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {getStatusBadge(appeal.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {appeal.instructorComment || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(appeal.createdAt).toLocaleDateString()}
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

