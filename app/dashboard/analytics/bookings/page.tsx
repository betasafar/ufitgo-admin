"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  BriefcaseBusiness,
  Package as PackageIcon,
  TrendingUp,
  Users,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

type BookingStats = {
  totalBookings?: number
  statusBreakdown?: Record<string, number>
  totalOperators?: number
  totalPackages?: number
  trendingPackages?: Array<{ packageId?: number | string; title?: string; bookingCount?: number; revenue?: number }>
  topOperators?: Array<{ operatorId?: number | string; companyName?: string; bookingCount?: number; revenue?: number }>
}

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
]

const statusTone: Record<string, string> = {
  fully_paid: "bg-[#0d7d5f]",
  confirmed: "bg-[#0d7d5f]",
  completed: "bg-[#0f74c1]",
  registration_paid: "bg-[#8a6500]",
  deposit_paid: "bg-[#8a6500]",
  pending: "bg-[#9aa39e]",
  cancelled: "bg-[#a43229]",
  disputed: "bg-[#a43229]",
  refund_pending: "bg-[#a43229]",
  refunded: "bg-[#a43229]",
  partially_refunded: "bg-[#a43229]",
}

function formatNumber(value?: number) {
  return Number(value ?? 0).toLocaleString("en-NG")
}

function isoDateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export default function BookingsAnalyticsPage() {
  const [range, setRange] = useState("30")
  const [stats, setStats] = useState<BookingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async (selectedRange: string) => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      if (selectedRange !== "all") {
        params.set("startDate", isoDateDaysAgo(Number(selectedRange)))
        params.set("endDate", isoDateDaysAgo(0))
      }
      const response = await fetch(`/api/admin/stats${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load booking analytics")
      setStats(payload?.data || payload || {})
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load booking analytics")
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const statusEntries = useMemo(() => {
    const entries = Object.entries(stats?.statusBreakdown || {})
    const total = entries.reduce((sum, [, count]) => sum + Number(count), 0)
    return entries
      .map(([status, count]) => ({ status, count: Number(count), percent: total > 0 ? Math.round((Number(count) / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Analytics</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Bookings analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Booking volume, lifecycle health, and demand signals across the platform. For money collected and outstanding balances, use Revenue analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <AppSelect value={range} onValueChange={setRange} options={rangeOptions} className="w-48" />
          <Link href="/dashboard/journeys" className="inline-flex items-center justify-center rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
            Open journey tracker
          </Link>
          <Link href="/dashboard/analytics/revenue" className="inline-flex items-center justify-center rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
            View revenue analytics
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{error}</div>
      ) : loading ? (
        <div className="grid place-items-center rounded-xl border border-[#dbe2de] bg-white p-16">
          <div className="size-6 animate-spin rounded-full border-2 border-[#0d7d5f] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total bookings</span>
                <BriefcaseBusiness className="size-4 text-[#07845f]" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatNumber(stats?.totalBookings)}</p>
              <p className="mt-1 text-xs text-[#7b8580]">In the selected period</p>
            </div>
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Completed bookings</span>
                <TrendingUp className="size-4 text-[#0f74c1]" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatNumber((stats?.statusBreakdown?.completed || 0) + (stats?.statusBreakdown?.fully_paid || 0))}</p>
              <p className="mt-1 text-xs text-[#7b8580]">Completed or fully paid</p>
            </div>
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total packages</span>
                <PackageIcon className="size-4 text-[#0c6b50]" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatNumber(stats?.totalPackages)}</p>
              <p className="mt-1 text-xs text-[#7b8580]">Available across partners</p>
            </div>
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active partners</span>
                <Users className="size-4 text-[#a43229]" />
              </div>
              <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatNumber(stats?.totalOperators)}</p>
              <p className="mt-1 text-xs text-[#7b8580]">Partners represented in data</p>
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
              <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#17201c]"><TrendingUp className="size-4 text-[#0d7d5f]" /> Status breakdown</h2>
              <p className="mt-1 text-xs text-[#7b8580]">Where bookings stand across their payment/fulfillment lifecycle.</p>
              <div className="mt-4 space-y-3">
                {statusEntries.length === 0 ? (
                  <p className="py-6 text-center text-sm text-[#7b8580]">No bookings in this period.</p>
                ) : (
                  statusEntries.map((entry) => (
                    <div key={entry.status}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold capitalize text-[#36413d]">{entry.status.replaceAll("_", " ")}</span>
                        <span className="text-[#7b8580]">{entry.count} bookings · {entry.percent}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#edf1ef]"><div className={`h-full rounded-full ${statusTone[entry.status] || "bg-[#9aa39e]"}`} style={{ width: `${entry.percent}%` }} /></div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#edf1ef] px-5 py-4">
                <PackageIcon className="size-4 text-[#0d7d5f]" />
                <h2 className="font-brand text-lg font-bold text-[#17201c]">Most booked packages</h2>
              </div>
              <div className="divide-y divide-[#edf1ef]">
                {(stats?.trendingPackages || []).length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-[#7b8580]">No package bookings in this period.</p>
                ) : (
                  stats?.trendingPackages?.map((item) => (
                    <Link key={String(item.packageId)} href={`/dashboard/packages/${item.packageId}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#f7faf9]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17201c]">{item.title || `Package #${item.packageId}`}</p>
                        <p className="text-xs text-[#7b8580]">{formatNumber(item.bookingCount)} bookings</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[#0d7d5f]">{formatNumber(item.bookingCount)} bookings</span>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#edf1ef] px-5 py-4">
                <BriefcaseBusiness className="size-4 text-[#0d7d5f]" />
                <h2 className="font-brand text-lg font-bold text-[#17201c]">Partners with most bookings</h2>
              </div>
              <div className="divide-y divide-[#edf1ef]">
                {(stats?.topOperators || []).length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-[#7b8580]">No partner bookings in this period.</p>
                ) : (
                  stats?.topOperators?.map((item) => (
                    <Link key={String(item.operatorId)} href={`/dashboard/operators/${item.operatorId}`} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#f7faf9]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17201c]">{item.companyName || `Partner #${item.operatorId}`}</p>
                        <p className="text-xs text-[#7b8580]">{formatNumber(item.bookingCount)} bookings</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[#0d7d5f]">{formatNumber(item.bookingCount)} bookings</span>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  )
}
