"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Swagger UI는 클라이언트 컴포넌트로만 사용 가능
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false })
import "swagger-ui-react/swagger-ui.css"

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/swagger.json")
      .then((res) => res.json())
      .then((data) => {
        setSpec(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Swagger 스펙 로드 오류:", error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>API 문서를 불러오는 중...</p>
      </div>
    )
  }

  if (!spec) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">API 문서를 불러올 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI spec={spec} />
    </div>
  )
}

