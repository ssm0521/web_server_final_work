"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface AttendanceReport {
  course: {
    id: string
    title: string
    code: string
    section: string
  }
  overall: {
    totalSessions: number
    totalStudents: number
    averageAttendanceRate: number
    totalPresent: number
    totalLate: number
    totalAbsent: number
    totalExcused: number
    lateToAbsentConversions: number
  }
  weekly: Array<{
    week: number
    date: string
    total: number
    present: number
    late: number
    absent: number
    excused: number
    attendanceRate: number
  }>
  students: Array<{
    student: {
      id: string
      name: string
      email: string
    }
    present: number
    late: number
    absent: number
    excused: number
    total: number
    attendanceRate: number
    lateToAbsentCount: number
  }>
  policy: {
    maxAbsent: number
    lateToAbsent: number
  } | null
}

interface RiskReport {
  course: {
    id: string
    title: string
    code: string
    section: string
  }
  riskGroups: {
    danger: Array<{
      student: { id: string; name: string; email: string }
      totalAbsent: number
      consecutiveLate: number
      riskLevel: string
      riskReason: string[]
    }>
    warning: Array<{
      student: { id: string; name: string; email: string }
      totalAbsent: number
      consecutiveLate: number
      riskLevel: string
      riskReason: string[]
    }>
    normal: Array<{
      student: { id: string; name: string; email: string }
      totalAbsent: number
      consecutiveLate: number
      riskLevel: string
      riskReason: string[]
    }>
  }
  topAbsent: Array<{
    student: { id: string; name: string; email: string }
    totalAbsent: number
  }>
  topConsecutiveLate: Array<{
    student: { id: string; name: string; email: string }
    consecutiveLate: number
  }>
  summary: {
    total: number
    danger: number
    warning: number
    normal: number
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const [attendanceReport, setAttendanceReport] = useState<AttendanceReport | null>(null)
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null)
  const [excuseReport, setExcuseReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"attendance" | "risk" | "excuse">("attendance")

  useEffect(() => {
    if (courseId) {
      fetchReports()
    }
  }, [courseId])

  const fetchReports = async () => {
    try {
      const [attendanceRes, riskRes, excuseRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/reports/attendance`),
        fetch(`/api/courses/${courseId}/reports/risk`),
        fetch(`/api/excuses/reports?courseId=${courseId}`),
      ])

      if (!attendanceRes.ok || !riskRes.ok) {
        throw new Error("리포트를 불러올 수 없습니다")
      }

      const attendanceData = await attendanceRes.json()
      const riskData = await riskRes.json()
      
      if (excuseRes.ok) {
        const excuseData = await excuseRes.json()
        setExcuseReport(excuseData)
      }

      setAttendanceReport(attendanceData)
      setRiskReport(riskData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  if (error || !attendanceReport || !riskReport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error || "리포트를 불러올 수 없습니다"}
          </div>
          <Link
            href={`/instructor/courses/${courseId}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← 강의 상세로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/instructor/courses/${courseId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← 강의 상세로
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            리포트 - {attendanceReport.course.title}
          </h1>
          <p className="mt-2 text-gray-600">출석 통계 및 위험군 분석</p>
        </div>

        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2 font-medium ${
              activeTab === "attendance"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            출석률 통계
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            className={`px-4 py-2 font-medium ${
              activeTab === "risk"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            위험군 분석
          </button>
          <button
            onClick={() => setActiveTab("excuse")}
            className={`px-4 py-2 font-medium ${
              activeTab === "excuse"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            공결 승인율
          </button>
        </div>

        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* 전체 통계 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(attendanceReport.overall.averageAttendanceRate)}%
                </div>
                <div className="text-sm text-gray-600">평균 출석률</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-green-600">
                  {attendanceReport.overall.totalPresent}
                </div>
                <div className="text-sm text-gray-600">총 출석</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-yellow-600">
                  {attendanceReport.overall.totalLate}
                </div>
                <div className="text-sm text-gray-600">총 지각</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-red-600">
                  {attendanceReport.overall.totalAbsent}
                </div>
                <div className="text-sm text-gray-600">총 결석</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-orange-600">
                  {attendanceReport.overall.lateToAbsentConversions}
                </div>
                <div className="text-sm text-gray-600">지각→결석 전환</div>
              </div>
            </div>

            {/* 주차별 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">주차별 출석률</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        주차
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        날짜
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        출석률
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        출석
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        지각
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        결석
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        공결
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {attendanceReport.weekly.map((week) => (
                      <tr key={week.week}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {week.week}주차
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(week.date).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {Math.round(week.attendanceRate)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-green-600">
                          {week.present}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                          {week.late}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                          {week.absent}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                          {week.excused}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 학생별 통계 */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">학생별 출석 현황</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        학생
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        출석률
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        출석
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        지각
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        결석
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        공결
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {attendanceReport.students.map((stat) => (
                      <tr key={stat.student.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {stat.student.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.attendanceRate.toFixed(1)}%
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-green-600">
                          {stat.present}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                          {stat.late}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                          {stat.absent}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                          {stat.excused}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "risk" && (
          <div className="space-y-6">
            {/* 위험군 요약 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-gray-900">
                  {riskReport.summary.total}
                </div>
                <div className="text-sm text-gray-600">전체</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-red-600">
                  {riskReport.summary.danger}
                </div>
                <div className="text-sm text-gray-600">위험</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-yellow-600">
                  {riskReport.summary.warning}
                </div>
                <div className="text-sm text-gray-600">경고</div>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="text-2xl font-bold text-green-600">
                  {riskReport.summary.normal}
                </div>
                <div className="text-sm text-gray-600">정상</div>
              </div>
            </div>

            {/* 위험군 목록 */}
            {riskReport.riskGroups.danger.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-red-600">위험군 (DANGER)</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          학생
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          총 결석
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          연속 지각
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          위험 사유
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {riskReport.riskGroups.danger.map((student) => (
                        <tr key={student.student.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {student.student.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                            {student.totalAbsent}회
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                            {student.consecutiveLate}회
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {student.riskReason.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 경고군 목록 */}
            {riskReport.riskGroups.warning.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-yellow-600">경고군 (WARNING)</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-yellow-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          학생
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          총 결석
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          연속 지각
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          경고 사유
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {riskReport.riskGroups.warning.map((student) => (
                        <tr key={student.student.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {student.student.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                            {student.totalAbsent}회
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                            {student.consecutiveLate}회
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {student.riskReason.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 누적 결석 상위 */}
            {riskReport.topAbsent.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold">누적 결석 상위</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          순위
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          학생
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          총 결석
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {riskReport.topAbsent.map((student, idx) => (
                        <tr key={student.student.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {student.student.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                            {student.totalAbsent}회
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 연속 지각 상위 */}
            {riskReport.topConsecutiveLate.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold">연속 지각 상위</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          순위
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          학생
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          연속 지각
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {riskReport.topConsecutiveLate.map((student, idx) => (
                        <tr key={student.student.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {student.student.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                            {student.consecutiveLate}회
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "excuse" && (
          <div className="space-y-6">
            {excuseReport ? (
              <>
                {/* 전체 통계 */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-2xl font-bold text-gray-900">
                      {excuseReport.overall.approvalRate}%
                    </div>
                    <div className="text-sm text-gray-600">승인률</div>
                  </div>
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-2xl font-bold text-gray-900">
                      {excuseReport.overall.total}
                    </div>
                    <div className="text-sm text-gray-600">전체 신청</div>
                  </div>
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-2xl font-bold text-green-600">
                      {excuseReport.overall.approved}
                    </div>
                    <div className="text-sm text-gray-600">승인</div>
                  </div>
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-2xl font-bold text-red-600">
                      {excuseReport.overall.rejected}
                    </div>
                    <div className="text-sm text-gray-600">반려</div>
                  </div>
                  <div className="rounded-lg bg-white p-4 shadow">
                    <div className="text-2xl font-bold text-yellow-600">
                      {excuseReport.overall.pending}
                    </div>
                    <div className="text-sm text-gray-600">대기 중</div>
                  </div>
                </div>

                {/* 강의별 통계 */}
                {excuseReport.byCourse && excuseReport.byCourse.length > 0 && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-xl font-semibold">강의별 공결 승인율</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              강의명
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              과목코드/분반
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              승인률
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              전체
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              승인
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              반려
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                              대기
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {excuseReport.byCourse.map((stat: any) => (
                            <tr key={stat.course.id}>
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                {stat.course.title}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {stat.course.code} / {stat.course.section}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                                {stat.approvalRate}%
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                {stat.total}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-green-600">
                                {stat.approved}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-red-600">
                                {stat.rejected}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-yellow-600">
                                {stat.pending}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!excuseReport.byCourse || excuseReport.byCourse.length === 0) && (
                  <div className="rounded-lg bg-white p-6 shadow">
                    <p className="text-center text-gray-500">공결 신청 데이터가 없습니다</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg bg-white p-6 shadow">
                <p className="text-center text-gray-500">공결 승인율 데이터를 불러올 수 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

