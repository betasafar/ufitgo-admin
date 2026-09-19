"use client"

import type { ReactNode } from "react"
import { useAdminSession } from "@/components/auth/session-provider"
import type { Permission } from "@/lib/rbac/permissions"

interface PermissionGateProps {
  permissions: readonly Permission[]
  mode?: "all" | "any"
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({ permissions, mode = "all", fallback = null, children }: PermissionGateProps) {
  const { can } = useAdminSession()
  return can(permissions, mode) ? children : fallback
}

export function useCan() {
  return useAdminSession().can
}
