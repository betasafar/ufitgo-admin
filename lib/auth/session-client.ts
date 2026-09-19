import type { AdminSession } from "@/lib/auth/types"

async function sessionRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Session request failed.")
  return payload as T
}

export function refreshAccessToken() {
  return sessionRequest<{ session: AdminSession }>("/api/auth/refresh", { method: "POST" })
}

export function touchCurrentSession() {
  return sessionRequest<AdminSession>("/api/admin/auth/session/activity", { method: "POST" })
}

export function listAdminSessions() {
  return sessionRequest<AdminSession[]>("/api/admin/auth/sessions")
}

export function revokeAdminSession(id: string) {
  return sessionRequest<{ success: boolean }>(`/api/admin/auth/sessions/${id}`, { method: "DELETE" })
}

export function logoutCurrentSession() {
  return sessionRequest<{ success: boolean }>("/api/auth/logout", { method: "POST" })
}

export function logoutAllSessions() {
  return sessionRequest<{ success: boolean }>("/api/auth/logout-all", { method: "POST" })
}
