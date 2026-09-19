import type { NextResponse } from "next/server"
import type { AdminLoginResponse } from "@/lib/auth/types"

export const AUTH_COOKIES = {
  access: "ufitgo_admin_access",
  profile: "ufitgo_admin_profile",
  refresh: "ufitgo_admin_refresh",
} as const

export function refreshTokenFromHeader(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/ufitgo_admin_refresh=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function setAuthCookies(
  response: NextResponse,
  result: AdminLoginResponse,
  refreshToken: string | null,
) {
  const secure = process.env.NODE_ENV === "production"
  const accessTtl = Math.max(result.access_token_expires_in || 900, 60)
  const absoluteSeconds = Math.max(
    Math.floor((new Date(result.session.absoluteExpiresAt).getTime() - Date.now()) / 1000),
    60,
  )
  const persistent = result.session.rememberMe ? { maxAge: absoluteSeconds } : {}

  response.cookies.set(AUTH_COOKIES.access, result.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessTtl,
  })
  response.cookies.set(
    AUTH_COOKIES.profile,
    Buffer.from(JSON.stringify(result.admin)).toString("base64url"),
    { httpOnly: true, secure, sameSite: "lax", path: "/", ...persistent },
  )
  if (refreshToken) {
    response.cookies.set(AUTH_COOKIES.refresh, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    })
  }
}

export function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production"
  for (const name of Object.values(AUTH_COOKIES)) {
    response.cookies.set(name, "", { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 })
  }
}
