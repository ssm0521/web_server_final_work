import { isHoliday, getHolidaysInRange, HOLIDAYS_2025 } from "./holiday"

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0: 일요일, 1: 월요일, ..., 6: 토요일

export interface RecurringRule {
  daysOfWeek: DayOfWeek[] // 예: [1, 3] = 월요일, 수요일
  startDate: Date
  endDate: Date
  startTime: string // HH:mm 형식
  endTime: string // HH:mm 형식
  excludeHolidays: boolean // 공휴일 제외 여부
  room?: string
  attendanceMethod: "ELECTRONIC" | "CODE" | "ROLL_CALL"
}

export interface GeneratedSession {
  week: number
  date: Date
  startAt: Date
  endAt: Date
  room?: string
  attendanceMethod: "ELECTRONIC" | "CODE" | "ROLL_CALL"
  isHoliday: boolean
  holidayName?: string
}

/**
 * 반복 규칙에 따라 세션 일정 생성
 */
export function generateSessions(
  rule: RecurringRule,
  semesterStartDate: Date,
  semesterEndDate: Date,
  makeUpDates?: Date[] // 보강일 목록
): GeneratedSession[] {
  const sessions: GeneratedSession[] = []
  let week = 1
  const currentDate = new Date(rule.startDate)

  // 학기 시작일과 종료일 범위로 제한
  const actualStartDate =
    currentDate > semesterStartDate ? currentDate : semesterStartDate
  const actualEndDate = rule.endDate < semesterEndDate ? rule.endDate : semesterEndDate

  // 보강일을 Set으로 변환하여 빠른 조회
  const makeUpDateSet = new Set(
    (makeUpDates || []).map((date) => date.toISOString().split("T")[0])
  )

  // 주차별로 처리
  while (currentDate <= actualEndDate) {
    // 해당 주차의 각 요일 확인
    for (const dayOfWeek of rule.daysOfWeek) {
      // 해당 주의 해당 요일 찾기
      const dayDate = getDateForDayOfWeek(currentDate, dayOfWeek)

      if (dayDate < actualStartDate || dayDate > actualEndDate) {
        continue
      }

      // 공휴일 확인
      const holiday = isHoliday(dayDate)
      const holidayName = holiday ? getHolidayName(dayDate) : undefined

      // 공휴일 제외 옵션이 켜져있고 공휴일이면 스킵
      if (rule.excludeHolidays && holiday) {
        continue
      }

      // 보강일인지 확인
      const isMakeUp = makeUpDateSet.has(dayDate.toISOString().split("T")[0])

      // 시간 설정
      const [startHour, startMinute] = rule.startTime.split(":").map(Number)
      const [endHour, endMinute] = rule.endTime.split(":").map(Number)

      const startAt = new Date(dayDate)
      startAt.setHours(startHour, startMinute, 0, 0)

      const endAt = new Date(dayDate)
      endAt.setHours(endHour, endMinute, 0, 0)

      sessions.push({
        week,
        date: new Date(dayDate),
        startAt,
        endAt,
        room: rule.room,
        attendanceMethod: rule.attendanceMethod,
        isHoliday: holiday,
        holidayName,
      })
    }

    // 다음 주로 이동
    currentDate.setDate(currentDate.getDate() + 7)
    week++
  }

  // 보강일 추가
  if (makeUpDates) {
    for (const makeUpDate of makeUpDates) {
      if (makeUpDate >= actualStartDate && makeUpDate <= actualEndDate) {
        const [startHour, startMinute] = rule.startTime.split(":").map(Number)
        const [endHour, endMinute] = rule.endTime.split(":").map(Number)

        const startAt = new Date(makeUpDate)
        startAt.setHours(startHour, startMinute, 0, 0)

        const endAt = new Date(makeUpDate)
        endAt.setHours(endHour, endMinute, 0, 0)

        sessions.push({
          week: week++, // 보강일은 별도 주차로 처리
          date: new Date(makeUpDate),
          startAt,
          endAt,
          room: rule.room,
          attendanceMethod: rule.attendanceMethod,
          isHoliday: false,
        })
      }
    }
  }

  // 날짜순으로 정렬
  sessions.sort((a, b) => a.date.getTime() - b.date.getTime())

  // 주차 재계산 (날짜순 정렬 후)
  const weekMap = new Map<number, number>()
  let currentWeek = 1
  for (const session of sessions) {
    const weekKey = Math.floor(
      (session.date.getTime() - actualStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, currentWeek++)
    }
    session.week = weekMap.get(weekKey)!
  }

  return sessions
}

/**
 * 특정 날짜가 속한 주의 특정 요일 날짜 반환
 */
function getDateForDayOfWeek(date: Date, dayOfWeek: DayOfWeek): Date {
  const result = new Date(date)
  const currentDay = date.getDay()
  const diff = dayOfWeek - currentDay
  result.setDate(date.getDate() + diff)
  return result
}

/**
 * 공휴일 이름 반환
 */
function getHolidayName(date: Date): string | undefined {
  const dateStr = date.toISOString().split("T")[0]
  return HOLIDAYS_2025.find((h) => h.date === dateStr)?.name
}

