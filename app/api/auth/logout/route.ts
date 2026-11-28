import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES, clearAuthCookies } from "@/lib/auth/cookies"

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  let revoked = true
  try {
    if (refreshToken) {
      const upstream = await fetch(getAdminApiUrl("/admin/auth/logout"), {
        method: "POST",
        headers: { Cookie: `ufitgo_admin_refresh=${encodeURIComponent(refreshToken)}` },
        cache: "no-store",
      })
      revoked = upstream.ok
    }
  } catch (error) {
    console.error("Admin logout gateway error", error)
    revoked = false
  }
  const response = revoked
    ? NextResponse.json({ success: true })
    : NextResponse.json({ message: "Signed out on this browser, but the server session could not be revoked." }, { status: 503 })
  clearAuthCookies(response)
  return response
}
