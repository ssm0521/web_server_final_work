"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface AttendanceSummary {
  session: {
    id: string
    week: number
    startAt: string
    endAt: string
    room: string | null
    attendanceMethod: string
    attendanceCode: string | null
    isOpen: boolean
    isClosed: boolean
    course: {
      id: string
      title: string
      code: string
      section: string
    }
  }
  summary: Array<{
    student: {
      id: string
      name: string
      email: string
    }
    attendance: {
      id: string
      status: string
      checkedAt: string | null
    } | null
  }>
  stats: {
    total: number
    present: number
    late: number
    absent: number
    pending: number
    excused: number
  }
}

export default function SessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string
  const [data, setData] = useState<AttendanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      fetchAttendance()
    }
  }, [sessionId])

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/attendance`)
      if (!response.ok) {
        throw new Error("출석 현황을 불러올 수 없습니다")
      }
      const attendanceData = await response.json()
      setData(attendanceData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (
    attendanceId: string | null,
    newStatus: string,
    studentId: string,
    sessionId: string
  ) => {
    try {
      setUpdatingId(attendanceId || studentId)
      
      // 출석 기록이 없으면 생성, 있으면 수정
      const endpoint = attendanceId 
        ? `/api/attendances/${attendanceId}`
        : `/api/attendances`
      
      const body = attendanceId
        ? { status: newStatus }
        : { status: newStatus, sessionId, studentId }

      const response = await fetch(endpoint, {
        method: attendanceId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "출석 상태 수정에 실패했습니다")
      }

      // 성공 시 데이터 새로고침
      await fetchAttendance()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">미정</span>
    }
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error || "출석 현황을 불러올 수 없습니다"}
          </div>
          <Link
            href="/instructor/courses"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← 강의 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/instructor/courses/${data.session.course.id}/sessions`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← 세션 목록으로
          </Link>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-gray-900">
            {data.session.course.title} - {data.session.week}주차
          </h1>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">시간:</span>{" "}
              {new Date(data.session.startAt).toLocaleString("ko-KR")} ~{" "}
              {new Date(data.session.endAt).toLocaleString("ko-KR")}
            </div>
            {data.session.room && (
              <div>
                <span className="font-medium">강의실:</span> {data.session.room}
              </div>
            )}
            <div>
              <span className="font-medium">출석 방식:</span>{" "}
              {data.session.attendanceMethod === "ELECTRONIC" && "전자출결"}
              {data.session.attendanceMethod === "CODE" && "인증번호"}
              {data.session.attendanceMethod === "ROLL_CALL" && "호명"}
            </div>
            <div>
              <span className="font-medium">상태:</span>{" "}
              {data.session.isOpen && "출석 중"}
              {data.session.isClosed && "마감"}
              {!data.session.isOpen && !data.session.isClosed && "대기"}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-2xl font-bold text-gray-900">{data.stats.total}</div>
            <div className="text-sm text-gray-600">전체</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-2xl font-bold text-green-600">{data.stats.present}</div>
            <div className="text-sm text-gray-600">출석</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-2xl font-bold text-yellow-600">{data.stats.late}</div>
            <div className="text-sm text-gray-600">지각</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-2xl font-bold text-red-600">{data.stats.absent}</div>
            <div className="text-sm text-gray-600">결석</div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-2xl font-bold text-gray-600">{data.stats.pending}</div>
            <div className="text-sm text-gray-600">미정</div>
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold">출석 현황</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  출석 상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  체크 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  수정
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.summary.map((item) => (
                <tr key={item.student.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {item.student.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {item.student.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {getStatusBadge(item.attendance?.status || null)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {item.attendance?.checkedAt
                      ? new Date(item.attendance.checkedAt).toLocaleString("ko-KR")
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <select
                      value={item.attendance?.status || "PENDING"}
                      onChange={(e) => {
                        handleStatusChange(
                          item.attendance?.id || null,
                          e.target.value,
                          item.student.id,
                          sessionId
                        )
                      }}
                      disabled={updatingId === (item.attendance?.id || item.student.id)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="PENDING">미정</option>
                      <option value="PRESENT">출석</option>
                      <option value="LATE">지각</option>
                      <option value="ABSENT">결석</option>
                      <option value="EXCUSED">공결</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


