"use client"

import dynamic from "next/dynamic"
import "swagger-ui-react/swagger-ui.css"

// Swagger UI는 클라이언트 컴포넌트로만 사용
const SwaggerUI: any = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
})

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUI url="/api/swagger.json" />
    </div>
  )
}
