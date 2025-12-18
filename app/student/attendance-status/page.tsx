"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AttendanceStatus {
  course: {
    id: string
    title: string
    code: string
    section: string
  }
  overall: {
    totalSessions: number
    averageAttendanceRate: number
    totalPresent: number
    totalLate: number
    totalAbsent: number
    totalExcused: number
  }
  weekly: Array<{
    week: number
    date: string
    present: number
    late: number
    absent: number
    excused: number
    attendanceRate: number
    myAttendance?: {
      status: string
      checkedAt: string | null
    } | null
  }>
  myStats: {
    present: number
    late: number
    absent: number
    excused: number
    total: number
    attendanceRate: number
  }
}

interface Course {
  id: string
  title: string
  code: string
  section: string
}

export default function AttendanceStatusPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [status, setStatus] = useState<AttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchAttendanceStatus()
    }
  }, [selectedCourseId])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id)
        }
      }
    } catch (err) {
      console.error("강의 목록 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${selectedCourseId}/reports/attendance`)
      if (!response.ok) {
        throw new Error("출석 현황을 불러올 수 없습니다")
      }
      const data = await response.json()

      // 내 통계만 추출
      const myStats = data.students.find(
        (s: any) => s.student.id === data.myStudentId
      ) || data.students[0] // 임시로 첫 번째 학생 (실제로는 세션에서 가져와야 함)

      setStatus({
        ...data,
        myStats: myStats || {
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          total: 0,
          attendanceRate: 0,
        },
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
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
          <h1 className="text-3xl font-bold text-gray-900">출석 현황</h1>
          <p className="mt-2 text-gray-600">수강 과목별 출석 현황을 확인할 수 있습니다</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            강의 선택
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">강의 선택</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.code} / {course.section})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {status && (
          <div className="space-y-6">
            {/* 내 출석 통계 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(status.myStats.attendanceRate)}%
                </div>
                <div className="text-sm text-gray-600">출석률</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-green-600">
                  {status.myStats.present}
                </div>
                <div className="text-sm text-gray-600">출석</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-yellow-600">
                  {status.myStats.late}
                </div>
                <div className="text-sm text-gray-600">지각</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-red-600">
                  {status.myStats.absent}
                </div>
                <div className="text-sm text-gray-600">결석</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-blue-600">
                  {status.myStats.excused}
                </div>
                <div className="text-sm text-gray-600">공결</div>
              </div>
            </div>

            {/* 주차별 출석 현황 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">주차별 출석 현황</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        주차
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {status.weekly.map((week) => {
                      const attendance = week.myAttendance
                      const getStatusBadge = (status: string) => {
                        const badges: Record<string, { label: string; className: string }> = {
                          PRESENT: { label: "출석", className: "bg-green-100 text-green-800" },
                          LATE: { label: "지각", className: "bg-yellow-100 text-yellow-800" },
                          ABSENT: { label: "결석", className: "bg-red-100 text-red-800" },
                          EXCUSED: { label: "공결", className: "bg-blue-100 text-blue-800" },
                          PENDING: { label: "미정", className: "bg-gray-100 text-gray-800" },
                        }
                        return badges[status] || badges.PENDING
                      }

                      const badge = attendance
                        ? getStatusBadge(attendance.status)
                        : { label: "미정", className: "bg-gray-100 text-gray-800" }

                      return (
                        <tr key={week.week}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {week.week}주차
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {new Date(week.date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            {attendance?.checkedAt && (
                              <div className="mt-1 text-xs text-gray-500">
                                {new Date(attendance.checkedAt).toLocaleString()}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

