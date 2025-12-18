import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getUploadDir } from "@/lib/utils"
import { z } from "zod"
import path from "path"
import fs from "fs"
import { writeFile } from "fs/promises"

const acceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const maxSize = 10 * 1024 * 1024 // 10MB

const schema = z.object({
  reason: z.string().min(1),
  reasonCode: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "학생만 공결 신청 가능합니다" },
        { status: 403 }
      )
    }

    const sessionId = params.id
    const studentId = session.user.id

    // 중복 확인
    const exist = await prisma.excuseRequest.findFirst({
      where: {
        sessionId,
        studentId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    })
    if (exist) {
      return NextResponse.json(
        { error: "이미 신청한 공결(대기 또는 승인)이 존재합니다." },
        { status: 400 }
      )
    }

    // formData 파싱
    const formData = await request.formData()
    const reason = formData.get("reason") as string
    const reasonCode = formData.get("reasonCode") as string | null
    const files = formData.getAll("files") as File[]

    // 스키마 검증
    const parsed = schema.parse({
      reason,
      reasonCode: reasonCode || undefined,
    })

    // 파일 저장 및 URL 생성
    const fileUrls: string[] = []
    const uploadDir = getUploadDir()

    for (const file of files) {
      if (!file || !(file instanceof File)) continue

      // 파일 타입 검증
      if (!acceptedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `허용되지 않는 파일 형식입니다: ${file.type}` },
          { status: 400 }
        )
      }

      // 파일 크기 검증
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `파일 크기가 너무 큽니다: ${file.name}` },
          { status: 400 }
        )
      }

      // 파일 저장
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9)
      const filename = unique + "-" + file.name
      const filepath = path.join(uploadDir, filename)

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      await writeFile(filepath, buffer)

      fileUrls.push("/uploads/" + filename)
    }

    // 공결 신청 생성
    const excuse = await prisma.excuseRequest.create({
      data: {
        sessionId,
        studentId,
        reason: parsed.reason,
        reasonCode: parsed.reasonCode || null,
        files: fileUrls.length > 0 ? fileUrls : null,
        status: "PENDING",
      },
    })

    return NextResponse.json(excuse, { status: 201 })
  } catch (error: any) {
    console.error("공결 신청 오류:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || "공결 신청 중 오류 발생" },
      { status: 400 }
    )
  }
}
