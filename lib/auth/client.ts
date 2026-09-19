import type { AdminProfile, LoginCredentials } from "@/lib/auth/types"

interface LoginResult {
  admin: AdminProfile
}

export class AuthRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthRequestError"
  }
}

export async function loginAdmin(credentials: LoginCredentials): Promise<LoginResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new AuthRequestError(payload?.message || "Unable to sign in. Please try again.")
  }

  return payload as LoginResult
}

async function authRequest(url: string, body: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new AuthRequestError(payload?.message || "Unable to complete this request.")
  return payload as { success: boolean; message: string }
}

export function requestPasswordReset(email: string) {
  return authRequest("/api/auth/forgot-password", { email })
}

export function resetAdminPassword(token: string, password: string) {
  return authRequest("/api/auth/reset-password", { token, password })
}
