"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  AlertTriangle,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ChevronDown,
  ChevronUp,
  Package,
  Plane,
  ShieldCheck,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useAdminSession } from "@/components/auth/session-provider"
import { DashboardEmpty, DashboardError, DashboardLoading } from "@/components/dashboard/dashboard-states"
import { MetricCard, type MetricTone } from "@/components/dashboard/metric-card"
import { cn } from "@/lib/utils"

interface MetricDefinition {
  label: string
  value: string
  description: string
  icon: LucideIcon
  tone: MetricTone
}

interface SummaryItem {
  id: string
  label: string
  detail: string
  value: string
}

interface BookingAction {
  id: string
  bookingRef: string
  customer: string
  task: string
  owner: string
  tone: "red" | "gold" | "blue"
}

interface DashboardView {
  eyebrow: string
  title: string
  description: string
  metrics: MetricDefinition[]
  primaryTitle: string
  primary: SummaryItem[]
  secondaryTitle: string
  secondary: SummaryItem[]
}

function money(value: unknown) {
  const amount = Number(value || 0)
  return amount >= 1_000_000 ? `₦${(amount / 1_000_000).toFixed(1)}M` : `₦${amount.toLocaleString("en-NG")}`
}

function number(value: unknown) {
  return Number(value || 0).toLocaleString("en-NG")
}

function bookingActions(bookings: any[]): BookingAction[] {
  return bookings.map((booking) => {
    const stage = booking.currentJourneyStage || "CHECKOUT_INITIATED"
    const outstanding = Number(booking.paymentBreakdown?.totalOutstanding ?? booking.totalOutstanding ?? Number(booking.totalAmountPayable ?? booking.totalAmount ?? 0) - Number(booking.totalPaid ?? booking.amountPaid ?? 0))
    if (["AWAITING_CONCIERGE", "BOOKING_SECURED"].includes(stage)) return { id: String(booking.id), bookingRef: booking.bookingRef || `#${booking.id}`, customer: booking.pilgrimName || "Customer", task: "Contact customer and start document collection", owner: booking.assignedConcierge || "You", tone: "red" }
    if (["CONCIERGE_PROCESSING", "CONCIERGE_REVIEW", "DOCUMENTS_PENDING"].includes(stage)) return { id: String(booking.id), bookingRef: booking.bookingRef || `#${booking.id}`, customer: booking.pilgrimName || "Customer", task: "Follow up on documents or assistance", owner: booking.assignedConcierge || "You", tone: "gold" }
    if (["DOCUMENTS_VERIFIED", "PAYMENT_PHASE", "PAYMENT_PENDING"].includes(stage) && outstanding > 0) return { id: String(booking.id), bookingRef: booking.bookingRef || `#${booking.id}`, customer: booking.pilgrimName || "Customer", task: "Monitor outstanding package payment", owner: "Customer", tone: "gold" }
    if (["FULFILLMENT_READY", "OPERATOR_HANDOFF", "VISA_PROCESSING"].includes(stage)) return { id: String(booking.id), bookingRef: booking.bookingRef || `#${booking.id}`, customer: booking.pilgrimName || "Customer", task: "Follow up with operator and update fulfilment", owner: "UfitGo Operations", tone: "blue" }
    return null
  }).filter(Boolean) as BookingAction[]
}

function executiveView(data: Record<string, any>, name: string): DashboardView {
  const statusBreakdown = Object.entries(data.statusBreakdown || {})
  .map(([status, count]) => ({ id: status, label: status.replaceAll("_", " "), detail: "Booking status", value: number(count) }))
  return {
    eyebrow: "Executive overview",
    title: `Welcome back, ${name}`,
    description: "A live view of bookings, inventory, revenue, and operator performance.",
    metrics: [
      { label: "Total bookings", value: number(data.totalBookings), description: "Bookings in the selected reporting period", icon: Plane, tone: "green" },
      { label: "Active packages", value: number(data.totalPackages), description: "Bookable inventory across operators", icon: Package, tone: "gold" },
      { label: "Package revenue", value: money(data.packageRevenue ?? data.collectedRevenue), description: `${money(data.packageOutstanding ?? data.outstandingRevenue)} package balance remains outstanding`, icon: CircleDollarSign, tone: "blue" },
      { label: "Verified operators", value: number(data.totalOperators), description: "Approved partners on the platform", icon: ShieldCheck, tone: "green" },
    ],
    primaryTitle: "Top operators",
    primary: (data.topOperators || []).slice(0, 5).map((item: any, index: number) => ({ id: String(item.operatorId || index), label: item.companyName || `Operator #${item.operatorId}`, detail: `${number(item.bookingCount)} bookings`, value: money(item.revenue) })),
    secondaryTitle: "Booking health",
    secondary: statusBreakdown.slice(0, 6),
  }
}

function operationsView(data: Record<string, any>, name: string): DashboardView {
  const attention = [
    { id: "pending", label: "Draft packages", detail: "Awaiting review or publication", value: number(data.pendingPackages) },
    { id: "failed", label: "Failed or disputed bookings", detail: "Require operational attention", value: number(data.failedBookings) },
  ].filter((item) => item.value !== "0")
  return {
    eyebrow: "Operations command centre",
    title: `Good day, ${name}`,
    description: "Monitor active journeys and the workflows that need attention today.",
    metrics: [
      { label: "Draft packages", value: number(data.pendingPackages), description: "Inventory waiting for action", icon: Package, tone: "gold" },
      { label: "Active journeys", value: number(data.activeJourneys), description: "Customers currently in fulfilment", icon: Plane, tone: "green" },
      { label: "Failed bookings", value: number(data.failedBookings), description: "Disputed, failed, or refund pending", icon: AlertTriangle, tone: "red" },
      { label: "New customers", value: number(data.newCustomers), description: "Bookings created in the last day", icon: Users, tone: "blue" },
    ],
    primaryTitle: "Needs attention",
    primary: attention,
    secondaryTitle: "Operational rhythm",
    secondary: [
      { id: "review", label: "Review package drafts", detail: "Confirm dates, pricing, and operator readiness", value: "Daily" },
      { id: "journeys", label: "Check journey follow-ups", detail: "Keep concierge and visa progress current", value: "Live" },
      { id: "failures", label: "Resolve failed bookings", detail: "Investigate payment and fulfilment blockers", value: "Priority" },
    ],
  }
}

function specialistView(role: string, data: Record<string, any>, name: string): DashboardView {
  const definitions: Record<string, { eyebrow: string; description: string; metrics: MetricDefinition[] }> = {
    COMPLIANCE: {
      eyebrow: "Compliance overview",
      description: "Identity verification and platform-risk workload.",
      metrics: [
        { label: "Pending KYC", value: number(data.pendingKyc), description: "Verification reviews outstanding", icon: Clock3, tone: "gold" },
        { label: "Failed verification", value: number(data.failedVerifications), description: "Cases requiring review", icon: AlertTriangle, tone: "red" },
        { label: "Risk signals", value: number(data.suspiciousAccounts), description: "Accounts flagged for investigation", icon: ShieldCheck, tone: "blue" },
      ],
    },
    SUPPORT: {
      eyebrow: "Support overview",
      description: "Customer issues and cases awaiting intervention.",
      metrics: [
        { label: "Open tickets", value: number(data.openTickets), description: "Support conversations awaiting action", icon: TicketCheck, tone: "blue" },
        { label: "Failed bookings", value: number(data.failedBookings), description: "Booking cases requiring support", icon: AlertTriangle, tone: "red" },
        { label: "Pending KYC", value: number(data.pendingKyc), description: "Customers awaiting verification", icon: Users, tone: "gold" },
      ],
    },
    FINANCE: {
      eyebrow: "Finance overview",
      description: "Revenue, settlement, and payment performance.",
      metrics: [
        { label: "Revenue", value: money(data.totalRevenue || data.revenue), description: "Recorded platform revenue", icon: Banknote, tone: "green" },
        { label: "Pending settlements", value: money(data.pendingSettlements), description: "Funds awaiting settlement", icon: Clock3, tone: "gold" },
        { label: "Transactions", value: number(data.totalTransactions), description: "Processed payment events", icon: CheckCircle2, tone: "blue" },
      ],
    },
    TECHNICAL: {
      eyebrow: "Platform health",
      description: "Current service status and infrastructure signals.",
      metrics: [
        { label: "Services online", value: number(data.servicesOnline || data.healthyServices), description: "Healthy monitored services", icon: CheckCircle2, tone: "green" },
        { label: "Warnings", value: number(data.warnings), description: "Signals requiring observation", icon: AlertTriangle, tone: "gold" },
      ],
    },
  }
  const definition = definitions[role] || definitions.SUPPORT
  return {
    ...definition,
    title: `Welcome back, ${name}`,
    primaryTitle: "Current summary",
    primary: Object.entries(data).slice(0, 6).map(([key, value]) => ({ id: key, label: key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " "), detail: "Current reported value", value: typeof value === "number" ? number(value) : String(value) })),
    secondaryTitle: "Next actions",
    secondary: [
      { id: "review", label: "Review your assigned workspace", detail: "Use the permission-aware navigation for detailed operations", value: "Open" },
    ],
  }
}

function endpointForRole(role: string) {
  if (["SUPER_ADMIN", "MANAGING_DIRECTOR"].includes(role)) return "/api/admin/stats"
  if (role === "OPERATIONS") return "/api/admin/stats/operations"
  if (role === "COMPLIANCE") return "/api/admin/stats/compliance"
  if (role === "FINANCE") return "/api/admin/stats/finance"
  if (role === "SUPPORT") return "/api/admin/stats/support"
  if (role === "TECHNICAL") return "/api/admin/health"
  return "/api/admin/stats/operations"
}

function PerformancePanel({ metrics }: { metrics: MetricDefinition[] }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dbe2de] bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-brand text-xl font-bold text-[#17201c]">Performance snapshot</h2><p className="mt-1 text-xs text-[#7b8580]">Current headline indicators from live platform records</p></div>
        <BarChart3 className="size-5 text-[#07845f]" />
      </div>
      <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-lg border border-[#e4e9e6] sm:grid-cols-2">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="flex min-w-0 items-start gap-4 border-b border-[#e4e9e6] p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf5f1] text-[#07845f]"><Icon className="size-4" /></span>
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#78817d]">{metric.label}</p><strong className="mt-1 block truncate text-xl text-[#17201c]">{metric.value}</strong><p className="mt-1 text-xs leading-5 text-[#87908c]">{metric.description}</p></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PriorityPanel({ title, items }: { title: string; items: SummaryItem[] }) {
  return (
    <section className="min-w-0 rounded-lg border border-[#dbe2de] bg-white">
      <div className="flex items-center justify-between border-b border-[#edf1ef] px-5 py-4"><h2 className="font-brand text-lg font-bold text-[#17201c]">{title}</h2><span className="rounded-full bg-[#fff1d0] px-2 py-1 text-[10px] font-bold uppercase text-[#8a6500]">{items.length} items</span></div>
      <div className="divide-y divide-[#edf1ef] px-5">
        {items.slice(0, 5).map((item, index) => (
          <div key={item.id} className="flex items-start gap-3 py-4">
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", index === 0 ? "bg-[#dc3f35]" : index === 1 ? "bg-[#e2b316]" : "bg-[#3478c5]")} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold capitalize text-[#26332e]">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#7b8580]">{item.detail}</p></div>
            <span className="shrink-0 text-xs font-bold text-[#52625b]">{item.value}</span>
          </div>
        ))}
        {!items.length && <p className="py-10 text-center text-sm text-[#87908c]">Nothing currently needs attention.</p>}
      </div>
    </section>
  )
}

function SummaryTable({ title, items }: { title: string; items: SummaryItem[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#dbe2de] bg-white">
      <div className="border-b border-[#edf1ef] px-5 py-4 sm:px-6"><h2 className="font-brand text-lg font-bold text-[#17201c]">{title}</h2><p className="mt-1 text-xs text-[#7b8580]">Current operational breakdown</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]"><tr><th className="px-6 py-3 font-bold">Item</th><th className="px-6 py-3 font-bold">Context</th><th className="px-6 py-3 text-right font-bold">Value</th></tr></thead>
          <tbody className="divide-y divide-[#edf1ef]">{items.map((item) => <tr key={item.id}><td className="px-6 py-4 font-bold capitalize text-[#26332e]">{item.label}</td><td className="px-6 py-4 text-[#78817d]">{item.detail}</td><td className="px-6 py-4 text-right font-bold text-[#17201c]">{item.value}</td></tr>)}</tbody>
        </table>
      </div>
      {!items.length && <p className="py-10 text-center text-sm text-[#87908c]">No detailed records available.</p>}
    </section>
  )
}

function ActionRequiredPanel({ actions }: { actions: BookingAction[] }) {
  const [open, setOpen] = useState(true)
  return <section className="rounded-lg border border-[#dbe2de] bg-white"><button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 border-b border-[#edf1ef] px-5 py-4 text-left"><div><h2 className="font-brand text-lg font-bold text-[#17201c]">Action required</h2><p className="mt-1 text-xs text-[#7b8580]">Bookings that need a clear next step</p></div><span className="flex items-center gap-3"><span className="rounded-full bg-[#fff1d0] px-2 py-1 text-[10px] font-bold uppercase text-[#8a6500]">{actions.length} open</span>{open ? <ChevronUp className="size-4 text-[#68716d]" /> : <ChevronDown className="size-4 text-[#68716d]" />}</span></button>{open && <div className="divide-y divide-[#edf1ef]">{actions.slice(0, 6).map((action) => <Link key={action.id} href={`/dashboard/journeys/${action.id}`} className="flex items-start gap-3 px-5 py-4 transition hover:bg-[#f7faf9]"><span className={cn("mt-1 size-2 shrink-0 rounded-full", action.tone === "red" ? "bg-[#dc3f35]" : action.tone === "gold" ? "bg-[#e2b316]" : "bg-[#3478c5]")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#26332e]">{action.task}</p><span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#7b8580]">{action.bookingRef}</span></div><p className="mt-1 text-xs text-[#7b8580]">{action.customer} · Owner: {action.owner}</p></div><ArrowRight className="mt-1 size-4 shrink-0 text-[#0d7d5f]" /></Link>)}{!actions.length && <div className="px-5 py-10 text-center text-sm text-[#87908c]">No booking actions require attention right now.</div>}</div>}</section>
}

export function DashboardOverview() {
  const { admin, can } = useAdminSession()
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [bookingActionsData, setBookingActionsData] = useState<BookingAction[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const requests = [fetch(endpointForRole(admin.role), { cache: "no-store" })]
      if (can(["bookings.manage"]) || can(["journeys.manage"])) requests.push(fetch("/api/admin/bookings/journey-tracker?limit=100", { cache: "no-store" }))
      const [response, bookingsResponse] = await Promise.all(requests)
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load dashboard data.")
      setData(payload?.data || payload || {})
      if (bookingsResponse) {
        const bookingsPayload = await bookingsResponse.json().catch(() => null)
        const bookings = Array.isArray(bookingsPayload?.data) ? bookingsPayload.data : Array.isArray(bookingsPayload) ? bookingsPayload : []
        setBookingActionsData(bookingActions(bookings))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }, [admin.role, can])

  useEffect(() => { void load() }, [load])

  const view = useMemo(() => {
    if (!data) return null
    if (["SUPER_ADMIN", "MANAGING_DIRECTOR"].includes(admin.role)) return executiveView(data, admin.name)
    if (admin.role === "OPERATIONS") return operationsView(data, admin.name)
    return specialistView(admin.role, data, admin.name)
  }, [admin.name, admin.role, data])

  if (loading) return <DashboardLoading />
  if (error) return <DashboardError message={error} onRetry={() => void load()} />
  if (!view || (!view.metrics.some((metric) => metric.value !== "0" && metric.value !== "₦0") && !view.primary.length)) {
    return <DashboardEmpty message="Operational information will appear once activity is recorded for your workspace." />
  }

  return (
    <div className="space-y-6">
      {(can(["bookings.manage"]) || can(["journeys.manage"])) && <ActionRequiredPanel actions={bookingActionsData} />}
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#07845f]">{view.eyebrow}</p>
          <h1 className="font-brand mt-2 text-3xl font-bold tracking-tight text-[#17201c] sm:text-4xl">{view.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">{view.description}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-[#8a928e]"><CalendarDays className="size-3.5" /> {new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/sessions" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 text-sm font-bold text-[#405149] hover:bg-[#edf3f0]">Active sessions</Link>
          <Link href="/fcmb-webhooks" className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 text-sm font-bold text-[#405149] hover:bg-[#edf3f0]">Goto  Webhook</Link>
          {can(["settings.manage"]) && <Link href="/dashboard/admins" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e5b814] px-4 text-sm font-bold text-[#282410] hover:bg-[#d2a70f]">Manage admins <ArrowRight className="size-4" /></Link>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {view.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-[#d9dfdc] bg-[#10271e] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e5b814] text-[#302a0a]"><CheckCircle2 className="size-5" /></span><div><h2 className="font-brand text-lg font-bold">Operational data connected</h2><p className="mt-1 text-sm text-white/60">Dashboard summaries are synchronized with the UfitGo admin APIs.</p></div></div>
        <span className="self-start rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold text-[#83dfbd] sm:self-auto">Live</span>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.75fr)]">
        <PerformancePanel metrics={view.metrics} />
        <PriorityPanel title={view.primaryTitle} items={view.primary} />
      </div>

      <SummaryTable title={view.secondaryTitle} items={view.secondary} />
    </div>
  )
}
