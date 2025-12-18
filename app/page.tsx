import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()

  if (session) {
    // 로그인된 사용자는 역할에 따라 대시보드로 리다이렉트
    if (session.user.role === "ADMIN") {
      redirect("/admin")
    } else if (session.user.role === "INSTRUCTOR") {
      redirect("/instructor")
    } else if (session.user.role === "STUDENT") {
      redirect("/student")
    }
  } else {
    // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
    redirect("/login")
  }
}

