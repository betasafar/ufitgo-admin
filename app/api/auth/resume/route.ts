import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { AUTH_COOKIES, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies"
import { refreshAdminSession } from "@/lib/auth/server-refresh"

function safeDestination(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"
}

export async function GET(request: NextRequest) {
  const destination = safeDestination(request.nextUrl.searchParams.get("next"))
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  if (!refreshToken) return NextResponse.redirect(new URL("/login", request.url))

  try {
    const refreshed = await refreshAdminSession(refreshToken, request.headers.get("user-agent"))
    if (!refreshed) {
      const response = NextResponse.redirect(new URL("/login?reason=session-expired", request.url))
      clearAuthCookies(response)
      return response
    }
    const response = NextResponse.redirect(new URL(destination, request.url))
    setAuthCookies(response, refreshed.result, refreshed.refreshToken)
    return response
  } catch (error) {
    console.error("Admin session resume error", error)
    const response = NextResponse.redirect(new URL("/login?reason=session-expired", request.url))
    clearAuthCookies(response)
    return response
  }
}
