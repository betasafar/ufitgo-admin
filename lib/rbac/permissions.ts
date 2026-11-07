import type { AdminProfile } from "@/lib/auth/types"

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "MANAGING_DIRECTOR",
  "HEAD_OF_OPERATIONS",
  "B2B_ONBOARDING_LEAD",
  "B2B_SUPPORT",
  "B2C_ONBOARDING_LEAD",
  "B2C_SUPPORT",
  "FINANCE",
  "OPERATIONS",
  "COMPLIANCE",
  "TECHNICAL",
  "SUPPORT",
] as const

export type AdminRole = string

export interface PermissionDefinition {
  key: string
  label: string
  capability: string
  group: string
}

export interface RoleDefinition {
  id?: number
  slug: string
  name: string
  description?: string
  permissions: string[]
  capabilities?: string[]
  isSystem?: boolean
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Team & Access Control
  {
    key: "team.view",
    label: "View Organization Members",
    capability: "Can view all organization team members, roles, and access levels",
    group: "Team & Access Control",
  },
  {
    key: "team.invite",
    label: "Invite Team Members",
    capability: "Can invite new team members and onboarding staff to the dashboard",
    group: "Team & Access Control",
  },
  {
    key: "team.roles.manage",
    label: "Change Member Roles",
    capability: "Can create custom roles, change member roles, and grant or revoke permissions",
    group: "Team & Access Control",
  },
  {
    key: "team.status.manage",
    label: "Activate or Deactivate Members",
    capability: "Can activate, suspend, or reset passwords for team members",
    group: "Team & Access Control",
  },
  {
    key: "team.remove",
    label: "Remove Team Members",
    capability: "Can permanently remove team members from the organization",
    group: "Team & Access Control",
  },
  {
    key: "secrets.view",
    label: "View API Secrets",
    capability: "Can view BaaS provider health, webhook diagnostics, and system configurations",
    group: "Team & Access Control",
  },
  // Operations
  {
    key: "users.manage",
    label: "Manage Pilgrim Accounts",
    capability: "Can access pilgrim profiles, savings plans, and support customer onboarding",
    group: "Operations",
  },
  {
    key: "operators.manage",
    label: "Manage NAHCON Tour Operators",
    capability: "Can onboard, review, and manage NAHCON-licensed Hajj & Umrah tour operators",
    group: "Operations",
  },
  {
    key: "packages.manage",
    label: "Manage Hajj & Umrah Packages",
    capability: "Can publish, edit, and verify Hajj and Umrah package listings and slot quotas",
    group: "Operations",
  },
  {
    key: "bookings.manage",
    label: "Manage Pilgrim Bookings",
    capability: "Can view and manage pilgrim package bookings, installments, and Travel Docs readiness",
    group: "Operations",
  },
  {
    key: "journeys.manage",
    label: "Manage Journeys & Waitlists",
    capability: "Can manage seasonal Hajj/Umrah waitlists, journey alerts, and Passport Assist requests",
    group: "Operations",
  },
  // Compliance
  {
    key: "kyc.manage",
    label: "Verify Pilgrim KYC & Utility Bills",
    capability: "Can review and approve pilgrim NIN, BVN, liveness selfies, and Tier 3 utility bills",
    group: "Compliance",
  },
  {
    key: "kyb.manage",
    label: "Verify Operator KYB Documents",
    capability: "Can access Know Your Business (KYB) information and approve operator verification",
    group: "Compliance",
  },
  {
    key: "compliance.manage",
    label: "Manage AML & Regulatory Compliance",
    capability: "Can manage CBN tier limits, compliance rules, and regulatory audit trails",
    group: "Compliance",
  },
  // Finance
  {
    key: "finance.summary.read",
    label: "View Financial & Treasury Summary",
    capability: "Can access financial summaries, CASA float balances, and revenue reports",
    group: "Finance",
  },
  {
    key: "payments.read",
    label: "View Payment Transactions",
    capability: "Can view inward virtual account deposits, card payments, and transaction logs",
    group: "Finance",
  },
  {
    key: "settlements.manage",
    label: "Approve Payouts & Operator Settlements",
    capability: "Can approve and release escrow settlements to tour operators and bank payouts",
    group: "Finance",
  },
  {
    key: "commissions.manage",
    label: "Manage Marketplace Commissions",
    capability: "Can configure operator commission splits, early-exit fees, and promo codes",
    group: "Finance",
  },
  {
    key: "reconciliation.manage",
    label: "Reconcile BaaS Ledgers & Webhooks",
    capability: "Can reconcile Paystack-Titan, FCMB, and Providus Xpress Wallet transactions",
    group: "Finance",
  },
  // Analytics, Support, Growth, Marketing & Platform
  {
    key: "analytics.read",
    label: "View Analytics & Performance Reports",
    capability: "Can access and generate comprehensive reports for trend and performance analysis",
    group: "Analytics",
  },
  {
    key: "leads.manage",
    label: "Manage Pilgrim Leads & Enquiries",
    capability: "Can manage AI Advisor leads, price enquiries, and customer support tickets",
    group: "Support",
  },
  {
    key: "referrals.manage",
    label: "Manage Referral Campaigns",
    capability: "Can configure and monitor pilgrim referral codes and bonus rewards",
    group: "Growth",
  },
  {
    key: "marketing.manage",
    label: "Manage Featured Ads & Home Content",
    capability: "Can manage featured operator ads, banners, and mobile home feed content",
    group: "Marketing & Tools",
  },
  {
    key: "communications.publish",
    label: "Send Push Broadcasts & Alerts",
    capability: "Can send push notification broadcasts and email campaigns to pilgrims",
    group: "Marketing & Tools",
  },
  {
    key: "extensions.manage",
    label: "Manage Ziyarah Extensions & Travel FX",
    capability: "Can manage Ziyarah add-on extensions and licensed BDC Travel FX listings",
    group: "Marketing & Tools",
  },
  {
    key: "monitoring.read",
    label: "View System & Cron Job Monitoring",
    capability: "Can monitor background cron jobs, auto-debit schedules, and webhook queues",
    group: "Monitoring",
  },
  {
    key: "infrastructure.read",
    label: "Access Developer & BaaS Routing Tools",
    capability: "Can access all development tools, BaaS provider routing, and testing environments",
    group: "Monitoring",
  },
  {
    key: "settings.manage",
    label: "Manage Platform & Team Settings",
    capability: "Can access all Dashboard features, feature flags, and team role management",
    group: "Platform",
  },
  {
    key: "audit.read",
    label: "View Security & Document Audit Logs",
    capability: "Can inspect administrator audit logs and sensitive document access records",
    group: "Platform",
  },
]

export const PERMISSION_GROUPS = {
  "Team & Access Control": [
    "team.view",
    "team.invite",
    "team.roles.manage",
    "team.status.manage",
    "team.remove",
    "secrets.view",
  ],
  Analytics: ["analytics.read"],
  Operations: ["users.manage", "operators.manage", "packages.manage", "bookings.manage", "journeys.manage"],
  Finance: ["finance.summary.read", "payments.read", "settlements.manage", "commissions.manage", "reconciliation.manage"],
  Compliance: ["kyc.manage", "kyb.manage", "compliance.manage"],
  Support: ["leads.manage"],
  Growth: ["referrals.manage"],
  Monitoring: ["monitoring.read", "infrastructure.read"],
  "Marketing & Tools": ["marketing.manage", "communications.publish", "extensions.manage"],
  Platform: ["settings.manage", "audit.read"],
} as const

export type Permission = (typeof PERMISSION_GROUPS)[keyof typeof PERMISSION_GROUPS][number]

export const ROLE_DEFAULT_PERMISSIONS: Record<string, readonly (Permission | "*")[]> = {
  SUPER_ADMIN: ["*"],
  MANAGING_DIRECTOR: ["*"],
  HEAD_OF_OPERATIONS: [
    "team.view",
    "team.invite",
    "analytics.read",
    "users.manage",
    "operators.manage",
    "packages.manage",
    "bookings.manage",
    "journeys.manage",
    "kyc.manage",
    "kyb.manage",
    "leads.manage",
    "referrals.manage",
    "marketing.manage",
    "communications.publish",
    "extensions.manage",
  ],
  B2B_ONBOARDING_LEAD: [
    "team.view",
    "analytics.read",
    "operators.manage",
    "packages.manage",
    "kyb.manage",
    "extensions.manage",
    "marketing.manage",
  ],
  B2B_SUPPORT: ["operators.manage", "packages.manage", "extensions.manage", "leads.manage"],
  B2C_ONBOARDING_LEAD: [
    "team.view",
    "analytics.read",
    "users.manage",
    "bookings.manage",
    "journeys.manage",
    "kyc.manage",
    "leads.manage",
    "referrals.manage",
    "communications.publish",
  ],
  B2C_SUPPORT: ["users.manage", "bookings.manage", "leads.manage", "journeys.manage"],
  FINANCE: ["analytics.read", "finance.summary.read", "payments.read", "settlements.manage", "commissions.manage", "reconciliation.manage", "audit.read"],
  OPERATIONS: ["users.manage", "operators.manage", "packages.manage", "bookings.manage", "journeys.manage", "analytics.read"],
  COMPLIANCE: ["kyc.manage", "kyb.manage", "compliance.manage", "payments.read", "reconciliation.manage", "audit.read"],
  TECHNICAL: ["monitoring.read", "infrastructure.read", "secrets.view", "extensions.manage", "audit.read"],
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

