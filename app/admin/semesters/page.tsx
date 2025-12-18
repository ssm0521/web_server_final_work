"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Semester {
  id: string
  year: number
  term: number
  name: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export default function SemestersPage() {
  const router = useRouter()
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    term: 1,
    name: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    fetchSemesters()
  }, [])

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("학기 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setSemesters(data)
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
      const url = editingId ? `/api/semesters/${editingId}` : "/api/semesters"
      const method = editingId ? "PUT" : "POST"

      // datetime-local을 ISO 형식으로 변환
      const submitData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "저장에 실패했습니다")
      }

      await fetchSemesters()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (semester: Semester) => {
    setEditingId(semester.id)
    const startDate = new Date(semester.startDate)
    const endDate = new Date(semester.endDate)
    
    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const hours = String(date.getHours()).padStart(2, "0")
      const minutes = String(date.getMinutes()).padStart(2, "0")
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    setFormData({
      year: semester.year,
      term: semester.term,
      name: semester.name,
      startDate: formatDateTime(startDate),
      endDate: formatDateTime(endDate),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/semesters/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "삭제에 실패했습니다")
      }

      await fetchSemesters()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      term: 1,
      name: "",
      startDate: "",
      endDate: "",
    })
    setEditingId(null)
    setShowForm(false)
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
            <h1 className="text-3xl font-bold text-gray-900">학기 관리</h1>
            <p className="mt-2 text-gray-600">학기를 생성, 수정, 삭제할 수 있습니다</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 학기"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">
              {editingId ? "학기 수정" : "새 학기 생성"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    연도
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    학기
                  </label>
                  <select
                    required
                    value={formData.term}
                    onChange={(e) =>
                      setFormData({ ...formData, term: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value={1}>1학기</option>
                    <option value={2}>2학기</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  학기명
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 2025년 2학기"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    시작일
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    종료일
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingId ? "수정" : "생성"}
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
                  연도
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학기
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학기명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  기간
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {semesters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    등록된 학기가 없습니다
                  </td>
                </tr>
              ) : (
                semesters.map((semester) => (
                  <tr key={semester.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {semester.year}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {semester.term}학기
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {semester.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(semester.startDate).toLocaleDateString()} ~{" "}
                      {new Date(semester.endDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(semester)}
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(semester.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
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

