import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies"
import { refreshAdminSession } from "@/lib/auth/server-refresh"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

async function refreshAccessToken(request: NextRequest) {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(AUTH_COOKIES.refresh)?.value
  if (!refreshToken) return null

  return refreshAdminSession(refreshToken, request.headers.get("user-agent"))
}

async function handler(request: NextRequest, context: RouteContext) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin")
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ message: "Cross-origin request rejected." }, { status: 403 })
    }
  }

  const { path } = await context.params
  const target = new URL(getAdminApiUrl(`/admin/${path.join("/")}`))
  target.search = request.nextUrl.search
  const requestBody = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer()
  const contentType = request.headers.get("content-type")

  const callBackend = (accessToken: string) => fetch(target, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(request.headers.get("user-agent") ? { "User-Agent": request.headers.get("user-agent")! } : {}),
    },
    body: requestBody,
    cache: "no-store",
  })

  const cookieStore = await cookies()
  let accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  let refreshed: Awaited<ReturnType<typeof refreshAccessToken>> = null
  let upstream: Response | null = accessToken ? await callBackend(accessToken) : null

  if (!upstream || upstream.status === 401) {
    refreshed = await refreshAccessToken(request)
    if (!refreshed) {
      const response = NextResponse.json({ message: "Session expired." }, { status: 401 })
      clearAuthCookies(response)
      return response
    }
    accessToken = refreshed.result.access_token
    upstream = await callBackend(accessToken)
  }

  const response = new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  })
  if (refreshed) setAuthCookies(response, refreshed.result, refreshed.refreshToken)
  if (upstream.status === 401) clearAuthCookies(response)
  return response
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
