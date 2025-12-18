"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
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
  enrollments: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
    createdAt: string
  }>
  sessions: Array<{
    id: string
    week: number
    startAt: string
    endAt: string
    room: string | null
  }>
  policy: {
    id: string
    maxAbsent: number
    lateToAbsent: number
  } | null
}

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (courseId) {
      fetchCourse()
    }
  }, [courseId])

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/instructor")
          return
        }
        throw new Error("강의를 불러올 수 없습니다")
      }
      const data = await response.json()
      setCourse(data)
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

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error || "강의를 찾을 수 없습니다"}
          </div>
          <Link
            href="/instructor/courses"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← 강의 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/instructor/courses"
            className="text-blue-600 hover:text-blue-800"
          >
            ← 강의 목록으로
          </Link>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">과목 코드:</span> {course.code} / {course.section}
            </div>
            <div>
              <span className="font-medium">학기:</span> {course.semester.name}
            </div>
            {course.department && (
              <div>
                <span className="font-medium">학과:</span> {course.department.name}
              </div>
            )}
            <div>
              <span className="font-medium">담당교원:</span> {course.instructor.name}
            </div>
          </div>
          {course.description && (
            <div className="mt-4 text-gray-700">{course.description}</div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">출석 정책</h2>
              <div className="flex gap-2">
                <Link
                  href={`/instructor/courses/${course.id}/reports`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  리포트 →
                </Link>
                <Link
                  href={`/instructor/courses/${course.id}/announcements`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  공지사항 →
                </Link>
                <Link
                  href={`/instructor/courses/${course.id}/votes`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  투표 →
                </Link>
              </div>
            </div>
            {course.policy ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">최대 결석 횟수:</span> {course.policy.maxAbsent}회
                </div>
                <div>
                  <span className="font-medium">지각 전환:</span> 지각 {course.policy.lateToAbsent}회 = 결석 1회
                </div>
              </div>
            ) : (
              <p className="text-gray-500">출석 정책이 설정되지 않았습니다</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">수업 세션</h2>
              <Link
                href={`/instructor/courses/${course.id}/sessions`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                세션 관리 →
              </Link>
            </div>
            {course.sessions.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">총 세션:</span> {course.sessions.length}개
                </div>
                <div>
                  <span className="font-medium">마지막 세션:</span> {course.sessions[course.sessions.length - 1]?.week}주차
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-gray-500">수업 세션이 생성되지 않았습니다</p>
                <Link
                  href={`/instructor/courses/${course.id}/sessions`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  세션 생성하기 →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold">수강생 목록 ({course.enrollments.length}명)</h2>
          </div>
          {course.enrollments.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              수강생이 없습니다
            </div>
          ) : (
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
                    수강신청일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {course.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {enrollment.user.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {enrollment.user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(enrollment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

