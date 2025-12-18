"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface ClassSession {
  id: string
  week: number
  startAt: string
  endAt: string
  room: string | null
  attendanceMethod: string
  attendanceCode: string | null
  isOpen: boolean
  isClosed: boolean
  _count: {
    attendances: number
  }
}

interface Course {
  id: string
  title: string
  code: string
  section: string
}

export default function SessionsPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [useRecurring, setUseRecurring] = useState(false) // 반복 규칙 사용 여부
  const [formData, setFormData] = useState({
    week: 1,
    startAt: "",
    endAt: "",
    room: "",
    attendanceMethod: "ELECTRONIC" as "ELECTRONIC" | "CODE" | "ROLL_CALL",
  })
  const [recurringData, setRecurringData] = useState({
    daysOfWeek: [] as number[], // 0: 일요일, 1: 월요일, ..., 6: 토요일
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "10:30",
    excludeHolidays: true,
    room: "",
    attendanceMethod: "ELECTRONIC" as "ELECTRONIC" | "CODE" | "ROLL_CALL",
    makeUpDates: [] as string[], // 보강일 목록
  })

  useEffect(() => {
    fetchCourse()
    fetchSessions()
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`)
      if (response.ok) {
        const data = await response.json()
        setCourse(data)
      }
    } catch (err) {
      console.error("강의 조회 오류:", err)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/sessions`)
      if (!response.ok) {
        throw new Error("수업 세션 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setSessions(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      let requestBody: any

      if (useRecurring) {
        // 반복 규칙으로 생성
        if (recurringData.daysOfWeek.length === 0) {
          alert("최소 1개 이상의 요일을 선택하세요")
          return
        }

        // 날짜 형식 검증
        if (!recurringData.startDate || !recurringData.endDate) {
          alert("시작 날짜와 종료 날짜를 모두 입력하세요")
          return
        }

        const startDate = new Date(recurringData.startDate)
        const endDate = new Date(recurringData.endDate)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          alert("올바른 날짜 형식을 입력하세요")
          return
        }

        if (startDate >= endDate) {
          alert("종료 날짜는 시작 날짜보다 이후여야 합니다")
          return
        }

        requestBody = {
          daysOfWeek: recurringData.daysOfWeek,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: recurringData.startTime,
          endTime: recurringData.endTime,
          excludeHolidays: recurringData.excludeHolidays,
          room: recurringData.room || null,
          attendanceMethod: recurringData.attendanceMethod,
          makeUpDates:
            recurringData.makeUpDates.length > 0
              ? recurringData.makeUpDates.map((d) => {
                  const date = new Date(d)
                  return isNaN(date.getTime()) ? null : date.toISOString()
                }).filter((d) => d !== null)
              : [],
        }
      } else {
        // 단일 세션 생성
        requestBody = {
          ...formData,
          room: formData.room || null,
        }
      }

      const response = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "저장에 실패했습니다")
      }

      const result = await response.json()
      if (result.message) {
        alert(result.message)
      }

      await fetchSessions()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleOpen = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/open`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "출석 열기에 실패했습니다")
      }

      await fetchSessions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleClose = async (sessionId: string) => {
    if (!confirm("출석을 마감하시겠습니까? 출석하지 않은 학생은 자동으로 결석 처리됩니다.")) {
      return
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/close`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "출석 마감에 실패했습니다")
      }

      await fetchSessions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRegenerateCode = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/code`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "인증번호 생성에 실패했습니다")
      }

      const data = await response.json()
      alert(`새 인증번호: ${data.code}`)
      await fetchSessions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      week: sessions.length + 1,
      startAt: "",
      endAt: "",
      room: "",
      attendanceMethod: "ELECTRONIC",
    })
    setRecurringData({
      daysOfWeek: [],
      startDate: "",
      endDate: "",
      startTime: "09:00",
      endTime: "10:30",
      excludeHolidays: true,
      room: "",
      attendanceMethod: "ELECTRONIC",
      makeUpDates: [],
    })
    setUseRecurring(false)
    setShowForm(false)
  }

  const toggleDayOfWeek = (day: number) => {
    setRecurringData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }))
  }

  const addMakeUpDate = () => {
    const date = prompt("보강일을 입력하세요 (YYYY-MM-DD 형식):")
    if (date) {
      try {
        const dateObj = new Date(date)
        if (!isNaN(dateObj.getTime())) {
          setRecurringData((prev) => ({
            ...prev,
            makeUpDates: [...prev.makeUpDates, dateObj.toISOString().slice(0, 16)],
          }))
        } else {
          alert("올바른 날짜 형식이 아닙니다")
        }
      } catch {
        alert("올바른 날짜 형식이 아닙니다")
      }
    }
  }

  const removeMakeUpDate = (index: number) => {
    setRecurringData((prev) => ({
      ...prev,
      makeUpDates: prev.makeUpDates.filter((_, i) => i !== index),
    }))
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
          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← 강의 상세로
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              수업 세션 관리 {course && `- ${course.title}`}
            </h1>
            <p className="mt-2 text-gray-600">주차별 수업 세션을 생성하고 출석을 관리할 수 있습니다</p>
          </div>
          <button
            onClick={() => {
              setFormData({
                week: sessions.length + 1,
                startAt: "",
                endAt: "",
                room: "",
                attendanceMethod: "ELECTRONIC",
              })
              setShowForm(!showForm)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 세션"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">새 수업 세션 생성</h2>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useRecurring}
                  onChange={(e) => setUseRecurring(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">반복 규칙으로 생성</span>
              </label>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {useRecurring ? (
                <>
                  {/* 반복 규칙 폼 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      수업 요일 <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-2 flex gap-2">
                      {[
                        { value: 0, label: "일" },
                        { value: 1, label: "월" },
                        { value: 2, label: "화" },
                        { value: 3, label: "수" },
                        { value: 4, label: "목" },
                        { value: 5, label: "금" },
                        { value: 6, label: "토" },
                      ].map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={`rounded-md px-3 py-2 text-sm font-medium ${
                            recurringData.daysOfWeek.includes(day.value)
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        시작 날짜 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={recurringData.startDate}
                        onChange={(e) =>
                          setRecurringData({ ...recurringData, startDate: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        종료 날짜 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={recurringData.endDate}
                        onChange={(e) =>
                          setRecurringData({ ...recurringData, endDate: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        시작 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={recurringData.startTime}
                        onChange={(e) =>
                          setRecurringData({ ...recurringData, startTime: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        종료 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={recurringData.endTime}
                        onChange={(e) =>
                          setRecurringData({ ...recurringData, endTime: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      출석 방식 <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={recurringData.attendanceMethod}
                      onChange={(e) =>
                        setRecurringData({
                          ...recurringData,
                          attendanceMethod: e.target.value as "ELECTRONIC" | "CODE" | "ROLL_CALL",
                        })
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="ELECTRONIC">전자출결</option>
                      <option value="CODE">인증번호 입력</option>
                      <option value="ROLL_CALL">호명</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">강의실</label>
                    <input
                      type="text"
                      value={recurringData.room}
                      onChange={(e) =>
                        setRecurringData({ ...recurringData, room: e.target.value })
                      }
                      placeholder="예: 101호"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={recurringData.excludeHolidays}
                        onChange={(e) =>
                          setRecurringData({ ...recurringData, excludeHolidays: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">공휴일 자동 제외</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">보강일</label>
                    <div className="mt-2 space-y-2">
                      {recurringData.makeUpDates.map((date, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => {
                              const newDates = [...recurringData.makeUpDates]
                              newDates[index] = e.target.value
                              setRecurringData({ ...recurringData, makeUpDates: newDates })
                            }}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                          />
                          <button
                            type="button"
                            onClick={() => removeMakeUpDate(index)}
                            className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addMakeUpDate}
                        className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        + 보강일 추가
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* 단일 세션 폼 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        주차 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={formData.week}
                        onChange={(e) =>
                          setFormData({ ...formData, week: parseInt(e.target.value) })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        출석 방식 <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.attendanceMethod}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            attendanceMethod: e.target.value as "ELECTRONIC" | "CODE" | "ROLL_CALL",
                          })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="ELECTRONIC">전자출결</option>
                        <option value="CODE">인증번호 입력</option>
                        <option value="ROLL_CALL">호명</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        시작 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.startAt}
                        onChange={(e) =>
                          setFormData({ ...formData, startAt: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        종료 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.endAt}
                        onChange={(e) =>
                          setFormData({ ...formData, endAt: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">강의실</label>
                    <input
                      type="text"
                      value={formData.room}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      placeholder="예: 101호"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  생성
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
                  주차
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  출석 방식
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  출석 인원
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    등록된 세션이 없습니다
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {session.week}주차
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>
                        {new Date(session.startAt).toLocaleString("ko-KR")}
                      </div>
                      <div className="text-xs">
                        {session.room && `강의실: ${session.room}`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {session.attendanceMethod === "ELECTRONIC" && "전자출결"}
                      {session.attendanceMethod === "CODE" && "인증번호"}
                      {session.attendanceMethod === "ROLL_CALL" && "호명"}
                      {session.attendanceMethod === "CODE" && session.attendanceCode && (
                        <div className="text-xs font-mono text-blue-600">
                          코드: {session.attendanceCode}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {session.isOpen && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          출석 중
                        </span>
                      )}
                      {session.isClosed && (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                          마감
                        </span>
                      )}
                      {!session.isOpen && !session.isClosed && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                          대기
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {session._count.attendances}명
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {!session.isOpen && !session.isClosed && (
                        <button
                          onClick={() => handleOpen(session.id)}
                          className="mr-2 text-green-600 hover:text-green-900"
                        >
                          출석 열기
                        </button>
                      )}
                      {session.isOpen && (
                        <>
                          <button
                            onClick={() => handleClose(session.id)}
                            className="mr-2 text-red-600 hover:text-red-900"
                          >
                            마감
                          </button>
                          {session.attendanceMethod === "CODE" && (
                            <button
                              onClick={() => handleRegenerateCode(session.id)}
                              className="mr-2 text-blue-600 hover:text-blue-900"
                            >
                              코드 재생성
                            </button>
                          )}
                        </>
                      )}
                      <Link
                        href={`/instructor/sessions/${session.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세
                      </Link>
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


