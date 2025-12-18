"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  APPROVE_TEMPLATES,
  REJECT_TEMPLATES,
  getTemplateById,
  ExcuseTemplate,
} from "@/lib/excuse-templates"

interface ExcuseRequest {
  id: string
  reason: string
  reasonCode: string | null
  status: string
  files: string[] | null
  instructorComment: string | null
  createdAt: string
  student: {
    id: string
    name: string
    email: string
  }
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
  const [filter, setFilter] = useState("PENDING")
  const [selectedExcuse, setSelectedExcuse] = useState<ExcuseRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"APPROVE" | "REJECT" | null>(null)
  const [comment, setComment] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")

  useEffect(() => {
    fetchExcuses()
  }, [filter])

  const fetchExcuses = async () => {
    try {
      const url = `/api/excuses?status=${filter}`
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
          return
        }
        throw new Error("공결 신청 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setExcuses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedExcuse) return

    try {
      const response = await fetch(`/api/excuses/${selectedExcuse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          instructorComment: comment || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "승인 처리에 실패했습니다")
      }

      await fetchExcuses()
      setShowModal(false)
      setSelectedExcuse(null)
      setModalType(null)
      setComment("")
      setSelectedTemplate("")
      alert("공결이 승인되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleReject = async () => {
    if (!selectedExcuse) return

    if (!comment.trim()) {
      setError("반려 사유를 입력하세요")
      return
    }

    try {
      const response = await fetch(`/api/excuses/${selectedExcuse.id}`, {
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

      await fetchExcuses()
      setShowModal(false)
      setSelectedExcuse(null)
      setModalType(null)
      setComment("")
      setSelectedTemplate("")
      alert("공결이 반려되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openModal = (excuse: ExcuseRequest) => {
    setSelectedExcuse(excuse)
    setComment(excuse.instructorComment || "")
    setModalType(null)
    setSelectedTemplate("")
    setShowModal(true)
  }

  const openApproveModal = (excuse: ExcuseRequest) => {
    setSelectedExcuse(excuse)
    setModalType("APPROVE")
    setComment("")
    setSelectedTemplate("")
    setShowModal(true)
  }

  const openRejectModal = (excuse: ExcuseRequest) => {
    setSelectedExcuse(excuse)
    setModalType("REJECT")
    setComment("")
    setSelectedTemplate("")
    setShowModal(true)
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = getTemplateById(templateId)
    if (template) {
      setComment(template.template)
    }
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">공결 승인/반려</h1>
          <p className="mt-2 text-gray-600">수강생의 공결 신청을 검토하고 승인/반려할 수 있습니다</p>
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
            대기 중 ({excuses.filter((e) => e.status === "PENDING").length})
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
                  사유
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
              {excuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {filter === "PENDING" ? "대기 중인 공결 신청이 없습니다" : "공결 신청 내역이 없습니다"}
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
                      {excuse.student.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {excuse.session.week}주차
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">{excuse.reason}</div>
                      {excuse.files && excuse.files.length > 0 && (
                        <div className="mt-1 text-xs text-blue-600">
                          증빙 파일 {excuse.files.length}개
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {getStatusBadge(excuse.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(excuse.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {excuse.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openApproveModal(excuse)}
                            className="text-green-600 hover:text-green-900"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => openRejectModal(excuse)}
                            className="text-red-600 hover:text-red-900"
                          >
                            반려
                          </button>
                          <button
                            onClick={() => openModal(excuse)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            상세
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openModal(excuse)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          상세
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && selectedExcuse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">공결 신청 상세</h2>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">강의:</span> {selectedExcuse.session.course.title}
                </div>
                <div>
                  <span className="font-medium">학생:</span> {selectedExcuse.student.name} ({selectedExcuse.student.email})
                </div>
                <div>
                  <span className="font-medium">주차:</span> {selectedExcuse.session.week}주차
                </div>
                <div>
                  <span className="font-medium">사유:</span>
                  <div className="mt-1 rounded-md bg-gray-50 p-3">{selectedExcuse.reason}</div>
                </div>
                {selectedExcuse.files && selectedExcuse.files.length > 0 && (
                  <div>
                    <span className="font-medium">증빙 파일:</span>
                    <div className="mt-1 space-y-1">
                      {selectedExcuse.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:text-blue-800"
                        >
                          파일 {idx + 1} 보기
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {selectedExcuse.status === "PENDING" && modalType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사유 템플릿 선택
                    </label>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      {(modalType === "APPROVE" ? APPROVE_TEMPLATES : REJECT_TEMPLATES).map(
                        (template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleTemplateSelect(template.id)}
                            className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                              selectedTemplate === template.id
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {template.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    코멘트 {selectedExcuse.status === "PENDING" && modalType === "REJECT" && "(필수)"}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value)
                      if (e.target.value !== getTemplateById(selectedTemplate)?.template) {
                        setSelectedTemplate("")
                      }
                    }}
                    rows={4}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder={
                      modalType === "APPROVE"
                        ? "승인 사유를 입력하세요 (템플릿 선택 또는 직접 입력)"
                        : modalType === "REJECT"
                        ? "반려 사유를 입력하세요 (템플릿 선택 또는 직접 입력)"
                        : "승인/반려 사유를 입력하세요"
                    }
                  />
                </div>
                {selectedExcuse.status === "PENDING" && modalType && (
                  <div className="flex gap-2">
                    {modalType === "APPROVE" ? (
                      <>
                        <button
                          onClick={handleApprove}
                          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => {
                            setShowModal(false)
                            setSelectedExcuse(null)
                            setModalType(null)
                            setComment("")
                            setSelectedTemplate("")
                          }}
                          className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleReject}
                          disabled={!comment.trim()}
                          className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
                        >
                          반려
                        </button>
                        <button
                          onClick={() => {
                            setShowModal(false)
                            setSelectedExcuse(null)
                            setModalType(null)
                            setComment("")
                            setSelectedTemplate("")
                          }}
                          className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </>
                    )}
                  </div>
                )}
                {selectedExcuse.status === "PENDING" && !modalType && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openApproveModal(selectedExcuse)}
                      className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => openRejectModal(selectedExcuse)}
                      className="flex-1 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setSelectedExcuse(null)
                        setComment("")
                      }}
                      className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                )}
                {selectedExcuse.status !== "PENDING" && (
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedExcuse(null)
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

