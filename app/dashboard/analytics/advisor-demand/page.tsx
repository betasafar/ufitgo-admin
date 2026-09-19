"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BarChart3, CalendarDays, Mail, RefreshCw, SearchX, Users, type LucideIcon } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

type CountItem = { label: string; count: number }
type DemandReport = {
  period: { startDate: string; endDate: string }
  summary: { totalRequests: number; uniqueUsers: number; averageBudget: number | null; noMatchCount: number; noMatchRate: number }
  destinations: CountItem[]
  travelPeriods: CountItem[]
  intents: CountItem[]
  outcomes: CountItem[]
  budgetBands: CountItem[]
  requestedFeatures: CountItem[]
  trend: Array<{ date: string; count: number }>
}

function dateRange(days: number) {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
}

function RankedList({ title, items }: { title: string; items?: CountItem[] }) {
  const maximum = Math.max(...(items || []).map((item) => item.count), 1)
  return <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm"><h2 className="font-brand text-lg font-bold text-[#17201c]">{title}</h2><div className="mt-5 space-y-4">{!(items || []).length ? <p className="py-5 text-center text-sm text-[#7b8580]">No demand recorded.</p> : items?.map((item) => <div key={item.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate capitalize text-[#36413d]">{item.label.replaceAll("_", " ")}</span><strong className="text-[#17201c]">{item.count}</strong></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#0d7d5f]" style={{ width: `${Math.max((item.count / maximum) * 100, 4)}%` }} /></div></div>)}</div></section>
}

export default function AdvisorDemandPage() {
  const [rangeDays, setRangeDays] = useState("30")
  const dates = useMemo(() => dateRange(Number(rangeDays)), [rangeDays])
  const { data, isLoading, isFetching, error, refetch } = useQuery<DemandReport>({
    queryKey: ["advisor-demand", rangeDays],
    queryFn: async () => {
      const query = new URLSearchParams(dates)
      const response = await fetch(`/api/admin/advisor-demand?${query}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load Lima demand report")
      return payload
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })
  const emailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/advisor-demand/send-weekly-report", { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Could not send weekly report")
      return payload
    },
  })
  const summary = data?.summary
  const trendMaximum = Math.max(...(data?.trend || []).map((item) => item.count), 1)
  const metrics: Array<{ label: string; value: string | number; note: string; Icon: LucideIcon }> = [
    { label: "Requests", value: summary?.totalRequests ?? 0, note: `Across ${rangeDays} days`, Icon: BarChart3 },
    { label: "Unique users", value: summary?.uniqueUsers ?? 0, note: "Anonymized customers", Icon: Users },
    { label: "No matching package", value: `${summary?.noMatchRate ?? 0}%`, note: `${summary?.noMatchCount ?? 0} unmet requests`, Icon: SearchX },
    { label: "Average budget", value: summary?.averageBudget ? `N${Number(summary.averageBudget).toLocaleString("en-NG")}` : "Not enough data", note: "Where users stated a budget", Icon: CalendarDays },
  ]

  return <main className="space-y-6 p-5 sm:p-8"><header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Analytics</p><h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Lima demand insights</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Use anonymized requests from Lima to understand what pilgrims want and help partners shape packages around real demand.</p></div><div className="flex flex-wrap items-center gap-3"><AppSelect value={rangeDays} onValueChange={setRangeDays} options={rangeOptions} className="w-44" /><button type="button" onClick={() => void refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0] disabled:opacity-50"><RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button><button type="button" onClick={() => emailMutation.mutate()} disabled={emailMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"><Mail className="size-4" /> {emailMutation.isPending ? "Sending..." : "Send weekly report"}</button></div></header>

    {emailMutation.isSuccess && <div className="rounded-xl border border-[#cfeee0] bg-[#eaf9f3] p-4 text-sm font-semibold text-[#0c6b50]">Weekly demand report sent to {emailMutation.data?.recipients ?? "the selected"} admin recipients.</div>}
    {emailMutation.isError && <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-4 text-sm font-semibold text-[#a43229]">{emailMutation.error instanceof Error ? emailMutation.error.message : "Could not send report"}</div>}
    {error ? <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-8 text-center"><SearchX className="mx-auto size-8 text-[#a43229]" /><p className="mt-3 text-sm font-semibold text-[#a43229]">{error instanceof Error ? error.message : "Demand report unavailable"}</p></div> : isLoading ? <div className="grid place-items-center rounded-xl border border-[#dbe2de] bg-white p-16"><RefreshCw className="size-6 animate-spin text-[#0d7d5f]" /></div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, Icon }) => <div key={label} className="rounded-xl border border-[#dbe2de] bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">{label}</span><Icon className="size-4 text-[#07845f]" /></div><p className="mt-4 text-2xl font-bold text-[#17201c]">{value}</p><p className="mt-1 text-xs text-[#7b8580]">{note}</p></div>)}</div>
      <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-brand text-lg font-bold text-[#17201c]">Daily request volume</h2>{data?.period && <span className="text-xs text-[#7b8580]">{new Date(data.period.startDate).toLocaleDateString()} - {new Date(data.period.endDate).toLocaleDateString()}</span>}</div>{!data?.trend?.length ? <p className="py-10 text-center text-sm text-[#7b8580]">New demand will appear here as customers chat with Lima.</p> : <div className="mt-6 flex h-48 items-end gap-1 border-b border-[#edf1ef] px-1 sm:gap-2">{data.trend.map((item) => <div key={item.date} className="group relative flex h-full min-w-1 flex-1 items-end"><div className="w-full rounded-t-sm bg-[#0d7d5f]" style={{ height: `${Math.max((item.count / trendMaximum) * 100, 3)}%` }} /><span className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#17201c] px-2 py-1 text-[10px] text-white group-hover:block">{item.count} on {item.date}</span></div>)}</div>}</section>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3"><RankedList title="Pilgrimage demand" items={data?.destinations} /><RankedList title="Requested travel periods" items={data?.travelPeriods} /><RankedList title="What customers ask Lima" items={data?.intents} /><RankedList title="Budget distribution" items={data?.budgetBands} /><RankedList title="Search outcomes" items={data?.outcomes} /><RankedList title="Requested package features" items={data?.requestedFeatures} /></div>
    </>}
  </main>
}
