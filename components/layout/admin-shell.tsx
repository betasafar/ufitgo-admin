"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, X } from "lucide-react"
import { BrandMark } from "@/components/brand/brand-mark"
import { useAdminSession } from "@/components/auth/session-provider"
import { ADMIN_NAVIGATION } from "@/lib/rbac/navigation"
import { cn } from "@/lib/utils"

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { admin, can, logout } = useAdminSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigation = ADMIN_NAVIGATION.filter((item) => !item.permissions || can(item.permissions, item.mode))

  const sidebar = (
    <div className="flex h-full flex-col bg-[#071e16] px-4 py-6 text-white">
      <div className="px-2"><BrandMark inverse /></div>
      <nav className="mt-10 space-y-1" aria-label="Admin navigation">
        {navigation.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors", active ? "bg-[#18a77e] text-white" : "text-white/65 hover:bg-white/8 hover:text-white")}>
              <Icon className="size-4" /> {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="px-3 pb-4">
          <p className="truncate text-sm font-bold">{admin.name}</p>
          <p className="mt-1 truncate text-xs text-white/45">{admin.role.replaceAll("_", " ")}</p>
        </div>
        <button onClick={() => void logout()} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/60 hover:bg-white/8 hover:text-white"><LogOut className="size-4" /> Sign out</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-[#f4f7f5] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[min(82vw,300px)]">{sidebar}</aside></div>}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#d9dfdc] bg-white/95 px-5 backdrop-blur lg:px-8">
          <button aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen((open) => !open)} className="grid size-10 place-items-center rounded-lg border border-[#d9dfdc] text-[#35443e] lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <p className="ml-auto text-sm text-[#68716d]">{admin.email}</p>
        </header>
        <div>{children}</div>
      </div>
    </div>
  )
}
