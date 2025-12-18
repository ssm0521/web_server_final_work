import { auth } from "./auth"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }
  return session
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/")
  }
  return session
}


