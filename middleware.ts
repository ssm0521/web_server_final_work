import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // 공개 경로
  const publicPaths = ["/login", "/register"]
  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path))

  // 로그인하지 않은 사용자가 보호된 경로 접근 시
  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시
  if (isLoggedIn && isPublicPath) {
    const role = req.auth?.user?.role
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url))
    } else if (role === "INSTRUCTOR") {
      return NextResponse.redirect(new URL("/instructor", req.url))
    } else if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

