"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import Link from "next/link"
import { AlertCircle, Banknote, BriefcaseBusiness, CircleDollarSign, Package, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

type RevenueStats = {
  bookingValue?: number
  collectedRevenue?: number
  registrationRevenue?: number
  packageRevenue?: number
  outstandingRevenue?: number
  totalBookings?: number
  trendingPackages?: Array<{ title?: string; bookingCount?: number; revenue?: number }>
  topOperators?: Array<{ companyName?: string; bookingCount?: number; revenue?: number }>
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function money(value?: number) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return "N0"
  if (amount >= 1_000_000_000) return `N${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `N${(amount / 1_000_000).toFixed(1)}M`
  return `N${amount.toLocaleString("en-NG")}`
}

function number(value?: number) {
  return Number(value ?? 0).toLocaleString("en-NG")
}

export default function RevenueAnalyticsPage() {
  const [range, setRange] = useState("30")
  const { data: stats, isLoading, isFetching, error, refetch } = useQuery<RevenueStats>({
    queryKey: ["analytics-revenue", range],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (range !== "all") {
        query.set("startDate", dateDaysAgo(Number(range)))
        query.set("endDate", dateDaysAgo(0))
      }
      const response = await fetch(`/api/admin/stats${query.toString() ? `?${query}` : ""}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load revenue analytics")
      return payload?.data || payload || {}
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })

  const total = Number(stats?.bookingValue ?? 0)
  const collected = Number(stats?.collectedRevenue ?? 0)
  const registration = Number(stats?.registrationRevenue ?? 0)
  const packageRevenue = Number(stats?.packageRevenue ?? 0)
  const outstanding = Number(stats?.outstandingRevenue ?? 0)
  const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0
  const metricCards: Array<{ label: string; value: string; note: string; Icon: LucideIcon; tone: string }> = [
    { label: "Collected revenue", value: money(collected), note: "Actually paid across bookings", Icon: Wallet, tone: "text-[#0c6b50]" },
    { label: "Total booking value", value: money(total), note: "Gross value in the period", Icon: CircleDollarSign, tone: "text-[#0f74c1]" },
    { label: "Outstanding balance", value: money(outstanding), note: "Still owed by pilgrims", Icon: AlertCircle, tone: "text-[#a43229]" },
    { label: "Collection rate", value: `${collectionRate}%`, note: `${number(stats?.totalBookings)} bookings in period`, Icon: TrendingUp, tone: "text-[#8a6500]" },
  ]
  const revenueLists: Array<{ title: string; Icon: LucideIcon; items?: Array<{ title?: string; companyName?: string; bookingCount?: number; revenue?: number }> }> = [
    { title: "Top packages by revenue", Icon: Package, items: stats?.trendingPackages },
    { title: "Top partners by revenue", Icon: BriefcaseBusiness, items: stats?.topOperators },
  ]

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Analytics</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Revenue analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Track money collected, booking value, outstanding balances, and the partners and packages driving platform revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <AppSelect value={range} onValueChange={setRange} options={rangeOptions} className="w-48" />
          <Link href="/dashboard/analytics/bookings" className="rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">View booking analytics</Link>
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0] disabled:opacity-50">{isFetching ? "Refreshing..." : "Refresh"}</button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{error instanceof Error ? error.message : "Unable to load revenue analytics"}</div>
      ) : isLoading ? (
        <div className="grid place-items-center rounded-xl border border-[#dbe2de] bg-white p-16"><div className="size-6 animate-spin rounded-full border-2 border-[#0d7d5f] border-t-transparent" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, note, Icon, tone }) => (
              <div key={label} className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">{label}</span><Icon className={`size-4 ${tone}`} /></div>
                <p className="mt-4 text-2xl font-bold text-[#17201c]">{value}</p>
                <p className="mt-1 text-xs text-[#7b8580]">{note}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
              <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#17201c]"><Banknote className="size-4 text-[#0d7d5f]" /> Payment composition</h2>
              <p className="mt-1 text-xs text-[#7b8580]">Collected registration and package payments compared with the original booking value.</p>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#edf1ef]">
                <div className="flex h-full"><div className="bg-[#0d7d5f]" style={{ width: `${total ? Math.min((registration / total) * 100, 100) : 0}%` }} /><div className="bg-[#0f74c1]" style={{ width: `${total ? Math.min((packageRevenue / total) * 100, 100) : 0}%` }} /><div className="bg-[#e8e2d0]" style={{ width: `${total ? Math.min((outstanding / total) * 100, 100) : 0}%` }} /></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[["Registration", registration, "bg-[#0d7d5f]"], ["Package payments", packageRevenue, "bg-[#0f74c1]"], ["Outstanding", outstanding, "bg-[#e8e2d0]"]].map(([label, value, tone]) => <div key={String(label)}><span className={`inline-block size-2.5 rounded-full ${tone}`} /><p className="mt-2 font-bold text-[#17201c]">{money(Number(value))}</p><p className="text-xs text-[#7b8580]">{label}</p></div>)}
              </div>
            </section>
            <section className="rounded-2xl border border-[#dbe2de] bg-[#071e16] p-5 text-white shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9de2c4]">Finance signal</p>
              <h2 className="mt-3 font-brand text-2xl font-bold">{collectionRate >= 70 ? "Healthy collection momentum" : "Collection needs attention"}</h2>
              <p className="mt-3 text-sm leading-6 text-[#c1d8ce]">{money(collected)} has been collected against {money(total)} in booking value. The remaining {money(outstanding)} represents potential follow-up and payment risk.</p>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {revenueLists.map(({ title, Icon, items }) => (
              <section key={title} className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-[#edf1ef] px-5 py-4"><Icon className="size-4 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">{title}</h2></div><div className="divide-y divide-[#edf1ef]">{!items?.length ? <p className="px-5 py-10 text-center text-sm text-[#7b8580]">No revenue activity in this period.</p> : items.map((item, index) => <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 px-5 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-bold text-[#17201c]">{item.title || item.companyName || "Unknown"}</p><p className="text-xs text-[#7b8580]">{number(item.bookingCount)} bookings</p></div><span className="shrink-0 text-sm font-bold text-[#0d7d5f]">{money(item.revenue)}</span></div>)}</div></section>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
