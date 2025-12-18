"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Vote {
  id: string
  title: string
  description: string | null
  endAt: string
  createdAt: string
  voteOptions: Array<{
    id: string
    label: string
    _count: {
      voteRecords: number
    }
  }>
  _count: {
    voteRecords: number
  }
}

export default function VotesPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)

  // 투표 생성 폼 상태
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    endAt: "",
    options: ["", ""],
  })

  useEffect(() => {
    if (courseId) {
      fetchVotes()
    }
  }, [courseId])

  const fetchVotes = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/votes`)
      if (!response.ok) {
        throw new Error("투표 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setVotes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVote = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 빈 옵션 제거
      const validOptions = formData.options.filter((opt) => opt.trim() !== "")
      if (validOptions.length < 2) {
        alert("최소 2개 이상의 옵션이 필요합니다")
        return
      }

      const response = await fetch(`/api/courses/${courseId}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          endAt: new Date(formData.endAt).toISOString(),
          options: validOptions,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "투표 생성에 실패했습니다")
      }

      // 폼 초기화 및 목록 새로고침
      setFormData({
        title: "",
        description: "",
        endAt: "",
        options: ["", ""],
      })
      setShowCreateForm(false)
      fetchVotes()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteVote = async (voteId: string) => {
    if (!confirm("정말 이 투표를 삭제하시겠습니까?")) {
      return
    }

    try {
      const response = await fetch(`/api/votes/${voteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "투표 삭제에 실패했습니다")
      }

      fetchVotes()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
    }))
  }

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert("최소 2개 이상의 옵션이 필요합니다")
      return
    }
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const updateOption = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? value : opt)),
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
            <h1 className="text-3xl font-bold text-gray-900">투표 관리</h1>
            <p className="mt-2 text-gray-600">공강 투표 및 설문 조사 관리</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showCreateForm ? "취소" : "새 투표 생성"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* 투표 생성 폼 */}
        {showCreateForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">새 투표 생성</h2>
            <form onSubmit={handleCreateVote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">제목</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">종료 시간</label>
                <input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">옵션</label>
                {formData.options.map((option, index) => (
                  <div key={index} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2"
                      placeholder={`옵션 ${index + 1}`}
                      required
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + 옵션 추가
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  생성
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 투표 목록 */}
        <div className="space-y-4">
          {votes.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-500">생성된 투표가 없습니다</p>
            </div>
          ) : (
            votes.map((vote) => {
              const isEnded = new Date(vote.endAt) <= new Date()
              return (
                <div key={vote.id} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vote.title}</h3>
                      {vote.description && (
                        <p className="mt-1 text-sm text-gray-600">{vote.description}</p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        종료: {new Date(vote.endAt).toLocaleString()}
                        {isEnded && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-red-800">
                            종료됨
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/instructor/votes/${vote.id}`}
                        className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                      >
                        결과 보기
                      </Link>
                      {!isEnded && (
                        <button
                          onClick={() => handleDeleteVote(vote.id)}
                          className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    총 {vote._count?.voteRecords || 0}명 참여
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

