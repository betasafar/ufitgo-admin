import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES, clearAuthCookies } from "@/lib/auth/cookies"

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  let status = 200
  if (accessToken) {
    try {
      const upstream = await fetch(getAdminApiUrl("/admin/auth/logout-all"), {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      })
      status = upstream.ok ? 200 : upstream.status
    } catch (error) {
      console.error("Logout-all gateway error", error)
      status = 503
    }
  }
  const response = NextResponse.json({ success: status === 200 }, { status })
  clearAuthCookies(response)
  return response
}
