import {
  Activity,
  Banknote,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CreditCard,
  Gift,
  LayoutDashboard,
  Map,
  Megaphone,
  MonitorSmartphone,
  Package,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/lib/rbac/permissions"

export interface AdminNavigationItem {
  label: string
  href: string
  icon: LucideIcon
  permissions?: readonly Permission[]
  mode?: "all" | "any"
  available?: boolean
}
export interface AdminNavigationGroup {
  label: string
  icon: LucideIcon
  permissions?: readonly Permission[]
  mode?: "all" | "any"
  items: AdminNavigationItem[]
}

export const DASHBOARD_NAVIGATION: AdminNavigationItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
  available: true,
}

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  {
    label: "Analytics",
    icon: BarChart3,
    permissions: ["analytics.read"],
    items: [
      { label: "Revenue", href: "/dashboard/analytics/revenue", icon: Banknote, permissions: ["analytics.read"] },
      { label: "Bookings", href: "/dashboard/analytics/bookings", icon: BriefcaseBusiness, permissions: ["analytics.read"] },
      { label: "Lima demand", href: "/dashboard/analytics/advisor-demand", icon: Activity, permissions: ["analytics.read"] },
    ],
  },
  {
    label: "Operations",
    icon: BriefcaseBusiness,
    permissions: ["users.manage", "operators.manage", "packages.manage", "bookings.manage", "journeys.manage"],
    mode: "any",
    items: [
      { label: "Customers", href: "/dashboard/customers", icon: Users, permissions: ["users.manage"] },
      { label: "Operators", href: "/dashboard/operators", icon: BriefcaseBusiness, permissions: ["operators.manage"] },
      { label: "Packages", href: "/dashboard/packages", icon: Package, permissions: ["packages.manage"] },
      { label: "Journey tracker", href: "/dashboard/journeys", icon: Map, permissions: ["journeys.manage"] },
    ],
  },
  {
    label: "Finance",
    icon: Banknote,
    permissions: ["payments.read", "settlements.manage", "commissions.manage", "reconciliation.manage"],
    mode: "any",
    items: [
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard, permissions: ["payments.read"] },
      { label: "Commissions", href: "/dashboard/commissions", icon: Banknote, permissions: ["commissions.manage"] },
    ],
  },
  {
    label: "Compliance",
    icon: ShieldCheck,
    permissions: ["kyc.manage", "kyb.manage", "compliance.manage"],
    mode: "any",
    items: [
      { label: "Verifications", href: "/dashboard/verifications", icon: ShieldCheck, permissions: ["kyc.manage"] },
      { label: "Audit logs", href: "/dashboard/audit-logs", icon: Activity, permissions: ["compliance.manage"] },
    ],
  },
  {
    label: "Growth & marketing",
    icon: Megaphone,
    permissions: ["referrals.manage", "marketing.manage", "extensions.manage"],
    mode: "any",
    items: [
      { label: "Referrals", href: "/dashboard/referrals", icon: Gift, permissions: ["referrals.manage"] },
      { label: "Sponsored ads", href: "/dashboard/ads", icon: Megaphone, permissions: ["marketing.manage"] },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    permissions: ["settings.manage", "audit.read"],
    mode: "any",
    items: [
      { label: "Platform admins", href: "/dashboard/admins", icon: ShieldCheck, permissions: ["settings.manage"], available: true },
      { label: "Lima learning", href: "/dashboard/lima-guidance", icon: BookOpenCheck, permissions: ["settings.manage"] },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, permissions: ["settings.manage"] },
    ],
  },
]

export const SESSION_NAVIGATION: AdminNavigationItem = {
  label: "Active sessions",
  href: "/dashboard/sessions",
  icon: MonitorSmartphone,
  available: true,
}

export function findNavigationItem(pathname: string) {
  if (pathname === DASHBOARD_NAVIGATION.href) return DASHBOARD_NAVIGATION
  if (pathname.startsWith(SESSION_NAVIGATION.href)) return SESSION_NAVIGATION
  return ADMIN_NAVIGATION.flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}
