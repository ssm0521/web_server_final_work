import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { AttendanceMethod } from "@prisma/client"
import { generateSessions, RecurringRule } from "@/lib/schedule-generator"

const sessionSchema = z.object({
  week: z.number().int().min(1).optional(),
  startAt: z
    .string()
    .refine(
      (val) => {
        if (!val) return true // optional이므로 빈 값은 허용
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: "올바른 날짜 형식이 아닙니다" }
    )
    .optional(),
  endAt: z
    .string()
    .refine(
      (val) => {
        if (!val) return true // optional이므로 빈 값은 허용
        const date = new Date(val)
        return !isNaN(date.getTime())
      },
      { message: "올바른 날짜 형식이 아닙니다" }
    )
    .optional(),
  room: z.string().optional().nullable(),
  attendanceMethod: z.enum(["ELECTRONIC", "CODE", "ROLL_CALL"]),
})

const recurringSessionSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)), // 0: 일요일, 1: 월요일, ..., 6: 토요일
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm 형식
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  excludeHolidays: z.boolean().default(true),
  room: z.string().optional().nullable(),
  attendanceMethod: z.enum(["ELECTRONIC", "CODE", "ROLL_CALL"]),
  makeUpDates: z.array(z.string().datetime()).optional(), // 보강일 목록
})

// 수업 세션 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만, 관리자는 모든 강의 조회 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const sessions = await prisma.classSession.findMany({
      where: { courseId: params.id },
      include: {
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: { week: "asc" },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error("수업 세션 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "수업 세션 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// 수업 세션 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 교원은 자신의 강의만, 관리자는 모든 강의 생성 가능
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    const body = await request.json()
    console.log("세션 생성 요청:", JSON.stringify(body, null, 2))

    // 반복 규칙으로 생성하는지 확인
    if (body.daysOfWeek && Array.isArray(body.daysOfWeek)) {
      // 반복 규칙으로 생성
      try {
        const validatedData = recurringSessionSchema.parse(body)
        console.log("검증된 데이터:", validatedData)

      const rule: RecurringRule = {
        daysOfWeek: validatedData.daysOfWeek as any,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        excludeHolidays: validatedData.excludeHolidays,
        room: validatedData.room || undefined,
        attendanceMethod: validatedData.attendanceMethod,
      }

      const makeUpDates = validatedData.makeUpDates
        ? validatedData.makeUpDates.map((d) => new Date(d))
        : undefined

      // 학기 정보 가져오기
      const courseWithSemester = await prisma.course.findUnique({
        where: { id: params.id },
        include: { semester: true },
      })

      if (!courseWithSemester) {
        return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
      }

      if (!courseWithSemester.semester) {
        return NextResponse.json(
          { error: "강의에 연결된 학기 정보가 없습니다. 학기를 먼저 설정해주세요." },
          { status: 400 }
        )
      }

      // 세션 일정 생성
      const generatedSessions = generateSessions(
        rule,
        courseWithSemester.semester.startDate,
        courseWithSemester.semester.endDate,
        makeUpDates
      )

      if (generatedSessions.length === 0) {
        return NextResponse.json(
          { error: "생성할 세션이 없습니다. 날짜 범위, 요일, 공휴일 설정을 확인하세요." },
          { status: 400 }
        )
      }

      // 기존 세션과 중복 확인
      const existingSessions = await prisma.classSession.findMany({
        where: { courseId: params.id },
        select: { week: true, startAt: true },
      })

      const sessionsToCreate = generatedSessions.filter((genSession) => {
        return !existingSessions.some((existing) => {
          const existingDate = new Date(existing.startAt).toISOString().split("T")[0]
          const genDate = genSession.startAt.toISOString().split("T")[0]
          return existingDate === genDate
        })
      })

      if (sessionsToCreate.length === 0) {
        return NextResponse.json(
          { error: "생성할 새로운 세션이 없습니다 (모두 중복됨)" },
          { status: 400 }
        )
      }

      // 세션 일괄 생성
      const createdSessions = await Promise.all(
        sessionsToCreate.map(async (genSession) => {
          // 인증번호 생성 (CODE 방식인 경우)
          let attendanceCode: string | null = null
          if (genSession.attendanceMethod === "CODE") {
            attendanceCode = Math.floor(1000 + Math.random() * 9000).toString()
          }

          return prisma.classSession.create({
            data: {
              courseId: params.id,
              week: genSession.week,
              startAt: genSession.startAt,
              endAt: genSession.endAt,
              room: genSession.room || null,
              attendanceMethod: genSession.attendanceMethod as AttendanceMethod,
              attendanceCode,
            },
          })
        })
      )

      return NextResponse.json(
        {
          message: `${createdSessions.length}개의 세션이 생성되었습니다`,
          sessions: createdSessions,
          skipped: generatedSessions.length - createdSessions.length,
        },
        { status: 201 }
      )
      } catch (parseError) {
        console.error("반복 세션 생성 오류:", parseError)
        if (parseError instanceof z.ZodError) {
          const errorMessages = parseError.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
          console.error("검증 오류 상세:", errorMessages)
          return NextResponse.json(
            { error: `입력 데이터 오류: ${errorMessages.join(", ")}` },
            { status: 400 }
          )
        }
        throw parseError
      }
    } else {
      // 단일 세션 생성 (기존 로직)
      console.log("단일 세션 생성 시도")
      try {
        const validatedData = sessionSchema.parse(body)
        console.log("검증된 단일 세션 데이터:", validatedData)

        if (!validatedData.week || !validatedData.startAt || !validatedData.endAt) {
          return NextResponse.json(
            { error: "단일 세션 생성 시 week, startAt, endAt은 필수입니다" },
            { status: 400 }
          )
        }

        // 날짜 형식 검증 및 변환
        const startDate = new Date(validatedData.startAt)
        const endDate = new Date(validatedData.endAt)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: "올바른 날짜 형식이 아닙니다" },
            { status: 400 }
          )
        }

        if (startDate >= endDate) {
          return NextResponse.json(
            { error: "종료 시간은 시작 시간보다 이후여야 합니다" },
            { status: 400 }
          )
        }

        // 같은 주차 중복 확인
        const existing = await prisma.classSession.findFirst({
          where: {
            courseId: params.id,
            week: validatedData.week,
          },
        })

        if (existing) {
          return NextResponse.json(
            { error: `이미 ${validatedData.week}주차 세션이 존재합니다` },
            { status: 400 }
          )
        }

        // 인증번호 생성 (CODE 방식인 경우)
        let attendanceCode: string | null = null
        if (validatedData.attendanceMethod === "CODE") {
          attendanceCode = Math.floor(1000 + Math.random() * 9000).toString()
        }

        const classSession = await prisma.classSession.create({
          data: {
            courseId: params.id,
            week: validatedData.week,
            startAt: startDate,
            endAt: endDate,
            room: validatedData.room || null,
            attendanceMethod: validatedData.attendanceMethod as AttendanceMethod,
            attendanceCode,
          },
          include: {
            attendances: true,
          },
        })

        return NextResponse.json(classSession, { status: 201 })
      } catch (parseError) {
        console.error("단일 세션 생성 오류:", parseError)
        if (parseError instanceof z.ZodError) {
          const errorMessages = parseError.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
          console.error("검증 오류 상세:", errorMessages)
          return NextResponse.json(
            { error: `입력 데이터 오류: ${errorMessages.join(", ")}` },
            { status: 400 }
          )
        }
        throw parseError
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("수업 세션 생성 오류:", error)
    return NextResponse.json(
      { error: "수업 세션 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}


