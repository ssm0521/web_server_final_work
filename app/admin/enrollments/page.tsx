"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface EnrollmentData {
  userId: string
  courseId: string
  userEmail?: string
  courseCode?: string
  courseSection?: string
}

export default function EnrollmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("파일을 선택하세요")
      return
    }

    try {
      setLoading(true)
      setError("")
      setSuccess("")

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/enrollments/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "업로드에 실패했습니다")
      }

      const result = await response.json()
      setSuccess(
        `업로드 완료: ${result.success}건 성공, ${result.failed}건 실패${result.errors.length > 0 ? ` (오류: ${result.errors.join(", ")})` : ""}`
      )
      setFile(null)
      // 파일 input 초기화
      const fileInput = document.getElementById("file-input") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800">
            ← 관리자 대시보드로
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">수강신청 일괄 등록</h1>
          <p className="mt-2 text-gray-600">엑셀 파일로 수강신청을 일괄 등록할 수 있습니다</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-800">{success}</div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">엑셀 파일 업로드</h2>

          <div className="mb-6 rounded-md bg-blue-50 p-4">
            <h3 className="mb-2 font-medium text-blue-900">파일 형식 안내</h3>
            <p className="mb-2 text-sm text-blue-800">
              엑셀 파일(.xlsx, .xls) 또는 CSV 파일(.csv)을 업로드하세요.
            </p>
            <p className="mb-2 text-sm text-blue-800">필수 컬럼:</p>
            <ul className="ml-4 list-disc text-sm text-blue-800">
              <li>
                <strong>user_email</strong> 또는 <strong>user_id</strong>: 학생 이메일 또는 ID
              </li>
              <li>
                <strong>course_code</strong> + <strong>course_section</strong> 또는{" "}
                <strong>course_id</strong>: 강의 코드+분반 또는 강의 ID
              </li>
            </ul>
              <p className="mt-2 text-sm text-blue-800">
                예시: user_email=&quot;student@test.com&quot;, course_code=&quot;CS301&quot;, course_section=&quot;01&quot;
              </p>

          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="file-input" className="block text-sm font-medium text-gray-700">
                파일 선택
              </label>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "업로드 중..." : "업로드"}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">템플릿 다운로드</h2>
          <p className="mb-4 text-sm text-gray-600">
            아래 버튼을 클릭하여 엑셀 템플릿을 다운로드하세요.
          </p>
          <button
            onClick={() => {
              // CSV 템플릿 생성
              const csvContent =
                "user_email,course_code,course_section\nstudent1@test.com,CS301,01\nstudent2@test.com,CS301,01"
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
              const link = document.createElement("a")
              link.href = URL.createObjectURL(blob)
              link.download = "enrollment_template.csv"
              link.click()
            }}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            CSV 템플릿 다운로드
          </button>
        </div>
      </div>
    </div>
  )
}

