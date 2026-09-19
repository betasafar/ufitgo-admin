import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import type { AdminLoginResponse, LoginCredentials } from "@/lib/auth/types"
import { refreshTokenFromHeader, setAuthCookies } from "@/lib/auth/cookies"

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
        rememberMe: !!credentials.rememberMe,
      }),
      ...(request.headers.get("user-agent") ? { headers: { "Content-Type": "application/json", "User-Agent": request.headers.get("user-agent")! } } : {}),
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
    const refreshToken = refreshTokenFromHeader(upstream.headers.get("set-cookie"))
    setAuthCookies(response, result, refreshToken)

    return response
  } catch (error) {
    console.error("Admin login gateway error", error)
    return NextResponse.json({ message: "Authentication service is unavailable. Please try again." }, { status: 503 })
  }
}
