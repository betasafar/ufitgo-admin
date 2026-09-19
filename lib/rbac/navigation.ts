import { LayoutDashboard, ShieldCheck, MonitorSmartphone, type LucideIcon } from "lucide-react"
import type { Permission } from "@/lib/rbac/permissions"

export interface AdminNavigationItem {
  label: string
  href: string
  icon: LucideIcon
  permissions?: readonly Permission[]
  mode?: "all" | "any"
}

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Platform admins", href: "/dashboard/admins", icon: ShieldCheck, permissions: ["settings.manage"] },
  { label: "Active sessions", href: "/dashboard/sessions", icon: MonitorSmartphone },
]
