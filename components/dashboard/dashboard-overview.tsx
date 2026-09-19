"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
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
      { label: "Collected revenue", value: money(data.collectedRevenue), description: `${money(data.outstandingRevenue)} remains outstanding`, icon: CircleDollarSign, tone: "blue" },
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

function SummaryPanel({ title, items }: { title: string; items: SummaryItem[] }) {
  return (
    <section className="min-w-0 rounded-xl border border-[#dbe2de] bg-white p-5 sm:p-6">
      <h2 className="font-brand text-xl font-bold text-[#17201c]">{title}</h2>
      <div className="mt-5 divide-y divide-[#edf1ef]">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0"><p className="truncate text-sm font-bold capitalize text-[#26332e]">{item.label}</p><p className="mt-1 text-xs leading-5 text-[#7b8580]">{item.detail}</p></div>
            <span className="shrink-0 rounded-md bg-[#edf3f0] px-2.5 py-1 text-xs font-bold text-[#476157]">{item.value}</span>
          </div>
        ))}
        {!items.length && <p className="py-8 text-center text-sm text-[#87908c]">No items require attention.</p>}
      </div>
    </section>
  )
}

export function DashboardOverview() {
  const { admin } = useAdminSession()
  const [data, setData] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(endpointForRole(admin.role), { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load dashboard data.")
      setData(payload?.data || payload || {})
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data.")
    } finally {
      setLoading(false)
    }
  }, [admin.role])

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
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#07845f]">{view.eyebrow}</p>
          <h1 className="font-brand mt-2 text-3xl font-bold tracking-tight text-[#17201c] sm:text-4xl">{view.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68716d]">{view.description}</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-[#d9dfdc] bg-white px-3 py-2 text-xs font-semibold text-[#64706b] sm:self-auto"><CalendarDays className="size-4 text-[#07845f]" /> Live operational data</div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {view.metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SummaryPanel title={view.primaryTitle} items={view.primary} />
        <SummaryPanel title={view.secondaryTitle} items={view.secondary} />
      </div>
    </div>
  )
}
