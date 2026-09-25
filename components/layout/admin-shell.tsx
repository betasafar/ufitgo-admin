"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  UserRound,
  X,
  Search,
} from "lucide-react"
import { BrandMark } from "@/components/brand/brand-mark"
import { useAdminSession } from "@/components/auth/session-provider"
import {
  ADMIN_NAVIGATION,
  DASHBOARD_NAVIGATION,
  findNavigationItem,
  type AdminNavigationGroup,
  type AdminNavigationItem,
} from "@/lib/rbac/navigation"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "UA"
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`))
}

function SidebarItem({ item, pathname, onNavigate }: { item: AdminNavigationItem; pathname: string; onNavigate: () => void }) {
  const Icon = item.icon
  if (!item.available) {
    return (
      <div title="This module has not been migrated yet" className="flex h-9 cursor-not-allowed items-center gap-3 rounded-md px-2 text-xs font-medium text-white/28">
        <Icon className="size-3.5" /><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="text-[9px] uppercase tracking-wider">Soon</span>
      </div>
    )
  }
  return (
    <Link href={item.href} onClick={onNavigate} className={cn("flex h-9 items-center gap-3 rounded-md px-2 text-xs font-semibold transition-colors", isActive(pathname, item.href) ? "bg-white/10 text-white" : "text-white/52 hover:bg-white/7 hover:text-white")}>
      <Icon className="size-3.5" /><span>{item.label}</span>
    </Link>
  )
}

function SidebarNavigation({ compact, pathname, onNavigate, onExpand }: { compact: boolean; pathname: string; onNavigate: () => void; onExpand: () => void }) {
  const { can } = useAdminSession()
  const activeGroups = useMemo(() => ADMIN_NAVIGATION.filter((group) => group.items.some((item) => isActive(pathname, item.href))).map((group) => group.label), [pathname])
  const [openGroups, setOpenGroups] = useState<string[]>(activeGroups)
  const visibleGroups = ADMIN_NAVIGATION.map((group) => ({ ...group, items: group.items.filter((item) => !item.permissions || can(item.permissions, item.mode)) }))
    .filter((group) => group.items.length > 0 && (!group.permissions || can(group.permissions, group.mode)))
  const DashboardIcon = DASHBOARD_NAVIGATION.icon

  // Whenever navigation lands in a different section, only that section's group should stay open.
  useEffect(() => {
    setOpenGroups(activeGroups)
  }, [activeGroups])

  function toggle(group: AdminNavigationGroup) {
    if (compact) {
      onExpand()
      setOpenGroups([group.label])
      return
    }
    setOpenGroups((current) => (current.includes(group.label) ? current.filter((label) => label !== group.label) : [group.label]))
  }

  return (
    <nav className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Admin navigation">
      <Link href={DASHBOARD_NAVIGATION.href} onClick={onNavigate} title={compact ? DASHBOARD_NAVIGATION.label : undefined} className={cn("flex h-11 items-center rounded-lg text-sm font-semibold transition-colors", compact ? "justify-center" : "gap-3 px-3", isActive(pathname, DASHBOARD_NAVIGATION.href) ? "bg-[#18a77e] text-white" : "text-white/68 hover:bg-white/8 hover:text-white")}>
        <DashboardIcon className="size-[18px] shrink-0" />{!compact && <span>Dashboard</span>}
      </Link>
      {visibleGroups.map((group) => {
        const GroupIcon = group.icon
        const open = openGroups.includes(group.label)
        const groupActive = group.items.some((item) => isActive(pathname, item.href))
        return (
          <div key={group.label} className="pt-1">
            <button type="button" onClick={() => toggle(group)} title={compact ? group.label : undefined} aria-expanded={!compact && open} className={cn("flex h-11 w-full items-center rounded-lg text-sm font-semibold transition-colors", compact ? "justify-center" : "gap-3 px-3", groupActive ? "text-[#62d5b1]" : "text-white/68 hover:bg-white/8 hover:text-white")}>
              <GroupIcon className="size-[18px] shrink-0" />
              {!compact && <><span className="min-w-0 flex-1 text-left">{group.label}</span>{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</>}
            </button>
            {!compact && open && <div className="ml-[21px] space-y-1 border-l border-white/10 py-1 pl-4">{group.items.map((item) => <SidebarItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}</div>}
          </div>
        )
      })}
    </nav>
  )
}

function UserMenu() {
  const { admin, can, logout } = useAdminSession()
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) detailsRef.current.open = false
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [])

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg p-1.5 pr-2 outline-none hover:bg-[#edf3f0] focus-visible:ring-2 focus-visible:ring-[#07845f]/25 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 place-items-center rounded-lg bg-[#0c6b50] text-xs font-bold text-white">{initials(admin.name)}</span>
        <span className="hidden min-w-0 text-left sm:block"><span className="block max-w-36 truncate text-sm font-bold text-[#17201c]">{admin.name}</span><span className="block text-[11px] text-[#78817d]">{admin.role.replaceAll("_", " ")}</span></span>
        <ChevronsUpDown className="hidden size-4 text-[#8b9490] sm:block" />
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border border-[#d9dfdc] bg-white p-2 shadow-[0_18px_48px_rgba(20,47,37,0.16)]">
        <div className="border-b border-[#edf1ef] px-3 py-3"><p className="truncate text-sm font-bold text-[#17201c]">{admin.name}</p><p className="mt-1 truncate text-xs text-[#78817d]">{admin.email}</p></div>
        <div className="py-2">
          <Link href="/dashboard/sessions" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#42504a] hover:bg-[#edf3f0]"><LockKeyhole className="size-4" /> Active sessions</Link>
          {can(["settings.manage"]) && <Link href="/dashboard/admins" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#42504a] hover:bg-[#edf3f0]"><ShieldCheck className="size-4" /> Platform admins</Link>}
          {can(["settings.manage"]) && <Link href="/dashboard/settings" className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#42504a] hover:bg-[#edf3f0]"><Settings className="size-4" /> Settings</Link>}
        </div>
        <button type="button" onClick={() => void logout()} className="flex h-10 w-full items-center gap-3 rounded-lg border-t border-[#edf1ef] px-3 text-sm font-semibold text-[#a43229] hover:bg-[#fff3f1]"><LogOut className="size-4" /> Sign out</button>
      </div>
    </details>
  )
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [bookingSearch, setBookingSearch] = useState("")
  const [bookingResults, setBookingResults] = useState<any[]>([])
  const [bookingSearching, setBookingSearching] = useState(false)
  const currentPage = findNavigationItem(pathname)

  useEffect(() => setMobileOpen(false), [pathname])

  useEffect(() => {
    const query = bookingSearch.trim()
    if (!query) { setBookingResults([]); return undefined }
    const timer = window.setTimeout(async () => {
      setBookingSearching(true)
      try {
        const response = await fetch(`/api/admin/bookings/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        setBookingResults(Array.isArray(payload?.data) ? payload.data : [])
      } catch { setBookingResults([]) } finally { setBookingSearching(false) }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [bookingSearch])

  const sidebar = (compact: boolean) => (
    <div className="flex h-full flex-col bg-[#071e16] px-3 py-5 text-white">
      <div className={cn("flex h-11 items-center", compact ? "justify-center" : "px-2")}><BrandMark inverse showName={!compact} /></div>
      <SidebarNavigation compact={compact} pathname={pathname} onNavigate={() => setMobileOpen(false)} onExpand={() => setDesktopCollapsed(false)} />
      <div className={cn("border-t border-white/10 pt-4", compact ? "flex justify-center" : "px-2")}>{compact ? <UserRound className="size-5 text-white/45" /> : <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">UfitGo governance</p>}</div>
    </div>
  )

  return (
    <div className={cn("min-h-dvh bg-[#f4f7f5] lg:grid", desktopCollapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar(desktopCollapsed)}</aside>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-[#061a13]/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} /><aside className="relative h-full w-[min(86vw,320px)] shadow-2xl">{sidebar(false)}</aside></div>}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[#d9dfdc] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} onClick={() => setMobileOpen((open) => !open)} className="grid size-10 place-items-center rounded-lg border border-[#d9dfdc] text-[#35443e] hover:bg-[#edf3f0] lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
          <button type="button" aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setDesktopCollapsed((collapsed) => !collapsed)} className="hidden size-9 place-items-center rounded-lg text-[#66716c] hover:bg-[#edf3f0] lg:grid">{desktopCollapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}</button>
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-[#89918d]">Admin workspace</p><h1 className="truncate text-base font-bold text-[#17201c]">{currentPage?.label || "UfitGo Admin"}</h1></div>
          <div className="relative hidden min-w-0 max-w-md flex-1 xl:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8b9490]" /><input value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} placeholder="Search bookings" aria-label="Search bookings" className="h-10 w-full rounded-lg border border-[#d9dfdc] bg-[#f7faf9] pl-9 pr-3 text-sm outline-none focus:border-[#0d7d5f]" />{bookingSearch && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#d9dfdc] bg-white shadow-xl">{bookingSearching ? <p className="p-4 text-sm text-[#68716d]">Searching…</p> : bookingResults.length ? bookingResults.map((booking) => <button key={booking.id} type="button" onClick={() => { setBookingSearch(""); router.push(`/dashboard/journeys/${booking.id}`) }} className="flex w-full items-center justify-between gap-3 border-b border-[#edf1ef] px-4 py-3 text-left last:border-0 hover:bg-[#f7faf9]"><span><span className="block text-sm font-semibold text-[#17201c]">{booking.bookingRef || `Booking #${booking.id}`}</span><span className="block text-xs text-[#68716d]">{booking.pilgrimName || "Applicant"}</span></span><span className="text-xs font-bold text-[#0d7d5f]">Open</span></button>) : <p className="p-4 text-sm text-[#68716d]">No bookings found.</p>}</div>}</div>
          <UserMenu />
        </header>
        <div>{children}</div>
      </div>
    </div>
  )
}
