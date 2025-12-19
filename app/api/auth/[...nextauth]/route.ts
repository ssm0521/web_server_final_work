import { handlers } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"


export const { GET, POST } = handlers


