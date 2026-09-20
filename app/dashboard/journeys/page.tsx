"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PaginationBar } from "@/components/ui/pagination-bar"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Map,
  Search,
  UserRound,
} from "lucide-react"

type BookingRecord = {
  id?: string | number
  bookingRef?: string
  pilgrimName?: string
  pilgrimPhone?: string
  packageName?: string
  currentJourneyStage?: string
  stageEnteredAt?: string
  assignedConcierge?: string
  followUpCount?: number
  nextFollowUpAt?: string
  status?: string
  createdAt?: string
}

// The canonical, current journey stages. Legacy values (BOOKING_SECURED, DOCUMENTS_PENDING,
// CONCIERGE_REVIEW, PAYMENT_PENDING) still appear on older bookings and are mapped into these.
const stageTabs = [
  { value: "all", label: "All bookings" },
  { value: "AWAITING_CONCIERGE", label: "Awaiting concierge" },
  { value: "CONCIERGE_PROCESSING", label: "Processing" },
  { value: "DOCUMENTS_VERIFIED", label: "Documents verified" },
  { value: "PAYMENT_PHASE", label: "Payment phase" },
  { value: "FULFILLMENT_READY", label: "Fulfillment ready" },
  { value: "COMPLETED", label: "Completed" },
] as const

const legacyStageMap: Record<string, string> = {
  BOOKING_SECURED: "AWAITING_CONCIERGE",
  DOCUMENTS_PENDING: "CONCIERGE_PROCESSING",
  CONCIERGE_REVIEW: "CONCIERGE_PROCESSING",
  PAYMENT_PENDING: "PAYMENT_PHASE",
}

function normalizeStage(stage?: string) {
  const value = stage || "CHECKOUT_INITIATED"
  return legacyStageMap[value] || value
}

function stageLabel(stage?: string) {
  const value = normalizeStage(stage)
  return stageTabs.find((tab) => tab.value === value)?.label || value.replaceAll("_", " ")
}

function stageTone(stage?: string) {
  const value = normalizeStage(stage)
  switch (value) {
    case "COMPLETED":
      return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
    case "FULFILLMENT_READY":
      return "bg-[#e8f2ff] text-[#0f5fa8] border border-[#cfe3f7]"
    case "PAYMENT_PHASE":
      return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
    case "DOCUMENTS_VERIFIED":
      return "bg-[#f1ecff] text-[#5b3fb0] border border-[#e0d6fb]"
    case "CONCIERGE_PROCESSING":
      return "bg-[#e8fbff] text-[#0f7f9a] border border-[#cdeef5]"
    default:
      return "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]"
  }
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function isOverdue(value?: string) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now()
}

type JourneyTrackerQueryResult = {
  bookings: BookingRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
  stageCounts: Record<string, number>
  summary: { active: number; unassigned: number; overdue: number; completed: number }
}

const JOURNEYS_PAGE_SIZE = 20

async function fetchJourneyTracker(params: { search: string; stage: string; page: number }): Promise<JourneyTrackerQueryResult> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(JOURNEYS_PAGE_SIZE) })
  if (params.search.trim()) query.set("search", params.search.trim())
  if (params.stage !== "all") query.set("stage", params.stage)

  const response = await fetch(`/api/admin/bookings/journey-tracker?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load bookings")

  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  return {
    bookings: list,
    total: Number(payload?.total ?? list.length),
    page: Number(payload?.page ?? params.page),
    limit: Number(payload?.limit ?? JOURNEYS_PAGE_SIZE),
    totalPages: Number(payload?.totalPages ?? 1),
    stageCounts: (payload?.stageCounts as Record<string, number>) || {},
    summary: payload?.summary || { active: 0, unassigned: 0, overdue: 0, completed: 0 },
  }
}

export default function JourneyTrackerPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, stageFilter])

  const { data, isLoading, isFetching, error, refetch } = useQuery<JourneyTrackerQueryResult>({
    queryKey: ["journey-tracker", debouncedSearch, stageFilter, page],
    queryFn: () => fetchJourneyTracker({ search: debouncedSearch, stage: stageFilter, page }),
    placeholderData: (previous) => previous,
  })

  const bookings = data?.bookings ?? []
  const stageCounts = data?.stageCounts ?? {}
  const summary = data?.summary ?? { active: 0, unassigned: 0, overdue: 0, completed: 0 }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Operations</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Bookings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Manage every booking from checkout to fulfillment, spot who needs a follow-up, and jump straight into the details that matter.</p>
        </div>
        <button type="button" onClick={() => void refetch()} className="inline-flex items-center justify-center rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
          Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active bookings</span>
            <Map className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.active}</p>
          <p className="mt-1 text-xs text-[#7b8580]">In progress, not yet completed</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Unassigned</span>
            <UserRound className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.unassigned}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Waiting for a concierge</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Follow-ups overdue</span>
            <AlertCircle className="size-4 text-[#b2382f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.overdue}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Next follow-up date has passed</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Completed</span>
            <CheckCircle2 className="size-4 text-[#0c6b50]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.completed}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Fulfilled bookings</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {stageTabs.map((tab) => {
            const isActive = stageFilter === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStageFilter(tab.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]"
                    : "border-[#d9dfdc] bg-white text-[#44544e] hover:bg-[#eef4f1]"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white text-[#0d7d5f]" : "bg-[#edf3f0] text-[#4f5d58]"}`}>{stageCounts[tab.value] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by pilgrim name, phone, or booking ref" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#17201c] outline-none ring-0 transition focus:border-[#0d7d5f]" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Booking</th>
                <th className="px-5 py-3 font-bold">Pilgrim</th>
                <th className="px-5 py-3 font-bold">Stage</th>
                <th className="px-5 py-3 font-bold">Concierge</th>
                <th className="px-5 py-3 font-bold">Follow-up</th>
                <th className="px-5 py-3 font-bold">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading bookings…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load bookings"}</td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">No bookings match the current filters.</td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const overdue = isOverdue(booking.nextFollowUpAt)
                  return (
                    <tr key={String(booking.id)} className="cursor-pointer transition-colors hover:bg-[#f7faf9]" onClick={() => window.location.assign(`/dashboard/journeys/${booking.id}`)}>
                      <td className="px-5 py-4">
                        <span className="block truncate text-sm font-bold text-[#17201c]">{booking.bookingRef || `#${booking.id}`}</span>
                        <span className="mt-0.5 block text-xs text-[#72807b]">{booking.packageName || "Package unavailable"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block text-sm font-semibold text-[#17201c]">{booking.pilgrimName || "—"}</span>
                        <span className="mt-0.5 block text-xs text-[#72807b]">{booking.pilgrimPhone || "No phone"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${stageTone(booking.currentJourneyStage)}`}>{stageLabel(booking.currentJourneyStage)}</span>
                        <span className="mt-1 block text-[11px] text-[#9aa39e]">Since {formatDate(booking.stageEnteredAt)}</span>
                      </td>
                      <td className="px-5 py-4">
                        {booking.assignedConcierge ? (
                          <div className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-full bg-[#eaf9f3] text-[11px] font-bold text-[#0d7d5f]">{booking.assignedConcierge.charAt(0).toUpperCase()}</span>
                            <span className="text-sm font-semibold text-[#17201c]">{booking.assignedConcierge}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-[#9aa39e]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-[#68716d]">{booking.followUpCount || 0} contact{booking.followUpCount === 1 ? "" : "s"}</div>
                        {booking.nextFollowUpAt && (
                          <div className={`mt-1 flex items-center gap-1 text-xs font-semibold ${overdue ? "text-[#a43229]" : "text-[#0f74c1]"}`}>
                            <Clock className="size-3.5" /> {formatDate(booking.nextFollowUpAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-[#68716d]">{formatDate(booking.createdAt)}</span></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {data && (
          <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} isFetching={isFetching} />
        )}
      </section>
    </main>
  )
}
