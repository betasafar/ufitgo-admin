import { getAdminApiUrl } from "@/lib/auth/config"
import { refreshTokenFromHeader } from "@/lib/auth/cookies"
import type { AdminLoginResponse } from "@/lib/auth/types"

interface RefreshedSession {
  result: AdminLoginResponse
  refreshToken: string | null
}

const refreshRequests = new Map<string, Promise<RefreshedSession | null>>()

export function refreshAdminSession(refreshToken: string, userAgent?: string | null) {
  const existing = refreshRequests.get(refreshToken)
  if (existing) return existing

  const request = (async () => {
    const response = await fetch(getAdminApiUrl("/admin/auth/refresh"), {
      method: "POST",
      headers: {
        Cookie: `ufitgo_admin_refresh=${encodeURIComponent(refreshToken)}`,
        ...(userAgent ? { "User-Agent": userAgent } : {}),
      },
      cache: "no-store",
    })
    if (!response.ok) return null
    return {
      result: await response.json() as AdminLoginResponse,
      refreshToken: refreshTokenFromHeader(response.headers.get("set-cookie")),
    }
  })().finally(() => refreshRequests.delete(refreshToken))

  refreshRequests.set(refreshToken, request)
  return request
}
