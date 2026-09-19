"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, Clock, Eye, ShieldCheck, XCircle } from "lucide-react"
import { PaginationBar } from "@/components/ui/pagination-bar"

type UpgradeRequest = {
  id: string
  currentTier?: number
  requestedTier: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  user?: { firstName?: string; lastName?: string; email?: string }
}

const statusTabs = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const

const COMPLIANCE_CACHE_TIME = 60_000
const COMPLIANCE_GC_TIME = 10 * 60_000
const PAGE_SIZE = 20

type UpgradeQueryResult = {
  requests: UpgradeRequest[]
  total: number
  page: number
  limit: number
  totalPages: number
  counts: { all: number; PENDING: number; APPROVED: number; REJECTED: number }
}

function statusTone(status: string) {
  if (status === "APPROVED") return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  if (status === "REJECTED") return "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]"
  return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "APPROVED" ? CheckCircle2 : status === "REJECTED" ? XCircle : Clock
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${statusTone(status)}`}>
      <Icon className="size-3.5" /> {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

async function fetchUpgrades(status: string, page: number): Promise<UpgradeQueryResult> {
  const query = new URLSearchParams({ status, page: String(page), limit: String(PAGE_SIZE) })
  const response = await fetch(`/api/admin/kyc/upgrades?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load verification requests")
  const requests = Array.isArray(payload?.data) ? payload.data : []
  return {
    requests,
    total: Number(payload?.total ?? requests.length),
    page: Number(payload?.page ?? page),
    limit: Number(payload?.limit ?? PAGE_SIZE),
    totalPages: Number(payload?.totalPages ?? 1),
    counts: payload?.counts ?? { all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 },
  }
}

export default function VerificationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, error } = useQuery<UpgradeQueryResult>({
    queryKey: ["kyc-upgrades", statusFilter, page],
    queryFn: () => fetchUpgrades(statusFilter, page),
    placeholderData: (previous) => previous,
    staleTime: COMPLIANCE_CACHE_TIME,
    gcTime: COMPLIANCE_GC_TIME,
  })

  const requests = data?.requests ?? []
  const counts = data?.counts ?? { all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Compliance</p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Identity verification</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Review and manually process KYC tier upgrade submissions before granting expanded platform access.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total requests</span><ShieldCheck className="size-4 text-[#07845f]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{counts.all}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pending</span><Clock className="size-4 text-[#8a6500]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{counts.PENDING}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Approved</span><CheckCircle2 className="size-4 text-[#0c6b50]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{counts.APPROVED}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Rejected</span><XCircle className="size-4 text-[#a43229]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{counts.REJECTED}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${isActive ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d9dfdc] bg-white text-[#44544e] hover:bg-[#eef4f1]"}`}
              >
                <span>{tab.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white text-[#0d7d5f]" : "bg-[#edf3f0] text-[#4f5d58]"}`}>{counts[tab.value as keyof typeof counts] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">User</th>
                <th className="px-5 py-3 font-bold">Requested upgrade</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Submitted</th>
                <th className="px-5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading requests…</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load requests"}</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#7b8580]">No verification requests match this filter.</td></tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-[#f7faf9]">
                    <td className="px-5 py-4">
                      <span className="block font-bold text-[#17201c]">{[request.user?.firstName, request.user?.lastName].filter(Boolean).join(" ") || "Unknown user"}</span>
                      <span className="mt-0.5 block text-xs text-[#72807b]">{request.user?.email || "No email"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md border border-[#dfe7e3] bg-[#f7faf9] px-2.5 py-1 font-mono text-xs font-bold text-[#36413d]">
                        Tier {request.currentTier || 1} → <span className="ml-1 text-[#0d7d5f]">Tier {request.requestedTier}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={request.status} /></td>
                    <td className="px-5 py-4 text-xs font-semibold text-[#68716d]">{new Date(request.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/dashboard/verifications/${request.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf9f3] px-3 py-1.5 text-xs font-bold text-[#0d7d5f] hover:bg-[#dcf3e9]">
                        <Eye className="size-3.5" /> Process
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar page={data?.page ?? page} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} limit={data?.limit ?? PAGE_SIZE} onPageChange={setPage} isFetching={isFetching} />
      </section>
    </main>
  )
}
