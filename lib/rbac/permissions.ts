import type { AdminProfile } from "@/lib/auth/types"

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "FINANCE",
  "OPERATIONS",
  "COMPLIANCE",
  "TECHNICAL",
  "SUPPORT",
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

export const PERMISSION_GROUPS = {
  Analytics: ["analytics.read"],
  Operations: ["users.manage", "operators.manage", "packages.manage", "bookings.manage", "journeys.manage"],
  Finance: ["finance.summary.read", "payments.read", "settlements.manage", "commissions.manage", "reconciliation.manage"],
  Compliance: ["kyc.manage", "kyb.manage", "compliance.manage"],
  Support: ["leads.manage"],
  Growth: ["referrals.manage"],
  Monitoring: ["monitoring.read", "infrastructure.read"],
  "Marketing & Tools": ["marketing.manage", "extensions.manage"],
  Platform: ["settings.manage", "audit.read"],
} as const

export type Permission = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS][number]

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, readonly (Permission | "*")[]> = {
  SUPER_ADMIN: ["*"],
  MANAGING_DIRECTOR: ["*"],
  FINANCE: ["finance.summary.read", "payments.read", "settlements.manage", "commissions.manage", "reconciliation.manage"],
  OPERATIONS: ["users.manage", "operators.manage", "packages.manage", "bookings.manage", "journeys.manage", "analytics.read"],
  COMPLIANCE: ["kyc.manage", "kyb.manage", "compliance.manage"],
  TECHNICAL: ["monitoring.read", "infrastructure.read", "extensions.manage"],
  SUPPORT: ["users.manage", "bookings.manage", "leads.manage"],
}

export function isUnrestricted(admin: Pick<AdminProfile, "role" | "permissions">) {
  return admin.role === "SUPER_ADMIN" || admin.permissions.includes("*")
}

export function hasAllPermissions(admin: Pick<AdminProfile, "role" | "permissions">, required: readonly Permission[]) {
  return isUnrestricted(admin) || required.every((permission) => admin.permissions.includes(permission))
}

export function hasAnyPermission(admin: Pick<AdminProfile, "role" | "permissions">, required: readonly Permission[]) {
  return required.length === 0 || isUnrestricted(admin) || required.some((permission) => admin.permissions.includes(permission))
}
