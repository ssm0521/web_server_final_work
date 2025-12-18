import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

// 내 수강신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 401 })
    }

    // 학생만 조회 가능
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "학생만 조회할 수 있습니다" }, { status: 403 })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        course: {
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error("수강신청 목록 조회 오류:", error)
    return NextResponse.json(
      { error: "수강신청 목록을 불러오는 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

