/**
 * 한국 공휴일 데이터 (2025년 기준)
 * 실제 운영 시에는 외부 API나 데이터베이스에서 가져와야 함
 */

export interface Holiday {
  date: string // YYYY-MM-DD 형식
  name: string
  isNational: boolean // 법정공휴일 여부
}

// 2025년 한국 공휴일 목록
export const HOLIDAYS_2025: Holiday[] = [
  { date: "2025-01-01", name: "신정", isNational: true },
  { date: "2025-01-28", name: "설날 연휴", isNational: true },
  { date: "2025-01-29", name: "설날", isNational: true },
  { date: "2025-01-30", name: "설날 연휴", isNational: true },
  { date: "2025-03-01", name: "삼일절", isNational: true },
  { date: "2025-05-05", name: "어린이날", isNational: true },
  { date: "2025-05-06", name: "어린이날 대체공휴일", isNational: true },
  { date: "2025-06-06", name: "현충일", isNational: true },
  { date: "2025-08-15", name: "광복절", isNational: true },
  { date: "2025-10-03", name: "개천절", isNational: true },
  { date: "2025-10-09", name: "한글날", isNational: true },
  { date: "2025-12-25", name: "크리스마스", isNational: true },
]

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split("T")[0]
  return HOLIDAYS_2025.some((holiday) => holiday.date === dateStr)
}

/**
 * 특정 날짜의 공휴일 정보 반환
 */
export function getHoliday(date: Date): Holiday | null {
  const dateStr = date.toISOString().split("T")[0]
  return HOLIDAYS_2025.find((holiday) => holiday.date === dateStr) || null
}

/**
 * 날짜 범위 내의 모든 공휴일 반환
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  return HOLIDAYS_2025.filter((holiday) => {
    const holidayDate = new Date(holiday.date)
    return holidayDate >= startDate && holidayDate <= endDate
  })
}

