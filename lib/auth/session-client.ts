import type { AdminSession } from "@/lib/auth/types"

export class SessionRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

async function sessionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
    const payload = await response.json().catch(() => null)
    if (response.ok) return payload as T
    if (response.status !== 409 || attempt >= 4) {
      throw new SessionRequestError(payload?.message || "Session request failed.", response.status)
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }
}

function serializedSessionRequest<T>(request: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("ufitgo-admin-session", request)
  }
  return request()
}

export function refreshAccessToken() {
  return serializedSessionRequest(() => sessionRequest<{ session: AdminSession }>("/api/auth/refresh", { method: "POST" }))
}

export function touchCurrentSession() {
  return serializedSessionRequest(() => sessionRequest<AdminSession>("/api/admin/auth/session/activity", { method: "POST" }))
}

export function listAdminSessions() {
  return sessionRequest<AdminSession[]>("/api/admin/auth/sessions")
}

export function revokeAdminSession(id: string) {
  return sessionRequest<{ success: boolean }>(`/api/admin/auth/sessions/${id}`, { method: "DELETE" })
}

export function logoutCurrentSession() {
  return serializedSessionRequest(() => sessionRequest<{ success: boolean }>("/api/auth/logout", { method: "POST" }))
}

export function logoutAllSessions() {
  return serializedSessionRequest(() => sessionRequest<{ success: boolean }>("/api/auth/logout-all", { method: "POST" }))
}
