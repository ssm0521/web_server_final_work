"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  subject: string | null
  content: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    email: string
    role: string
  }
  receiver: {
    id: string
    name: string
    email: string
    role: string
  }
  course: {
    id: string
    title: string
    code: string
    section: string
  } | null
}

interface Course {
  id: string
  title: string
  code: string
  section: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<"all" | "sent" | "received">("received")
  const [formData, setFormData] = useState({
    courseId: "",
    receiverId: "",
    subject: "",
    content: "",
  })

  useEffect(() => {
    fetchMessages()
    fetchCourses()
  }, [filter])

  const fetchMessages = async () => {
    try {
      const url = `/api/messages?type=${filter}`
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
          return
        }
        throw new Error("메시지 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setMessages(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)

        // 수강생 목록 수집
        const allStudents: any[] = []
        for (const course of data) {
          const enrollmentsResponse = await fetch(`/api/courses/${course.id}/enrollments`)
          if (enrollmentsResponse.ok) {
            const enrollments = await enrollmentsResponse.json()
            for (const enrollment of enrollments) {
              if (!allStudents.find((s) => s.id === enrollment.user.id)) {
                allStudents.push({
                  ...enrollment.user,
                  courses: [course],
                })
              } else {
                const existing = allStudents.find((s) => s.id === enrollment.user.id)
                if (existing && !existing.courses.find((c: any) => c.id === course.id)) {
                  existing.courses.push(course)
                }
              }
            }
          }
        }
        setStudents(allStudents)
      }
    } catch (err) {
      console.error("강의 목록 조회 오류:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.receiverId) {
      setError("수신자를 선택하세요")
      return
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: formData.receiverId,
          courseId: formData.courseId || null,
          subject: formData.subject || null,
          content: formData.content,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "메시지 전송에 실패했습니다")
      }

      await fetchMessages()
      resetForm()
      alert("메시지가 전송되었습니다")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      courseId: "",
      receiverId: "",
      subject: "",
      content: "",
    })
    setShowForm(false)
  }

  const handleCourseChange = (courseId: string) => {
    // 강의 선택 시 해당 강의의 수강생만 필터링
    if (courseId) {
      const course = courses.find((c) => c.id === courseId)
      // 수강생 목록은 이미 courses에서 가져왔으므로 그대로 사용
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">메시지</h1>
            <p className="mt-2 text-gray-600">수강생과 메시지를 주고받을 수 있습니다</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 메시지"}
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("received")}
            className={`rounded-md px-4 py-2 ${
              filter === "received"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            받은 메시지
          </button>
          <button
            onClick={() => setFilter("sent")}
            className={`rounded-md px-4 py-2 ${
              filter === "sent"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            보낸 메시지
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-4 py-2 ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            전체
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">새 메시지 작성</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  강의 (선택)
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => {
                    setFormData({ ...formData, courseId: e.target.value })
                    handleCourseChange(e.target.value)
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">강의 선택 안함</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} ({course.code} / {course.section})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  수신자 (수강생) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.receiverId}
                  onChange={(e) => setFormData({ ...formData, receiverId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">수강생 선택</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  제목 (선택)
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="메시지 제목"
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
                  rows={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="메시지 내용을 입력하세요"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  전송
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
          {messages.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              메시지가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`px-6 py-4 hover:bg-gray-50 ${
                    !message.isRead && filter === "received" ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {filter === "sent" ? message.receiver.name : message.sender.name}
                        </span>
                        {message.course && (
                          <span className="text-xs text-gray-500">
                            [{message.course.title}]
                          </span>
                        )}
                        {!message.isRead && filter === "received" && (
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                        )}
                        {message.subject && (
                          <span className="text-sm text-gray-500">- {message.subject}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{message.content}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(message.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

