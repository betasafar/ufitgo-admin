import type { ReactNode } from "react"
import { SessionProvider } from "@/components/auth/session-provider"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
