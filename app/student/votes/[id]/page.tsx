"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Vote {
  id: string
  title: string
  description: string | null
  endAt: string
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

interface VoteResult {
  vote: {
    id: string
    title: string
    description: string | null
    endAt: string
    isEnded: boolean
  }
  totalVotes: number
  results: Array<{
    id: string
    label: string
    count: number
    percentage: number
  }>
}

export default function VoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const voteId = params.id as string
  const [vote, setVote] = useState<Vote | null>(null)
  const [result, setResult] = useState<VoteResult | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (voteId) {
      fetchVote()
    }
  }, [voteId])

  const fetchVote = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/votes/${voteId}`)
      if (!response.ok) {
        throw new Error("투표를 불러올 수 없습니다")
      }
      const data = await response.json()
      setVote(data)

      // 종료되었거나 이미 투표한 경우 결과 조회
      if (data.isEnded || data.hasVoted) {
        fetchResult()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/votes/${voteId}/results`)
      if (!response.ok) {
        throw new Error("투표 결과를 불러올 수 없습니다")
      }
      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      console.error("투표 결과 조회 오류:", err)
    }
  }

  const handleParticipate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOptionId) {
      alert("옵션을 선택하세요")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/votes/${voteId}/participate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optionId: selectedOptionId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "투표 참여에 실패했습니다")
      }

      // 투표 완료 후 결과 조회
      await fetchVote()
      await fetchResult()
      alert("투표가 완료되었습니다!")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (error || !vote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error || "투표를 불러올 수 없습니다"}
          </div>
          <Link href="/student/votes" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
            ← 투표 목록으로
          </Link>
        </div>
      </div>
    )
  }

  const showResults = vote.isEnded || vote.hasVoted

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/student/votes" className="text-blue-600 hover:text-blue-800">
            ← 투표 목록으로
          </Link>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-2 text-sm text-gray-500">
            {vote.course.title} ({vote.course.code})
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{vote.title}</h1>
          {vote.description && <p className="mt-2 text-gray-600">{vote.description}</p>}
          <div className="mt-4 text-sm text-gray-500">
            종료 시간: {new Date(vote.endAt).toLocaleString()}
            {vote.isEnded && (
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

        {showResults && result ? (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">투표 결과</h2>
            <div className="mb-4 text-sm text-gray-600">총 {result.totalVotes}명 참여</div>

            <div className="space-y-4">
              {result.results.map((option) => (
                <div key={option.id} className="border-l-4 border-blue-500 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">
                      {option.count}표 ({option.percentage}%)
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${option.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">투표 참여</h2>
            <form onSubmit={handleParticipate} className="space-y-4">
              {vote.voteOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center rounded-lg border border-gray-300 p-4 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="option"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={(e) => setSelectedOptionId(e.target.value)}
                    className="mr-3"
                    required
                  />
                  <span className="text-gray-900">{option.label}</span>
                </label>
              ))}
              <button
                type="submit"
                disabled={submitting || !selectedOptionId}
                className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "제출 중..." : "투표하기"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

