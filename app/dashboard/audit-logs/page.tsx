"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity, FileSearch, Search, ShieldAlert, Trash2, Upload, UserPlus, Users } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"

type AccessLog = {
  id: string
  adminEmail: string
  action: string
  bookingId?: number
  travelerId?: string
  docId?: string
  createdAt: string
}

const actionLabels: Record<string, string> = {
  LIST_TRAVELERS: "Listed travelers",
  ADD_COMPANION: "Added companion",
  UPDATE_TRAVELER: "Updated traveler",
  REMOVE_COMPANION: "Removed companion",
  VIEW_DOCUMENTS: "Viewed documents",
  UPLOAD_DOCUMENT: "Uploaded document",
  DELETE_DOCUMENT: "Deleted document",
}

const actionIcons: Record<string, React.ElementType> = {
  LIST_TRAVELERS: Users,
  ADD_COMPANION: UserPlus,
  UPDATE_TRAVELER: Users,
  REMOVE_COMPANION: Users,
  VIEW_DOCUMENTS: FileSearch,
  UPLOAD_DOCUMENT: Upload,
  DELETE_DOCUMENT: Trash2,
}

const actionOptions = [
  { value: "all", label: "All actions" },
  ...Object.entries(actionLabels).map(([value, label]) => ({ value, label })),
]

const PAGE_SIZE = 20
const COMPLIANCE_CACHE_TIME = 60_000
const COMPLIANCE_GC_TIME = 10 * 60_000

type AuditLogsQueryResult = {
  logs: AccessLog[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats: { documentViews: number; deletions: number }
}

async function fetchLogs(params: { search: string; action: string; page: number }): Promise<AuditLogsQueryResult> {
  const query = new URLSearchParams({
    search: params.search,
    action: params.action,
    page: String(params.page),
    limit: String(PAGE_SIZE),
  })
  const response = await fetch(`/api/admin/bookings/document-access-logs?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load audit logs")
  const logs = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  return {
    logs,
    total: Number(payload?.total ?? logs.length),
    page: Number(payload?.page ?? params.page),
    limit: Number(payload?.limit ?? PAGE_SIZE),
    totalPages: Number(payload?.totalPages ?? 1),
    stats: payload?.stats ?? { documentViews: 0, deletions: 0 },
  }
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, actionFilter])

  const { data, isLoading, isFetching, error } = useQuery<AuditLogsQueryResult>({
    queryKey: ["document-access-logs", debouncedSearch, actionFilter, page],
    queryFn: () => fetchLogs({ search: debouncedSearch, action: actionFilter, page }),
    placeholderData: (previous) => previous,
    staleTime: COMPLIANCE_CACHE_TIME,
    gcTime: COMPLIANCE_GC_TIME,
  })

  const logs = data?.logs ?? []

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Compliance</p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Document access audit trail</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Every view, upload, or deletion of a pilgrim's sensitive travel documents by an admin is recorded here for NDPA/GDPR accountability.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total events</span><Activity className="size-4 text-[#07845f]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{data?.total ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Document views/uploads</span><FileSearch className="size-4 text-[#0f74c1]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{data?.stats.documentViews ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Deletions</span><ShieldAlert className="size-4 text-[#a43229]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{data?.stats.deletions ?? 0}</p>
        </div>
      </div>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by admin, booking, traveler, or document" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#17201c] outline-none ring-0 transition focus:border-[#0d7d5f]" />
          </div>
          <AppSelect value={actionFilter} onValueChange={setActionFilter} className="w-56" options={actionOptions} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Admin</th>
                <th className="px-5 py-3 font-bold">Action</th>
                <th className="px-5 py-3 font-bold">Booking</th>
                <th className="px-5 py-3 font-bold">Traveler</th>
                <th className="px-5 py-3 font-bold">Document</th>
                <th className="px-5 py-3 font-bold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading audit trail…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load audit logs"}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">No access events match this filter.</td></tr>
              ) : (
                logs.map((log) => {
                  const Icon = actionIcons[log.action] || Activity
                  return (
                    <tr key={log.id} className="hover:bg-[#f7faf9]">
                      <td className="px-5 py-4 font-semibold text-[#17201c]">{log.adminEmail}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe7e3] bg-[#f7faf9] px-2.5 py-1 text-xs font-bold text-[#36413d]"><Icon className="size-3.5" /> {actionLabels[log.action] || log.action}</span>
                      </td>
                      <td className="px-5 py-4 text-[#68716d]">{log.bookingId ?? "—"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[#68716d]">{log.travelerId ? log.travelerId.slice(0, 8) : "—"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[#68716d]">{log.docId ? log.docId.slice(0, 8) : "—"}</td>
                      <td className="px-5 py-4 text-xs text-[#68716d]">{new Date(log.createdAt).toLocaleString("en-NG")}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar page={data?.page ?? page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={data?.limit ?? PAGE_SIZE} onPageChange={setPage} isFetching={isFetching} />
      </section>
    </main>
  )
}
