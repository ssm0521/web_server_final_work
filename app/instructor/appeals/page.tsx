"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Appeal {
  id: string
  message: string
  status: string
  instructorComment: string | null
  createdAt: string
  student: {
    id: string
    name: string
    email: string
  }
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("PENDING")
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [comment, setComment] = useState("")
  const [newStatus, setNewStatus] = useState("PRESENT")

  useEffect(() => {
    fetchAppeals()
  }, [filter])

  const fetchAppeals = async () => {
    try {
      const url = `/api/appeals?status=${filter}`
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
          return
        }
        throw new Error("이의제기 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setAppeals(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (appealId: string) => {
    try {
      const response = await fetch(`/api/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          instructorComment: comment || null,
          newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "승인 처리에 실패했습니다")
      }

      await fetchAppeals()
      setShowModal(false)
      setSelectedAppeal(null)
      setComment("")
      setNewStatus("PRESENT")
      alert("이의제기가 승인되었고 출석 상태가 변경되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleReject = async (appealId: string) => {
    if (!comment.trim()) {
      setError("반려 사유를 입력하세요")
      return
    }

    try {
      const response = await fetch(`/api/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          instructorComment: comment,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "반려 처리에 실패했습니다")
      }

      await fetchAppeals()
      setShowModal(false)
      setSelectedAppeal(null)
      setComment("")
      alert("이의제기가 반려되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openModal = (appeal: Appeal) => {
    setSelectedAppeal(appeal)
    setComment(appeal.instructorComment || "")
    setNewStatus(appeal.attendance.status)
    setShowModal(true)
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">이의제기 처리</h1>
          <p className="mt-2 text-gray-600">수강생의 이의제기를 검토하고 출석 상태를 정정할 수 있습니다</p>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("PENDING")}
            className={`rounded-md px-4 py-2 ${
              filter === "PENDING"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            대기 중 ({appeals.filter((a) => a.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`rounded-md px-4 py-2 ${
              filter === "APPROVED"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            승인됨
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`rounded-md px-4 py-2 ${
              filter === "REJECTED"
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            반려됨
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
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
                  학생
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
                  신청일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {appeals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    {filter === "PENDING" ? "대기 중인 이의제기가 없습니다" : "이의제기 내역이 없습니다"}
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
                      {appeal.student.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(appeal.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => openModal(appeal)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {appeal.status === "PENDING" ? "처리" : "상세"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && selectedAppeal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">이의제기 상세</h2>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">강의:</span> {selectedAppeal.attendance.session.course.title}
                </div>
                <div>
                  <span className="font-medium">학생:</span> {selectedAppeal.student.name} ({selectedAppeal.student.email})
                </div>
                <div>
                  <span className="font-medium">주차:</span> {selectedAppeal.attendance.session.week}주차
                </div>
                <div>
                  <span className="font-medium">현재 출석 상태:</span>{" "}
                  {getAttendanceStatusBadge(selectedAppeal.attendance.status)}
                </div>
                <div>
                  <span className="font-medium">이의 내용:</span>
                  <div className="mt-1 rounded-md bg-gray-50 p-3">{selectedAppeal.message}</div>
                </div>
                {selectedAppeal.status === "PENDING" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        변경할 출석 상태 (승인 시)
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="PRESENT">출석</option>
                        <option value="LATE">지각</option>
                        <option value="ABSENT">결석</option>
                        <option value="EXCUSED">공결</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        코멘트 {selectedAppeal.status === "PENDING" && "(반려 시 필수)"}
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                        placeholder="승인/반려 사유를 입력하세요"
                      />
                    </div>
                  </>
                )}
                {selectedAppeal.status !== "PENDING" && (
                  <div>
                    <span className="font-medium">교원 코멘트:</span>
                    <div className="mt-1 rounded-md bg-gray-50 p-3">
                      {selectedAppeal.instructorComment || "-"}
                    </div>
                  </div>
                )}
                {selectedAppeal.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(selectedAppeal.id)}
                      className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      승인 및 상태 변경
                    </button>
                    <button
                      onClick={() => handleReject(selectedAppeal.id)}
                      className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setSelectedAppeal(null)
                        setComment("")
                      }}
                      className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                )}
                {selectedAppeal.status !== "PENDING" && (
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedAppeal(null)
                    }}
                    className="w-full rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

