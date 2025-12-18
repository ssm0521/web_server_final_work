"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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

interface MyEnrollment {
  id: string
  course: Course
  createdAt: string
}

export default function EnrollmentsPage() {
  const router = useRouter()
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [myEnrollments, setMyEnrollments] = useState<MyEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [filter, setFilter] = useState<"all" | "enrolled" | "available">("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [coursesRes, enrollmentsRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/enrollments/my"),
      ])

      if (!coursesRes.ok) {
        if (coursesRes.status === 403) {
          router.push("/student")
          return
        }
        throw new Error("강의 목록을 불러올 수 없습니다")
      }

      const courses = await coursesRes.json()
      setAllCourses(courses)

      if (enrollmentsRes.ok) {
        const enrollments = await enrollmentsRes.json()
        setMyEnrollments(enrollments)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      setError("")
      setSuccess("")

      const response = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "수강신청에 실패했습니다")
      }

      setSuccess("수강신청이 완료되었습니다")
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUnenroll = async (courseId: string) => {
    if (!confirm("정말 수강신청을 취소하시겠습니까?")) return

    try {
      setError("")
      setSuccess("")

      const response = await fetch(`/api/courses/${courseId}/enrollments`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "수강신청 취소에 실패했습니다")
      }

      setSuccess("수강신청이 취소되었습니다")
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const enrolledCourseIds = new Set(myEnrollments.map((e) => e.course.id))

  const filteredCourses = allCourses.filter((course) => {
    // 검색어 필터
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        course.title.toLowerCase().includes(searchLower) ||
        course.code.toLowerCase().includes(searchLower) ||
        course.instructor.name.toLowerCase().includes(searchLower) ||
        course.semester.name.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // 상태 필터
    if (filter === "enrolled") {
      return enrolledCourseIds.has(course.id)
    } else if (filter === "available") {
      return !enrolledCourseIds.has(course.id)
    }
    return true
  })

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
          <h1 className="text-3xl font-bold text-gray-900">수강신청</h1>
          <p className="mt-2 text-gray-600">강의를 검색하고 수강신청할 수 있습니다</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800">{success}</div>
        )}

        {/* 필터 및 검색 */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
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
            <button
              onClick={() => setFilter("enrolled")}
              className={`rounded-md px-4 py-2 ${
                filter === "enrolled"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              수강 중 ({myEnrollments.length})
            </button>
            <button
              onClick={() => setFilter("available")}
              className={`rounded-md px-4 py-2 ${
                filter === "available"
                  ? "bg-yellow-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              신청 가능
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="강의명, 과목코드, 교원명, 학기로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2"
            />
          </div>
        </div>

        {/* 강의 목록 */}
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
                  교원
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학기
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  학과
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
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {searchTerm ? "검색 결과가 없습니다" : "등록된 강의가 없습니다"}
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const isEnrolled = enrolledCourseIds.has(course.id)
                  return (
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
                        {course.department?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {course._count.enrollments}명
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {isEnrolled ? (
                          <button
                            onClick={() => handleUnenroll(course.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            취소
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            신청
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

