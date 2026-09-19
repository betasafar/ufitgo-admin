import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAdminApiUrl } from "@/lib/auth/config"
import { AUTH_COOKIES } from "@/lib/auth/cookies"
import type { AdminProfile } from "@/lib/auth/types"
import { hasAllPermissions, hasAnyPermission, type Permission } from "@/lib/rbac/permissions"

export async function getCurrentAdmin(): Promise<AdminProfile> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(AUTH_COOKIES.access)?.value
  if (!accessToken) redirect("/login")

  const response = await fetch(getAdminApiUrl("/admin/auth/me"), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!response.ok) redirect("/login?reason=session-expired")
  return response.json() as Promise<AdminProfile>
}

export async function requirePermissions(
  permissions: readonly Permission[],
  mode: "all" | "any" = "all",
) {
  const admin = await getCurrentAdmin()
  const allowed = mode === "all"
    ? hasAllPermissions(admin, permissions)
    : hasAnyPermission(admin, permissions)
  if (!allowed) redirect("/forbidden")
  return admin
}
