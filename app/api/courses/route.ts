import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { logCourseAction } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


const courseSchema = z.object({
  title: z.string().min(1, "강의명을 입력하세요"),
  code: z.string().min(1, "과목 코드를 입력하세요"),
  section: z.string().min(1, "분반을 입력하세요"),
  instructorId: z.string().min(1, "담당교수를 선택하세요"), // 관리자가 선택
  semesterId: z.string().min(1, "학기를 선택하세요"),
  departmentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: 강의 목록 조회
 *     tags: [강의]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: instructorId
 *         schema:
 *           type: string
 *         description: 교원 ID (관리자만 사용 가능)
 *       - in: query
 *         name: semesterId
 *         schema:
 *           type: string
 *         description: 학기 ID
 *     responses:
 *       200:
 *         description: 강의 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       401:
 *         description: 인증 필요
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 강의 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instructorId = searchParams.get("instructorId")
    const semesterId = searchParams.get("semesterId")
    const role = session.user.role

    // 필터 조건 구성
    const where: any = {}
    
    // 교원은 자신의 강의만, 관리자는 모든 강의
    if (role === "INSTRUCTOR") {
      where.instructorId = session.user.id
    } else if (instructorId && role === "ADMIN") {
      where.instructorId = instructorId
    }

    if (semesterId) {
      where.semesterId = semesterId
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
            year: true,
            term: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: [
        { semester: { year: "desc" } },
        { semester: { term: "desc" } },
        { code: "asc" },
      ],
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error("강의 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "강의 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: 강의 생성
 *     tags: [강의]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - code
 *               - section
 *               - semesterId
 *             properties:
 *               title:
 *                 type: string
 *                 example: 데이터베이스 시스템
 *               code:
 *                 type: string
 *                 example: CS301
 *               section:
 *                 type: string
 *                 example: 01
 *               semesterId:
 *                 type: string
 *                 example: clx1234567890
 *               departmentId:
 *                 type: string
 *                 nullable: true
 *                 example: clx1234567890
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: 데이터베이스 시스템 강의입니다
 *     responses:
 *       201:
 *         description: 강의 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: 잘못된 요청
 *       403:
 *         description: 권한 없음
 *       500:
 *         description: 서버 오류
 */
// 강의 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 관리자만 강의 생성 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 교과목을 개설할 수 있습니다" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = courseSchema.parse(body)

    // 관리자는 body에서 받은 instructorId 사용 (필수)
    if (!validatedData.instructorId) {
      return NextResponse.json({ error: "담당교수를 선택하세요" }, { status: 400 })
    }

    const instructorId = validatedData.instructorId

    // 교수 존재 확인
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
    })

    if (!instructor || instructor.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "유효한 교수를 선택하세요" }, { status: 400 })
    }

    // 학기 존재 확인
    const semester = await prisma.semester.findUnique({
      where: { id: validatedData.semesterId },
    })

    if (!semester) {
      return NextResponse.json({ error: "학기를 찾을 수 없습니다" }, { status: 404 })
    }

    // 학과 존재 확인 (있는 경우)
    if (validatedData.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: validatedData.departmentId },
      })

      if (!department) {
        return NextResponse.json({ error: "학과를 찾을 수 없습니다" }, { status: 404 })
      }
    }

    // 중복 확인 (과목코드 + 분반 + 학기)
    const existing = await prisma.course.findUnique({
      where: {
        code_section_semesterId: {
          code: validatedData.code,
          section: validatedData.section,
          semesterId: validatedData.semesterId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "이미 존재하는 강의입니다 (과목코드 + 분반 + 학기)" },
        { status: 400 }
      )
    }

    const course = await prisma.course.create({
      data: {
        title: validatedData.title,
        code: validatedData.code,
        section: validatedData.section,
        instructorId,
        semesterId: validatedData.semesterId,
        departmentId: validatedData.departmentId || null,
        description: validatedData.description || null,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // 감사 로그 기록
    await logCourseAction("CREATE", session.user.id, course.id, null, {
      title: course.title,
      code: course.code,
      section: course.section,
      instructorId: course.instructorId,
    }, request)

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("강의 생성 오류:", error)
    return NextResponse.json(
      { error: "강의 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


