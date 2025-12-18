import { swaggerSpec } from "@/lib/swagger"
import { NextResponse } from "next/server"

// Swagger JSON 스펙 제공
export async function GET() {
  return NextResponse.json(swaggerSpec)
}

