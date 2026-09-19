import type { ReactNode } from "react"
import { SessionProvider } from "@/components/auth/session-provider"
import { AdminShell } from "@/components/layout/admin-shell"
import { getCurrentAdmin } from "@/lib/rbac/server"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin()
  return <SessionProvider initialAdmin={admin}><AdminShell>{children}</AdminShell></SessionProvider>
}
