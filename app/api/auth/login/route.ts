import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import type { AdminLoginResponse, LoginCredentials } from "@/lib/auth/types"

const ACCESS_COOKIE = "ufitgo_admin_access"
const PROFILE_COOKIE = "ufitgo_admin_profile"
const REFRESH_COOKIE = "ufitgo_admin_refresh"

function errorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Invalid email or password."
  const value = payload as { message?: unknown }
  if (typeof value.message === "string") return value.message
  if (value.message && typeof value.message === "object") {
    const nested = value.message as { message?: unknown }
    if (typeof nested.message === "string") return nested.message
  }
  return "Invalid email or password."
}

function refreshTokenFromHeader(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/ufitgo_admin_refresh=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export async function POST(request: Request) {
  let credentials: LoginCredentials
  try {
    credentials = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 })
  }

  if (!credentials.email?.trim() || !credentials.password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 })
  }

  try {
    const upstream = await fetch(getAdminApiUrl("/admin/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
      cache: "no-store",
    })

    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      return NextResponse.json({ message: errorMessage(payload) }, { status: upstream.status })
    }

    const result = payload as AdminLoginResponse
    if (!result.access_token || !result.admin) {
      return NextResponse.json({ message: "The authentication service returned an invalid response." }, { status: 502 })
    }

    const response = NextResponse.json({ admin: result.admin })
    const secure = process.env.NODE_ENV === "production"
    const persistent = credentials.rememberMe ? { maxAge: 7 * 24 * 60 * 60 } : {}

    response.cookies.set(ACCESS_COOKIE, result.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    })
    response.cookies.set(PROFILE_COOKIE, Buffer.from(JSON.stringify(result.admin)).toString("base64url"), {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      ...persistent,
    })

    const refreshToken = refreshTokenFromHeader(upstream.headers.get("set-cookie"))
    if (refreshToken) {
      response.cookies.set(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/api/auth",
        ...(credentials.rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
      })
    }

    return response
  } catch (error) {
    console.error("Admin login gateway error", error)
    return NextResponse.json({ message: "Authentication service is unavailable. Please try again." }, { status: 503 })
  }
}
