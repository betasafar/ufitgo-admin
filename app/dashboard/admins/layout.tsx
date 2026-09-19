import type { ReactNode } from "react"
import { requirePermissions } from "@/lib/rbac/server"

export default async function AdminAccessLayout({ children }: { children: ReactNode }) {
  await requirePermissions(["settings.manage"])
  return children
}
