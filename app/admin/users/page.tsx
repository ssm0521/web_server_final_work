"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  _count: {
    instructorCourses: number
    enrollments: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // 필터 상태
  const [filters, setFilters] = useState({
    role: "",
    search: "",
    page: 1,
  })

  // 수정/생성 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "STUDENT" as "ADMIN" | "INSTRUCTOR" | "STUDENT",
  })

  useEffect(() => {
    fetchUsers()
  }, [filters])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.role) params.append("role", filters.role)
      if (filters.search) params.append("search", filters.search)
      params.append("page", filters.page.toString())
      params.append("limit", "50")

      const response = await fetch(`/api/users?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("사용자 목록을 불러올 수 없습니다")
      }

      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      email: "",
      name: "",
      password: "",
      role: "STUDENT",
    })
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role as "ADMIN" | "INSTRUCTOR" | "STUDENT",
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PATCH" : "POST"

      const body: any = {
        name: formData.name,
        role: formData.role,
      }

      if (!editingUser) {
        body.email = formData.email
        body.password = formData.password
      } else if (formData.password) {
        body.password = formData.password
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "저장에 실패했습니다")
      }

      setShowModal(false)
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("정말 이 사용자를 삭제하시겠습니까?")) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "삭제에 실패했습니다")
      }

      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "관리자",
      INSTRUCTOR: "교원",
      STUDENT: "학생",
    }
    return labels[role] || role
  }

  if (loading && users.length === 0) {
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
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← 관리자 대시보드로
          </Link>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
            <p className="mt-2 text-gray-600">사용자 등록, 수정, 권한 관리</p>
          </div>
          <button
            onClick={openCreateModal}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            새 사용자 등록
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {/* 필터 */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">역할</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">전체</option>
                <option value="ADMIN">관리자</option>
                <option value="INSTRUCTOR">교원</option>
                <option value="STUDENT">학생</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">검색</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="이름 또는 이메일"
              />
            </div>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold">
              사용자 목록 {pagination && `(${pagination.total}명)`}
            </h2>
          </div>
          {users.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">사용자가 없습니다</div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                        역할
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        강의/수강
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              user.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800"
                                : user.role === "INSTRUCTOR"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {user.role === "INSTRUCTOR" && `${user._count.instructorCourses}개 강의`}
                          {user.role === "STUDENT" && `${user._count.enrollments}개 수강`}
                          {user.role === "ADMIN" && "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {pagination && pagination.totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      {pagination.page} / {pagination.totalPages} 페이지
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">
              {editingUser ? "사용자 수정" : "새 사용자 등록"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  비밀번호 {editingUser && "(변경하지 않으려면 비워두세요)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required={!editingUser}
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">역할</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "ADMIN" | "INSTRUCTOR" | "STUDENT",
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="STUDENT">학생</option>
                  <option value="INSTRUCTOR">교원</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingUser ? "수정" : "등록"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

