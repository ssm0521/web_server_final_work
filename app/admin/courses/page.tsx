"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Course {
  id: string
  title: string
  code: string
  section: string
  description: string | null
  instructor: {
    id: string
    name: string
    email: string
  }
  semester: {
    id: string
    name: string
    year: number
    term: number
  }
  department: {
    id: string
    name: string
    code: string | null
  } | null
  _count: {
    enrollments: number
  }
}

interface Semester {
  id: string
  name: string
  year: number
  term: number
}

interface Department {
  id: string
  name: string
  code: string | null
}

interface Instructor {
  id: string
  name: string
  email: string
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("")
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    section: "",
    semesterId: "",
    departmentId: "",
    instructorId: "",
    description: "",
  })

  useEffect(() => {
    fetchSemesters()
    fetchDepartments()
    fetchInstructors()
    fetchCourses()
  }, [])

  const fetchSemesters = async () => {
    try {
      const response = await fetch("/api/semesters")
      if (response.ok) {
        const data = await response.json()
        setSemesters(data)
        if (data.length > 0 && !selectedSemesterId) {
          setSelectedSemesterId(data[0].id)
          setFormData((prev) => ({ ...prev, semesterId: data[0].id }))
        }
      }
    } catch (err) {
      console.error("학기 목록 조회 오류:", err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (err) {
      console.error("학과 목록 조회 오류:", err)
    }
  }

  const fetchInstructors = async () => {
    try {
      const response = await fetch("/api/users?role=INSTRUCTOR")
      if (response.ok) {
        const data = await response.json()
        setInstructors(data.users || [])
      }
    } catch (err) {
      console.error("교수 목록 조회 오류:", err)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin")
          return
        }
        throw new Error("강의 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setCourses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.instructorId) {
      setError("담당교수를 선택하세요")
      return
    }

    try {
      const url = editingId ? `/api/courses/${editingId}` : "/api/courses"
      const method = editingId ? "PUT" : "POST"

      const submitData = {
        ...formData,
        departmentId: formData.departmentId || null,
        description: formData.description || null,
        instructorId: formData.instructorId,
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

      await fetchCourses()
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (course: Course) => {
    setEditingId(course.id)
    setFormData({
      title: course.title,
      code: course.code,
      section: course.section,
      semesterId: course.semester.id,
      departmentId: course.department?.id || "",
      instructorId: course.instructor.id,
      description: course.description || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? 수강생이 있으면 삭제할 수 없습니다.")) return

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "삭제에 실패했습니다")
      }

      await fetchCourses()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      code: "",
      section: "",
      semesterId: selectedSemesterId || "",
      departmentId: "",
      instructorId: "",
      description: "",
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
            <h1 className="text-3xl font-bold text-gray-900">교과목 관리</h1>
            <p className="mt-2 text-gray-600">교과목을 생성, 수정, 삭제할 수 있습니다</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {showForm ? "취소" : "+ 새 교과목"}
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
              {editingId ? "교과목 수정" : "새 교과목 생성"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    강의명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예: 서버프로그래밍"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    학기 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.semesterId}
                    onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">학기 선택</option>
                    {semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    과목 코드 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="예: CS101"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    분반 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="예: 01"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    담당교수 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.instructorId}
                    onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">담당교수 선택</option>
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name} ({instructor.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    학과 (선택)
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">학과 선택 안함</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name} {department.code && `(${department.code})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="강의 설명을 입력하세요"
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
                  강의명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  과목코드/분반
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  담당교수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학기
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  수강생
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    등록된 교과목이 없습니다
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{course.title}</div>
                      {course.description && (
                        <div className="text-sm text-gray-500">{course.description}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {course.code} / {course.section}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {course.instructor.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {course.semester.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {course._count.enrollments}명
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => handleEdit(course)}
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(course.id)}
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

