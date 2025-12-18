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

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">강의 관리</h1>
            <p className="mt-2 text-gray-600">담당 강의를 조회하고 관리할 수 있습니다</p>
            <p className="mt-1 text-sm text-gray-500">교과목 개설은 관리자에게 문의하세요</p>
          </div>
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
                  강의명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  과목코드/분반
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
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    등록된 강의가 없습니다
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
                      {course.semester.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {course._count.enrollments}명
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/instructor/courses/${course.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세
                      </Link>
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


