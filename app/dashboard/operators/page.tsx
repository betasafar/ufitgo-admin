"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { BriefcaseBusiness, Building2, Filter, Mail, Phone, Search, ShieldAlert, ShieldCheck, Users } from "lucide-react"

type OperatorRecord = {
  id?: string | number
  companyName?: string
  email?: string
  phone?: string
  partnerType?: string
  verificationStatus?: string
  isActive?: boolean
  createdAt?: string
  tier?: string
  packageCount?: number | string
  totalPackages?: number | string
  totalBookings?: number | string
  fleetSize?: string
  supportedNetworks?: string
  supportedCurrencies?: string[]
  guideExpertise?: string[]
}

function pick<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value): value is T => value !== undefined && value !== null && value !== "")
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function normalizeOperator(raw: any): OperatorRecord {
  return {
    id: pick(raw?.id, raw?.userId, raw?.operatorId),
    companyName: pick(raw?.companyName, raw?.company_name, raw?.name),
    email: pick(raw?.email, raw?.emailAddress),
    phone: pick(raw?.phone, raw?.phoneNumber, raw?.whatsappNumber, raw?.mobile),
    partnerType: pick(raw?.partnerType, raw?.partner_type, raw?.type),
    verificationStatus: pick(raw?.verificationStatus, raw?.verification_status, raw?.status, "pending"),
    isActive: Boolean(raw?.isActive ?? raw?.active ?? true),
    createdAt: pick(raw?.createdAt, raw?.created_at, raw?.joinedAt),
    tier: pick(raw?.tier, raw?.commissionTier),
    packageCount: pick(raw?.packageCount, raw?.packagesCount, raw?.totalPackages, raw?.total_packages, raw?.activePackagesCount),
    totalBookings: pick(raw?.totalBookings, raw?.bookingsCount, raw?.bookings),
    fleetSize: pick(raw?.fleetSize, raw?.fleet_size),
    supportedNetworks: pick(raw?.supportedNetworks, raw?.supported_networks),
    supportedCurrencies: Array.isArray(raw?.supported_currencies)
      ? raw.supported_currencies
      : Array.isArray(raw?.supportedCurrencies)
        ? raw.supportedCurrencies
        : undefined,
    guideExpertise: Array.isArray(raw?.guideExpertise) ? raw.guideExpertise : undefined,
  }
}

// Each partner type sells a different kind of product, so the listing column adapts to what's relevant.
function getProductInfo(operator: OperatorRecord): { label: string; value: string } {
  const type = operator.partnerType || "tour-operator"
  switch (type) {
    case "transport":
      return { label: "Fleet size", value: operator.fleetSize || "—" }
    case "sim-seller":
      return { label: "Networks", value: operator.supportedNetworks || "—" }
    case "exchange-agent":
      return { label: "Currencies", value: operator.supportedCurrencies?.length ? operator.supportedCurrencies.join(", ") : "—" }
    case "tour-guide":
      return { label: "Expertise", value: operator.guideExpertise?.length ? String(operator.guideExpertise.length) : "—" }
    default:
      return { label: "Packages", value: String(Number(operator.packageCount ?? operator.totalPackages ?? 0)) }
  }
}

function productColumnLabel(partnerType: string) {
  switch (partnerType) {
    case "transport":
      return "Fleet size"
    case "sim-seller":
      return "Networks"
    case "exchange-agent":
      return "Currencies"
    case "tour-guide":
      return "Expertise"
    case "all":
      return "Products"
    default:
      return "Packages"
  }
}

function statusTone(status?: string) {
  const value = (status || "pending").toLowerCase()
  if (value.includes("approved") || value.includes("verified") || value.includes("active")) {
    return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  }
  if (value.includes("review") || value.includes("pending")) {
    return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
  }
  return "bg-[#fff0ee] text-[#b2382f] border border-[#f4d0ca]"
}

function VerificationPill({ status }: { status?: string }) {
  const value = status ? status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Pending"
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>
      {status && /approved|verified|active/i.test(status) ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
      {value}
    </span>
  )
}

const partnerTypeOptions = [
  { value: "all", label: "All partners" },
  { value: "tour-operator", label: "Tour operators" },
  { value: "exchange-agent", label: "FX agents" },
  { value: "transport", label: "Transport" },
  { value: "sim-seller", label: "SIM sellers" },
  { value: "tour-guide", label: "Tour guides" },
] as const

const PAGE_SIZE = 20

type OperatorsQueryResult = {
  operators: OperatorRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
  partnerTypeCounts: Record<string, number>
}

async function fetchOperators(params: { search: string; status: string; partnerType: string; page: number }): Promise<OperatorsQueryResult> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(PAGE_SIZE) })
  if (params.search.trim()) query.set("search", params.search.trim())
  if (params.status !== "all") query.set("verificationStatus", params.status)
  if (params.partnerType !== "all") query.set("partnerType", params.partnerType)

  const response = await fetch(`/api/admin/operator-auth/operators?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load operators")

  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.operators) ? payload.operators : Array.isArray(payload) ? payload : []
  return {
    operators: list.map((operator: any) => normalizeOperator(operator)),
    total: Number(payload?.total ?? list.length),
    page: Number(payload?.page ?? params.page),
    limit: Number(payload?.limit ?? PAGE_SIZE),
    totalPages: Number(payload?.totalPages ?? 1),
    partnerTypeCounts: (payload?.partnerTypeCounts as Record<string, number>) || {},
  }
}

export default function OperatorsPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [partnerFilter, setPartnerFilter] = useState("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  // Any filter change should reset back to page 1.
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, partnerFilter])

  const { data, isLoading, isFetching, error, refetch } = useQuery<OperatorsQueryResult>({
    queryKey: ["operators", debouncedSearch, statusFilter, partnerFilter, page],
    queryFn: () => fetchOperators({ search: debouncedSearch, status: statusFilter, partnerType: partnerFilter, page }),
    placeholderData: (previous) => previous,
  })

  const operators = data?.operators ?? []
  const partnerCounts = useMemo(() => {
    const counts: Record<string, number> = data?.partnerTypeCounts || {}
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    return { all: total, ...counts } as Record<string, number>
  }, [data])

  const summary = useMemo(() => {
    const approved = operators.filter((operator) => /approved|verified/i.test(operator.verificationStatus || "")).length
    const pending = operators.filter((operator) => /pending|review/i.test(operator.verificationStatus || "")).length
    const active = operators.filter((operator) => operator.isActive).length
    return { total: data?.total ?? 0, approved, pending, active }
  }, [operators, data])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Operations</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Partner management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Monitor partner quality, verification status, fulfillment, and partner health across all approved business types.</p>
        </div>
        <button type="button" onClick={() => void refetch()} className="inline-flex items-center justify-center rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
          Refresh
        </button>
      </header>



      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total partners</span>
            <BriefcaseBusiness className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.total}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Partners on the platform</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Approved</span>
            <ShieldCheck className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.approved}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Verified and active</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pending review</span>
            <ShieldAlert className="size-4 text-[#b56a00]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.pending}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Needs compliance follow-up</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active</span>
            <Users className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.active}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Accessible to the platform</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {partnerTypeOptions.map((option) => {
            const isActive = partnerFilter === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPartnerFilter(option.value)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
                  isActive
                    ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]"
                    : "border-[#d9dfdc] bg-white text-[#44544e] hover:bg-[#eef4f1]"
                }`}
              >
                <span>{option.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white text-[#0d7d5f]" : "bg-[#edf3f0] text-[#4f5d58]"}`}>
                  {partnerCounts[option.value] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      
      <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by company or email" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#17201c] outline-none ring-0 transition focus:border-[#0d7d5f]" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              icon={<Filter className="size-4" />}
              className="w-56"
              options={[
                { value: "all", label: "All verification" },
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
                { value: "under_review", label: "Under review" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </section>



      <section className="overflow-hidden rounded-xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Partner</th>
                <th className="px-5 py-3 font-bold">Partner type</th>
                <th className="px-5 py-3 font-bold">Contact</th>
                <th className="px-5 py-3 font-bold">Verification</th>
                <th className="px-5 py-3 font-bold">{productColumnLabel(partnerFilter)}</th>
                <th className="px-5 py-3 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading partners…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load operators"}</td>
                </tr>
              ) : operators.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">No partners match the current filters.</td>
                </tr>
              ) : (
                operators.map((operator) => {
                  const companyName = operator.companyName || "Partner"
                  const partnerLabel = (operator.partnerType || "tour-operator").replaceAll("-", " ")
                  const product = getProductInfo(operator)

                  return (
                    <tr key={String(operator.id)} className="cursor-pointer transition-colors hover:bg-[#f7faf9]" onClick={() => window.location.assign(`/dashboard/operators/${operator.id}`)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-[#eaf9f3] text-sm font-bold text-[#0d7d5f]">{companyName.slice(0, 1).toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[#17201c]">{companyName}</span>
                            <span className="mt-0.5 block text-xs text-[#72807b]">#{String(operator.id ?? "—")}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-[#dfe7e3] bg-[#f7faf9] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#68716d]">{partnerLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs text-[#68716d]">
                          <div className="flex items-center gap-2"><Mail className="size-3.5 text-[#6a7771]" /> <span className="truncate">{operator.email || "No email"}</span></div>
                          <div className="flex items-center gap-2"><Phone className="size-3.5 text-[#6a7771]" /> <span>{operator.phone || "No phone"}</span></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><VerificationPill status={operator.verificationStatus || "pending"} /></td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#17201c]">{product.value}</span>
                        {partnerFilter === "all" && <span className="mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-[#9aa39e]">{product.label}</span>}
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-[#68716d]">{formatDate(operator.createdAt)}</span></td>
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
