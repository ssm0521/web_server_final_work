"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface OpenSession {
  id: string
  week: number
  startAt: string
  endAt: string
  room: string | null
  attendanceMethod: string
  attendanceCode: string | null
  course: {
    id: string
    title: string
    code: string
    section: string
    instructor: {
      name: string
    }
  }
}

export default function AttendancePage() {
  const router = useRouter()
  const [openSessions, setOpenSessions] = useState<OpenSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [attendingSessionId, setAttendingSessionId] = useState<string | null>(null)
  const [code, setCode] = useState("")

  useEffect(() => {
    fetchOpenSessions()
    // 5초마다 새로고침
    const interval = setInterval(fetchOpenSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOpenSessions = async () => {
    try {
      // 모든 강의 목록 조회 후 열린 세션 찾기
      const coursesResponse = await fetch("/api/courses")
      if (!coursesResponse.ok) {
        throw new Error("강의 목록을 불러올 수 없습니다")
      }
      const courses = await coursesResponse.json()

      // 각 강의의 세션 조회
      const allSessions: OpenSession[] = []
      for (const course of courses) {
        const sessionsResponse = await fetch(`/api/courses/${course.id}/sessions`)
        if (sessionsResponse.ok) {
          const sessions = await sessionsResponse.json()
          const open = sessions.filter(
            (s: any) => s.isOpen && !s.isClosed
          )
          for (const session of open) {
            allSessions.push({
              ...session,
              course: {
                id: course.id,
                title: course.title,
                code: course.code,
                section: course.section,
                instructor: course.instructor,
              },
            })
          }
        }
      }

      setOpenSessions(allSessions)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAttend = async (sessionId: string) => {
    setError("")
    setSuccess("")
    setAttendingSessionId(sessionId)

    try {
      const body: any = {}
      const session = openSessions.find((s) => s.id === sessionId)
      if (session?.attendanceMethod === "CODE") {
        if (!code) {
          setError("인증번호를 입력하세요")
          setAttendingSessionId(null)
          return
        }
        body.code = code
      }

      const response = await fetch(`/api/sessions/${sessionId}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "출석 체크에 실패했습니다")
      }

      setSuccess("출석 체크가 완료되었습니다!")
      setCode("")
      await fetchOpenSessions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAttendingSessionId(null)
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">출석 체크</h1>
          <p className="mt-2 text-gray-600">현재 열린 출석을 확인하고 체크할 수 있습니다</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {openSessions.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">현재 열린 출석이 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {openSessions.map((session) => (
              <div key={session.id} className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {session.course.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {session.course.code} / {session.course.section} | {session.course.instructor.name}
                  </p>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">주차:</span> {session.week}주차
                  </div>
                  <div>
                    <span className="font-medium">시간:</span>{" "}
                    {new Date(session.startAt).toLocaleString("ko-KR")}
                  </div>
                  {session.room && (
                    <div>
                      <span className="font-medium">강의실:</span> {session.room}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">출석 방식:</span>{" "}
                    {session.attendanceMethod === "ELECTRONIC" && "전자출결"}
                    {session.attendanceMethod === "CODE" && "인증번호 입력"}
                    {session.attendanceMethod === "ROLL_CALL" && "호명"}
                  </div>
                </div>

                {session.attendanceMethod === "CODE" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      인증번호
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="교원이 공유한 인증번호를 입력하세요"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleAttend(session.id)}
                  disabled={attendingSessionId === session.id}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {attendingSessionId === session.id ? "처리 중..." : "출석 체크"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


