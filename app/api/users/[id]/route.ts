import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { logUserAction } from "@/lib/audit"

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다").optional(),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다").optional(),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]).optional(),
})

// 사용자 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 관리자만 다른 사용자 정보 조회 가능
    if (session.user.role !== "ADMIN" && session.user.id !== params.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            instructorCourses: true,
            enrollments: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("사용자 조회 오류:", error)
    return NextResponse.json(
      { error: "사용자를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 사용자 수정 (관리자만)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 사용자 수정 가능합니다" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // 수정할 데이터 구성
    const updateData: any = {}
    if (validatedData.name) {
      updateData.name = validatedData.name
    }
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }
    if (validatedData.role) {
      updateData.role = validatedData.role as UserRole
    }

    // 변경 전 값 저장
    const oldValue = {
      name: user.name,
      role: user.role,
    }

    // 사용자 수정
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    })

    // 감사 로그 기록
    const action = validatedData.role && validatedData.role !== user.role ? "ROLE_CHANGE" : "UPDATE"
    await logUserAction(
      action,
      session.user.id,
      params.id,
      oldValue,
      {
        name: updated.name,
        role: updated.role,
        passwordChanged: !!validatedData.password,
      },
      request
    )

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("사용자 수정 오류:", error)
    return NextResponse.json(
      { error: "사용자 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 사용자 삭제 (관리자만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 사용자 삭제 가능합니다" }, { status: 403 })
    }

    // 자기 자신은 삭제 불가
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "자기 자신은 삭제할 수 없습니다" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
    }

    // 사용자 삭제
    await prisma.user.delete({
      where: { id: params.id },
    })

    // 감사 로그 기록
    await logUserAction(
      "DELETE",
      session.user.id,
      params.id,
      {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      null,
      request
    )

    return NextResponse.json({ message: "사용자가 삭제되었습니다" })
  } catch (error) {
    console.error("사용자 삭제 오류:", error)
    return NextResponse.json(
      { error: "사용자 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

