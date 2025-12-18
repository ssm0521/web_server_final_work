"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  course: {
    id: string
    title: string
    code: string
    section: string
  }
}

interface Course {
  id: string
  title: string
  code: string
  section: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchAnnouncements()
    } else {
      fetchAllAnnouncements()
    }
  }, [selectedCourseId])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
        if (data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(data[0].id)
        }
      }
    } catch (err) {
      console.error("강의 목록 조회 오류:", err)
    }
  }

  const fetchAllAnnouncements = async () => {
    try {
      const allAnnouncements: Announcement[] = []
      for (const course of courses) {
        const response = await fetch(`/api/courses/${course.id}/announcements`)
        if (response.ok) {
          const data = await response.json()
          for (const announcement of data) {
            allAnnouncements.push({
              ...announcement,
              course: {
                id: course.id,
                title: course.title,
                code: course.code,
                section: course.section,
              },
            })
          }
        }
      }
      setAnnouncements(allAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${selectedCourseId}/announcements`)
      if (!response.ok) {
        throw new Error("공지사항 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      const course = courses.find((c) => c.id === selectedCourseId)
      const announcementsWithCourse = data.map((a: any) => ({
        ...a,
        course: course || { id: selectedCourseId, title: "", code: "", section: "" },
      }))
      setAnnouncements(announcementsWithCourse)
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
          <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
          <p className="mt-2 text-gray-600">수강 중인 강의의 공지사항을 확인할 수 있습니다</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            강의 필터
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">전체</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.code} / {course.section})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
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
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {announcement.course.title} ({announcement.course.code} / {announcement.course.section})
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
                  {announcement.content}
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  {new Date(announcement.createdAt).toLocaleString("ko-KR")}
                  {announcement.updatedAt !== announcement.createdAt && (
                    <span> (수정됨: {new Date(announcement.updatedAt).toLocaleString("ko-KR")})</span>
                  )}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

