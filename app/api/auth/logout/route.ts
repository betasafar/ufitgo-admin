import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES, clearAuthCookies } from "@/lib/auth/cookies"

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  try {
    if (refreshToken) {
      await fetch(getAdminApiUrl("/admin/auth/logout"), {
        method: "POST",
        headers: { Cookie: `ufitgo_admin_refresh=${encodeURIComponent(refreshToken)}` },
        cache: "no-store",
      })
    }
  } catch (error) {
    console.error("Admin logout gateway error", error)
  }
  const response = NextResponse.json({ success: true })
  clearAuthCookies(response)
  return response
}
