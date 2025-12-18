"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Vote {
  id: string
  title: string
  description: string | null
  endAt: string
  createdAt: string
  course: {
    id: string
    title: string
    code: string
  }
  voteOptions: Array<{
    id: string
    label: string
  }>
  isEnded: boolean
  hasVoted: boolean
}

export default function VotesPage() {
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedCourseId, setSelectedCourseId] = useState<string>("")
  const [courses, setCourses] = useState<Array<{ id: string; title: string; code: string }>>([])

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    if (selectedCourseId) {
      fetchVotes()
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

  const fetchVotes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${selectedCourseId}/votes`)
      if (!response.ok) {
        throw new Error("투표 목록을 불러올 수 없습니다")
      }
      const data = await response.json()
      setVotes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && votes.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">투표</h1>
          <p className="mt-2 text-gray-600">공강 투표 및 설문 조사에 참여하세요</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">강의 선택</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">강의 선택</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.code})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        <div className="space-y-4">
          {votes.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-500">투표가 없습니다</p>
            </div>
          ) : (
            votes.map((vote) => {
              if (!vote || !vote.course) {
                return null // 안전한 처리
              }
              const isEnded = new Date(vote.endAt) <= new Date()
              return (
                <div key={vote.id} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4">
                    <div className="mb-2 text-sm text-gray-500">
                      {vote.course.title} ({vote.course.code})
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{vote.title}</h3>
                    {vote.description && (
                      <p className="mt-1 text-sm text-gray-600">{vote.description}</p>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      종료: {new Date(vote.endAt).toLocaleString()}
                      {isEnded && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-red-800">
                          종료됨
                        </span>
                      )}
                      {vote.hasVoted && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-green-800">
                          참여함
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/student/votes/${vote.id}`}
                    className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {isEnded ? "결과 보기" : vote.hasVoted ? "결과 보기" : "참여하기"}
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

