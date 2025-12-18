"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

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
    voters?: Array<{
      id: string
      name: string
      email: string
    }>
  }>
}

export default function VoteResultPage() {
  const router = useRouter()
  const params = useParams()
  const voteId = params.id as string
  const [result, setResult] = useState<VoteResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (voteId) {
      fetchResult()
    }
  }, [voteId])

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/votes/${voteId}/results`)
      if (!response.ok) {
        throw new Error("투표 결과를 불러올 수 없습니다")
      }
      const data = await response.json()
      setResult(data)
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

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error || "투표 결과를 불러올 수 없습니다"}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/instructor" className="text-blue-600 hover:text-blue-800">
            ← 교원 대시보드로
          </Link>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-gray-900">{result.vote.title}</h1>
          {result.vote.description && (
            <p className="mt-2 text-gray-600">{result.vote.description}</p>
          )}
          <div className="mt-4 text-sm text-gray-500">
            종료 시간: {new Date(result.vote.endAt).toLocaleString()}
            {result.vote.isEnded && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-red-800">
                종료됨
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
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
                {option.voters && option.voters.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    <div className="font-medium">참여자:</div>
                    <div className="mt-1">
                      {option.voters.map((voter, idx) => (
                        <span key={voter.id}>
                          {voter.name}
                          {idx < option.voters!.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

