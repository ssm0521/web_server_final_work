import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { logUserAction } from "@/lib/audit"

const createUserSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]),
})

const updateUserSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다").optional(),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다").optional(),
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]).optional(),
})

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 사용자 목록 조회
 *     tags: [사용자 관리]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [ADMIN, INSTRUCTOR, STUDENT]
 *         description: 역할 필터
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 이름 또는 이메일 검색
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 페이지당 항목 수
 *     responses:
 *       200:
 *         description: 사용자 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 */
// 사용자 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 조회 가능합니다" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    // 필터 조건 구성
    const where: any = {}

    if (role) {
      where.role = role as UserRole
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    // 사용자 목록 조회
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "사용자 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 사용자 생성
 *     tags: [사용자 관리]
 *     security:
 *       - cookieAuth: []
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
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: 관리자
 *               role:
 *                 type: string
 *                 enum: [ADMIN, INSTRUCTOR, STUDENT]
 *                 example: ADMIN
 *     responses:
 *       201:
 *         description: 사용자 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 잘못된 요청 (이메일 중복 등)
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 */
// 사용자 생성 (관리자만)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 사용자 생성 가능합니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

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

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // 감사 로그 기록
    await logUserAction(
      "CREATE",
      session.user.id,
      user.id,
      null,
      {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      request
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("사용자 생성 오류:", error)
    return NextResponse.json(
      { error: "사용자 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

