import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * @swagger
 * /api/enrollments/upload:
 *   post:
 *     summary: 엑셀/CSV 파일로 수강신청 일괄 등록
 *     tags: [Enrollment]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 엑셀(.xlsx, .xls) 또는 CSV 파일
 *     responses:
 *       200:
 *         description: 업로드 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: number
 *                   description: 성공한 건수
 *                 failed:
 *                   type: number
 *                   description: 실패한 건수
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: 잘못된 요청 (파일 형식 오류 등)
 *       401:
 *         description: 인증되지 않음
 *       403:
 *         description: 권한 없음 (관리자만 가능)
 *       500:
 *         description: 서버 오류
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 관리자만 업로드 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "관리자만 업로드할 수 있습니다" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 })
    }

    // 파일 읽기
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    let rows: any[] = []

    // 파일 형식에 따라 파싱
    try {
      if (fileName.endsWith(".csv")) {
        // CSV 파싱 (동적 import)
        const { parse } = await import("csv-parse/sync")
        const text = buffer.toString("utf-8")
        rows = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // 엑셀 파싱 (동적 import)
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        rows = XLSX.utils.sheet_to_json(worksheet)
      } else {
        return NextResponse.json(
          { error: "지원하지 않는 파일 형식입니다 (.xlsx, .xls, .csv만 가능)" },
          { status: 400 }
        )
      }
    } catch (parseError: any) {
      console.error("파일 파싱 오류:", parseError)
      return NextResponse.json(
        { error: `파일 파싱 중 오류가 발생했습니다: ${parseError.message}` },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "파일에 데이터가 없습니다" }, { status: 400 })
    }

    console.log(`파일 파싱 완료: ${rows.length}개 행 발견`)
    console.log("첫 번째 행 샘플:", rows[0])
    console.log("첫 번째 행의 모든 키:", Object.keys(rows[0] || {}))

    // 컬럼명 정규화 함수
    const normalizeKey = (key: string): string => {
      if (!key) return ""
      return key.toString().toLowerCase().trim().replace(/\s+/g, "_")
    }

    // 데이터 처리
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // 컬럼명 정규화된 객체 생성
        const normalizedRow: any = {}
        for (const key in row) {
          normalizedRow[normalizeKey(key)] = row[key]
        }

        // user_email 또는 user_id로 사용자 찾기
        let user
        const userEmail = normalizedRow.user_email || normalizedRow.email
        const userId = normalizedRow.user_id || normalizedRow.id

        if (userEmail) {
          user = await prisma.user.findUnique({
            where: { email: userEmail.toString().trim() },
          })
        } else if (userId) {
          user = await prisma.user.findUnique({
            where: { id: userId.toString().trim() },
          })
        } else {
          errors.push(`행 ${i + 2}: user_email 또는 user_id가 필요합니다`)
          failedCount++
          continue
        }

        if (!user) {
          errors.push(`행 ${i + 2}: 사용자를 찾을 수 없습니다 (${userEmail || userId})`)
          failedCount++
          continue
        }

        if (user.role !== "STUDENT") {
          errors.push(`행 ${i + 2}: 학생만 수강신청할 수 있습니다 (${user.email})`)
          failedCount++
          continue
        }

        // course_id 또는 course_code + course_section으로 강의 찾기
        let course
        const courseId = normalizedRow.course_id
        const courseCode = normalizedRow.course_code || normalizedRow.code
        const courseSection = normalizedRow.course_section || normalizedRow.section
        const semesterId = normalizedRow.semester_id || normalizedRow.semester

        if (courseId) {
          course = await prisma.course.findUnique({
            where: { id: courseId.toString().trim() },
          })
        } else if (courseCode && courseSection) {
          const code = courseCode.toString().trim()
          const sectionInput = courseSection.toString().trim()
          
          console.log(`행 ${i + 2}: 강의 찾기 시도 - code: "${code}", section 입력값: "${sectionInput}"`)

          // code로 모든 강의를 찾아서 section을 유연하게 비교
          const allCoursesWithCode = await prisma.course.findMany({
            where: {
              code: code,
            },
            include: {
              semester: true,
            },
          })

          console.log(`행 ${i + 2}: code="${code}"로 찾은 모든 강의:`, allCoursesWithCode.map(c => ({ id: c.id, code: c.code, section: c.section, semesterId: c.semesterId })))

          // section을 숫자로 변환하여 비교 (앞의 0 무시)
          let candidates = allCoursesWithCode.filter((c) => {
            const dbSectionNum = parseInt(c.section, 10)
            const inputSectionNum = parseInt(sectionInput, 10)
            
            // 정확히 일치하는 경우
            if (c.section === sectionInput) {
              console.log(`행 ${i + 2}: 정확 일치 - DB section: "${c.section}", 입력: "${sectionInput}"`)
              return true
            }
            
            // 숫자로 변환했을 때 일치하는 경우
            if (!isNaN(dbSectionNum) && !isNaN(inputSectionNum) && dbSectionNum === inputSectionNum) {
              console.log(`행 ${i + 2}: 숫자 일치 - DB section: "${c.section}" (${dbSectionNum}), 입력: "${sectionInput}" (${inputSectionNum})`)
              return true
            }
            
            return false
          })

          console.log(`행 ${i + 2}: section 필터링 후 후보:`, candidates.map(c => ({ id: c.id, code: c.code, section: c.section, semesterId: c.semesterId })))

          // 학기 정보가 있으면 필터링
          if (semesterId && candidates.length > 0) {
            const beforeCount = candidates.length
            candidates = candidates.filter((c) => c.semesterId === semesterId.toString().trim())
            console.log(`행 ${i + 2}: semesterId 필터링 - ${beforeCount}개 -> ${candidates.length}개`)
          } else if (!semesterId && candidates.length > 0) {
            // 학기 정보가 없으면 가장 최근 학기의 강의를 우선 선택하되, 없으면 다른 학기 강의도 허용
            const recentSemester = await prisma.semester.findFirst({
              orderBy: [
                { year: "desc" },
                { term: "desc" },
              ],
            })
            
            if (recentSemester) {
              // 최근 학기 강의가 있으면 우선 선택, 없으면 다른 학기 강의도 허용
              const recentSemesterCourses = candidates.filter((c) => c.semesterId === recentSemester.id)
              if (recentSemesterCourses.length > 0) {
                candidates = recentSemesterCourses
                console.log(`행 ${i + 2}: 최근 학기 강의 선택 (${recentSemester.id}) - ${candidates.length}개`)
              } else {
                // 최근 학기 강의가 없으면 첫 번째 강의 선택 (모든 학기 허용)
                console.log(`행 ${i + 2}: 최근 학기 강의 없음, 첫 번째 강의 선택 (모든 학기 허용)`)
              }
            }
          }

          course = candidates.length > 0 ? candidates[0] : null

          // 강의를 찾지 못했을 때 디버깅 정보
          if (!course) {
            console.log(`행 ${i + 2}: 강의를 찾지 못함 - code: "${code}", section: "${sectionInput}"`)
            console.log(`행 ${i + 2}: 최종 후보 강의 수: ${candidates.length}`)
          } else {
            console.log(`행 ${i + 2}: 강의 찾음 - id: ${course.id}, code: ${course.code}, section: ${course.section}`)
          }
        } else {
          errors.push(
            `행 ${i + 2}: course_id 또는 (course_code + course_section)이 필요합니다. 현재 값: code="${courseCode}", section="${courseSection}"`
          )
          failedCount++
          continue
        }

        if (!course) {
          errors.push(
            `행 ${i + 2}: 강의를 찾을 수 없습니다 (code: "${courseCode}", section: "${courseSection}")`
          )
          failedCount++
          continue
        }

        // 이미 수강신청했는지 확인
        const existing = await prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id,
            },
          },
        })

        if (existing) {
          // 이미 있으면 스킵 (성공으로 카운트)
          successCount++
          continue
        }

        // 수강신청 생성
        try {
          await prisma.enrollment.create({
            data: {
              userId: user.id,
              courseId: course.id,
            },
          })
          successCount++
        } catch (enrollError: any) {
          console.error(`행 ${i + 2} 수강신청 생성 오류:`, enrollError)
          errors.push(`행 ${i + 2}: 수강신청 생성 실패 - ${enrollError.message || "알 수 없는 오류"}`)
          failedCount++
        }
      } catch (err: any) {
        errors.push(`행 ${i + 2}: ${err.message || "알 수 없는 오류"}`)
        failedCount++
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors: errors.slice(0, 10), // 최대 10개 오류만 반환
    })
  } catch (error) {
    console.error("수강신청 업로드 오류:", error)
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

