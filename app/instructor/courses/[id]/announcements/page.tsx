"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface Course {
  id: string
  title: string
  code: string
  section: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<Course | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  })

  useEffect(() => {
    if (courseId) {
      fetchCourse()
      fetchAnnouncements()
    }
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

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/announcements`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
          return
        }
        throw new Error("공지사항 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setAnnouncements(data)
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
      const url = editingId
        ? `/api/announcements/${editingId}`
        : `/api/courses/${courseId}/announcements`
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "저장에 실패했습니다")
      }

      await fetchAnnouncements()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      content: announcement.content,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "삭제에 실패했습니다")
      }

      await fetchAnnouncements()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
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
              공지사항 {course && `- ${course.title}`}
            </h1>
            <p className="mt-2 text-gray-600">수강생 전체에게 공지사항을 작성할 수 있습니다</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 공지사항"}
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
              {editingId ? "공지사항 수정" : "새 공지사항 작성"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="공지사항 제목"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="공지사항 내용을 입력하세요"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingId ? "수정" : "작성"}
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

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-gray-500">공지사항이 없습니다</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                      {announcement.content}
                    </p>
                    <p className="mt-4 text-xs text-gray-400">
                      {new Date(announcement.createdAt).toLocaleString("ko-KR")}
                      {announcement.updatedAt !== announcement.createdAt && (
                        <span> (수정됨: {new Date(announcement.updatedAt).toLocaleString("ko-KR")})</span>
                      )}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

