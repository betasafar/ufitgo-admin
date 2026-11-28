import { getAdminApiUrl } from "@/lib/auth/config"
import { refreshTokenFromHeader } from "@/lib/auth/cookies"
import type { AdminLoginResponse } from "@/lib/auth/types"

interface RefreshedSession {
  result: AdminLoginResponse
  refreshToken: string | null
}

const refreshRequests = new Map<string, Promise<RefreshedSession | null>>()

export class RefreshUnavailableError extends Error {
  constructor(public readonly status: 409 | 503) {
    super(status === 409 ? "Session refresh is already in progress." : "Session service is unavailable.")
  }
}

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
    if (response.status === 401 || response.status === 400) return null
    if (!response.ok) throw new RefreshUnavailableError(response.status === 409 ? 409 : 503)
    const rotatedToken = refreshTokenFromHeader(response.headers.get("set-cookie"))
    if (!rotatedToken) throw new RefreshUnavailableError(503)
    return {
      result: await response.json() as AdminLoginResponse,
      refreshToken: rotatedToken,
    }
  })().finally(() => refreshRequests.delete(refreshToken))

  refreshRequests.set(refreshToken, request)
  return request
}
