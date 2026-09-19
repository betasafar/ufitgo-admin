import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { AUTH_COOKIES, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies"
import { refreshAdminSession } from "@/lib/auth/server-refresh"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  if (!refreshToken) {
    const response = NextResponse.json({ message: "Session expired." }, { status: 401 })
    clearAuthCookies(response)
    return response
  }

  try {
    const refreshed = await refreshAdminSession(refreshToken, request.headers.get("user-agent"))
    if (!refreshed) {
      const response = NextResponse.json({ message: "Session expired." }, { status: 401 })
      clearAuthCookies(response)
      return response
    }

    const response = NextResponse.json({ admin: refreshed.result.admin, session: refreshed.result.session })
    setAuthCookies(response, refreshed.result, refreshed.refreshToken)
    return response
  } catch (error) {
    console.error("Admin refresh gateway error", error)
    return NextResponse.json({ message: "Unable to refresh session." }, { status: 503 })
  }
}
