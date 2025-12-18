import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { AttendanceStatus } from "@prisma/client"

// 출석률 리포트
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week") // 특정 주차 (선택)

    // 강의 존재 확인
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        instructor: true,
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        sessions: {
          where: week ? { week: parseInt(week) } : undefined,
          include: {
            attendances: true,
          },
          orderBy: { week: "asc" },
        },
        policy: true,
      },
    })

    if (!course) {
      return NextResponse.json({ error: "강의를 찾을 수 없습니다" }, { status: 404 })
    }

    // 권한 확인
    if (session.user.role === "INSTRUCTOR" && course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
    }

    // 학생은 수강 중인 강의만 조회 가능
    if (session.user.role === "STUDENT") {
      const enrollment = course.enrollments.find((e) => e.userId === session.user.id)
      if (!enrollment) {
        return NextResponse.json({ error: "수강생이 아닙니다" }, { status: 403 })
      }
    }

    // 통계 계산
    const totalSessions = course.sessions.length
    const totalStudents = course.enrollments.length

    // 학생별 출석 통계
    const studentStats = course.enrollments.map((enrollment) => {
      const studentAttendances = course.sessions.flatMap((session) =>
        session.attendances.filter((a) => a.studentId === enrollment.userId)
      )

      const present = studentAttendances.filter((a) => a.status === "PRESENT").length
      const late = studentAttendances.filter((a) => a.status === "LATE").length
      const absent = studentAttendances.filter((a) => a.status === "ABSENT").length
      const excused = studentAttendances.filter((a) => a.status === "EXCUSED").length
      const pending = studentAttendances.filter((a) => a.status === "PENDING").length

      // 출석률 계산 (공결 포함)
      const attendanceRate =
        totalSessions > 0
          ? ((present + late + excused) / totalSessions) * 100
          : 0

      // 지각→결석 전환 (정책에 따라)
      const lateToAbsentCount = course.policy
        ? Math.floor(late / course.policy.lateToAbsent)
        : 0

      return {
        student: enrollment.user,
        present,
        late,
        absent: absent + lateToAbsentCount, // 지각 전환 포함
        excused,
        pending,
        total: totalSessions,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        lateToAbsentCount,
      }
    })

    // 전체 통계
    const overallStats = {
      totalSessions,
      totalStudents,
      averageAttendanceRate:
        studentStats.length > 0
          ? studentStats.reduce((sum, s) => sum + s.attendanceRate, 0) / studentStats.length
          : 0,
      totalPresent: studentStats.reduce((sum, s) => sum + s.present, 0),
      totalLate: studentStats.reduce((sum, s) => sum + s.late, 0),
      totalAbsent: studentStats.reduce((sum, s) => sum + s.absent, 0),
      totalExcused: studentStats.reduce((sum, s) => sum + s.excused, 0),
      lateToAbsentConversions: studentStats.reduce((sum, s) => sum + s.lateToAbsentCount, 0),
    }

    // 주차별 통계
    const weeklyStats = course.sessions.map((classSession) => {
      const sessionAttendances = classSession.attendances
      const present = sessionAttendances.filter((a) => a.status === "PRESENT").length
      const late = sessionAttendances.filter((a) => a.status === "LATE").length
      const absent = sessionAttendances.filter((a) => a.status === "ABSENT").length
      const excused = sessionAttendances.filter((a) => a.status === "EXCUSED").length
      const pending = sessionAttendances.filter((a) => a.status === "PENDING").length

      // 학생인 경우 자신의 출석 상태 포함
      let myAttendance: { status: string; checkedAt: string | null } | null = null
      if (session.user.role === "STUDENT") {
        const myAtt = sessionAttendances.find((a) => a.studentId === session.user.id)
        if (myAtt) {
          myAttendance = {
            status: myAtt.status,
            checkedAt: myAtt.checkedAt ? new Date(myAtt.checkedAt).toISOString() : null,
          }
        }
      }

      return {
        week: classSession.week,
        date: classSession.startAt,
        total: totalStudents,
        present,
        late,
        absent,
        excused,
        pending,
        attendanceRate:
          totalStudents > 0
            ? ((present + late + excused) / totalStudents) * 100
            : 0,
        myAttendance, // 학생인 경우만 포함
      }
    })

    // 학생인 경우 자신의 통계만 필터링
    const filteredStudentStats =
      session.user.role === "STUDENT"
        ? studentStats.filter((s) => s.student.id === session.user.id)
        : studentStats

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        code: course.code,
        section: course.section,
      },
      overall: overallStats,
      weekly: weeklyStats,
      students: filteredStudentStats,
      policy: course.policy,
      myStudentId: session.user.role === "STUDENT" ? session.user.id : null,
    })
  } catch (error) {
    console.error("출석률 리포트 조회 오류:", error)
    return NextResponse.json(
      { error: "출석률 리포트를 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

