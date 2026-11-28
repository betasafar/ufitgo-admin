import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies"
import { refreshAdminSession, RefreshUnavailableError } from "@/lib/auth/server-refresh"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  let refreshed: Awaited<ReturnType<typeof refreshAdminSession>> = null
  try {
    const revoke = (token: string) => fetch(getAdminApiUrl("/admin/auth/logout-all"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    let upstream = accessToken ? await revoke(accessToken) : null
    if (!upstream || upstream.status === 401) {
      refreshed = refreshToken ? await refreshAdminSession(refreshToken, request.headers.get("user-agent")) : null
      if (!refreshed) {
        const response = NextResponse.json({ message: "Session expired. Sign in again to sign out all devices." }, { status: 401 })
        clearAuthCookies(response)
        return response
      }
      upstream = await revoke(refreshed.result.access_token)
    }
    if (upstream.ok) {
      const response = NextResponse.json({ success: true })
      clearAuthCookies(response)
      return response
    }
    const response = NextResponse.json({ message: "Unable to sign out all devices. Please try again." }, { status: upstream.status })
    if (refreshed) setAuthCookies(response, refreshed.result, refreshed.refreshToken)
    return response
  } catch (error) {
    console.error("Logout-all gateway error", error)
    const response = NextResponse.json({ message: "Unable to sign out all devices. Please try again." }, {
      status: error instanceof RefreshUnavailableError ? error.status : 503,
    })
    if (refreshed) setAuthCookies(response, refreshed.result, refreshed.refreshToken)
    return response
  }
}
