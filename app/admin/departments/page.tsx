"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Department {
  id: string
  name: string
  code: string | null
  createdAt: string
  updatedAt: string
}

export default function DepartmentsPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("학과 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setDepartments(data)
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
      const url = editingId ? `/api/departments/${editingId}` : "/api/departments"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "저장에 실패했습니다")
      }

      await fetchDepartments()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (department: Department) => {
    setEditingId(department.id)
    setFormData({
      name: department.name,
      code: department.code || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "삭제에 실패했습니다")
      }

      await fetchDepartments()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
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
            <h1 className="text-3xl font-bold text-gray-900">학과 관리</h1>
            <p className="mt-2 text-gray-600">학과를 생성, 수정, 삭제할 수 있습니다</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 학과"}
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
              {editingId ? "학과 수정" : "새 학과 생성"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  학과명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 컴퓨터공학과"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  학과 코드 (선택)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="예: CS"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
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
                  학과명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학과 코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  생성일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    등록된 학과가 없습니다
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {department.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {department.code || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(department.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleEdit(department)}
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(department.id)
                        }}
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


