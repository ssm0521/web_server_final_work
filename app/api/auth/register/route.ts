import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { z } from "zod"
import { logUserAction } from "@/lib/audit"

const registerSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  studentNumber: z.string().optional(),
  role: z.enum(["STUDENT", "INSTRUCTOR"]).default("STUDENT"), 
}).refine((data) => {
  // STUDENT 역할일 때만 학번이 필수
  if (data.role === "STUDENT" && (!data.studentNumber || data.studentNumber.trim() === "")) {
    return false
  }
  return true
}, {
  message: "학생은 학번을 입력해야 합니다",
  path: ["studentNumber"],
})

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [인증]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: 홍길동
 *               role:
 *                 type: string
 *                 enum: [STUDENT, INSTRUCTOR]
 *                 default: STUDENT
 *                 example: STUDENT
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 회원가입이 완료되었습니다
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // 회원가입은 항상 STUDENT 역할로만 가능
    if (body.role && body.role !== "STUDENT") {
      return NextResponse.json(
        { error: "회원가입은 학생으로만 가능합니다. 교원 및 관리자 계정은 시스템 관리자에게 문의하세요." },
        { status: 403 }
      )
    }
    const validatedData = registerSchema.parse({
      ...body,
      role: "STUDENT", // 강제로 STUDENT로 설정
    })

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다" },
        { status: 400 }
      )
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // STUDENT 역할일 때만 학번 중복 확인
    if (validatedData.role === "STUDENT" && validatedData.studentNumber) {
      const existingUser = await prisma.user.findFirst({
        where: {
          studentNumber: validatedData.studentNumber,
        },
      })
      if (existingUser) {
        return NextResponse.json(
          { error: "이미 사용 중인 학번입니다" },
          { status: 400 }
        )
      }
    }

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        studentNumber: validatedData.studentNumber || null,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // 감사 로그 기록
    await logUserAction("CREATE", user.id, user.id, null, {
      email: user.email,
      name: user.name,
      role: user.role,
    }, request)

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다",
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("회원가입 오류:", error)
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


