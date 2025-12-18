/**
 * 테스트 데이터 생성 스크립트
 * 사용법: npx tsx scripts/seed.ts
 */

import { PrismaClient, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ✅ 시스템 기본 설정 (JSON으로 저장)
const DEFAULT_SETTINGS = {
  defaultMaxAbsent: 3,
  defaultLateToAbsent: 3,
  maxFileSize: 10485760, // 10MB
  allowedFileTypes:
    "image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  enableNotifications: true,
  notificationRetentionDays: 90,
  sessionTimeoutMinutes: 30,
  attendanceCodeLength: 4,
  siteName: "학교 출석 관리 시스템",
  siteDescription: "스마트한 출석 관리를 위한 시스템",
  maintenanceMode: false,
}

async function main() {
  console.log("테스트 데이터 생성 시작...")

  // 1. 관리자 계정 생성
  const adminPassword = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      password: adminPassword,
      name: "관리자",
      role: UserRole.ADMIN,
    },
  })
  console.log("✅ 관리자 계정 생성:", admin.email)

  // 2. 교원 계정 생성
  const instructorPassword = await bcrypt.hash("instructor123", 10)
  const instructor = await prisma.user.upsert({
    where: { email: "instructor@test.com" },
    update: {},
    create: {
      email: "instructor@test.com",
      password: instructorPassword,
      name: "교원",
      role: UserRole.INSTRUCTOR,
    },
  })
  console.log("✅ 교원 계정 생성:", instructor.email)

  // 3. 학생 계정 생성
  const studentPassword = await bcrypt.hash("student123", 10)

  const students = await Promise.all(
    ["student1", "student2", "student3"].map((name, idx) =>
      prisma.user.upsert({
        where: { email: `${name}@test.com` },
        update: {},
        create: {
          email: `${name}@test.com`,
          password: studentPassword,
          name: `학생${idx + 1}`,
          role: UserRole.STUDENT,
        },
      })
    )
  )
  console.log("✅ 학생 계정 생성:", students.map((s) => s.email).join(", "))

  // 4. 학기 생성 (복합 unique: year + term)
  const semester = await prisma.semester.upsert({
    where: {
      year_term: {
        year: 2025,
        term: 2,
      },
    },
    update: {},
    create: {
      name: "2025년 2학기",
      year: 2025,
      term: 2,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-20"),
    },
  })
  console.log("✅ 학기 생성:", semester.name)

  // 5. 학과 생성
  const department = await prisma.department.upsert({
    where: { code: "CS" },
    update: {},
    create: {
      name: "컴퓨터공학과",
      code: "CS",
    },
  })
  console.log("✅ 학과 생성:", department.name)

  // 6. 강의 생성 (복합 unique)
  const course = await prisma.course.upsert({
    where: {
      code_section_semesterId: {
        code: "CS301",
        section: "01",
        semesterId: semester.id,
      },
    },
    update: {},
    create: {
      title: "웹서버프로그래밍",
      code: "CS301",
      section: "01",
      instructorId: instructor.id,
      semesterId: semester.id,
      departmentId: department.id,
      description: "웹 서버 프로그래밍 기초 및 실습",
    },
  })
  console.log("✅ 강의 생성:", course.title)

  // 7. 수강생 등록 (students는 배열이라 map으로 처리)
  await prisma.enrollment.createMany({
    data: students.map((s) => ({
      courseId: course.id,
      userId: s.id,
    })),
    skipDuplicates: true, // (courseId,userId) 유니크/복합키가 있으면 중복 자동 스킵
  })
  console.log("✅ 수강생 등록 완료")

  // 8. 출석 정책 설정
  await prisma.attendancePolicy.upsert({
    where: { courseId: course.id },
    update: {},
    create: {
      courseId: course.id,
      maxAbsent: 3,
      lateToAbsent: 3,
    },
  })
  console.log("✅ 출석 정책 설정")

  // 9. 시스템 설정 초기화 (JSON value)
  const existingSettings = await prisma.systemSettings.findUnique({
    where: { id: "system" },
  })

  if (!existingSettings) {
    await prisma.systemSettings.upsert({
  where: { key: "system" },
  update: {},
  create: {
    key: "system",
    value: DEFAULT_SETTINGS,
  },
})
    console.log("✅ 시스템 설정 초기화")
  } else {
    console.log("✅ 시스템 설정 이미 존재")
  }

  console.log("\n🎉 테스트 데이터 생성 완료!")
  console.log("\n로그인 정보:")
  console.log("관리자: admin@test.com / admin123")
  console.log("교원: instructor@test.com / instructor123")
  console.log("학생1: student1@test.com / student123")
  console.log("학생2: student2@test.com / student123")
  console.log("학생3: student3@test.com / student123")
}

main()
  .catch((e) => {
    console.error("오류 발생:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
