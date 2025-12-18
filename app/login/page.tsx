"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  // 회원가입 성공 메시지 표시
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccess("회원가입이 완료되었습니다. 로그인해주세요.")
    }
  }, [searchParams])

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (session) {
      const role = session.user?.role
      if (role === "ADMIN") {
        router.push("/admin")
      } else if (role === "INSTRUCTOR") {
        router.push("/instructor")
      } else if (role === "STUDENT") {
        router.push("/student")
      }
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.")
        setLoading(false)
        return
      }

      // 성공 시 대시보드로 리다이렉트 (middleware에서 처리)
      router.refresh()
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            학교 출석 관리 시스템
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {success && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="이메일을 입력하세요"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                회원가입
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

