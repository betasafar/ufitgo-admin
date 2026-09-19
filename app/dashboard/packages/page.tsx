"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Banknote, Calendar, Package as PackageIcon, Plus, Search, TicketPercent, Users } from "lucide-react"

type PackageRecord = {
  id?: string | number
  title?: string
  type?: string
  serviceLevel?: string
  price?: number | string
  capacity?: number | string
  booked?: number | string
  status?: string
  departureDate?: string
  returnDate?: string
  operatorId?: string | number
  operatorName?: string
  operatorPartnerType?: string
}

const partnerTypeOptions = [
  { value: "all", label: "All partners" },
  { value: "tour-operator", label: "Tour operators" },
  { value: "exchange-agent", label: "FX agents" },
  { value: "transport", label: "Transport" },
  { value: "sim-seller", label: "SIM sellers" },
  { value: "tour-guide", label: "Tour guides" },
] as const

// Only tour-operator / tour-guide products live in the packages table today.
// Other partner types don't have a product catalog yet, so we say so instead of pretending there's data.
const PARTNER_TYPES_WITHOUT_CATALOG = new Set(["transport", "sim-seller", "exchange-agent"])

const collectionOptions = [
  { value: "all", label: "All collections" },
  { value: "hajj", label: "Hajj" },
  { value: "ramadan", label: "Ramadan" },
  { value: "deal-of-week", label: "Deal of the week" },
  { value: "others", label: "Others" },
] as const

function pick<T>(...values: Array<T | undefined | null>): T | undefined {
  return values.find((value): value is T => value !== undefined && value !== null && value !== "")
}

function normalizePackage(raw: any): PackageRecord {
  return {
    id: pick(raw?.id, raw?.packageId),
    title: pick(raw?.title, raw?.name),
    type: pick(raw?.type, raw?.category),
    serviceLevel: pick(raw?.serviceLevel, raw?.service_level),
    price: pick(raw?.price, raw?.priceFrom),
    capacity: pick(raw?.capacity, 0),
    booked: pick(raw?.booked, 0),
    status: pick(raw?.status, "draft"),
    departureDate: pick(raw?.departureDate, raw?.departure_date),
    returnDate: pick(raw?.returnDate, raw?.return_date),
    operatorId: pick(raw?.operator?.id, raw?.operatorId),
    operatorName: pick(raw?.operator?.companyName, raw?.operatorName),
    operatorPartnerType: pick(raw?.operator?.partnerType, raw?.operatorPartnerType, "tour-operator"),
  }
}

function formatDate(value?: string) {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`
}

function formatCompactNaira(amount: number) {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`
  return formatNaira(amount)
}

function statusTone(status?: string) {
  const value = (status || "draft").toLowerCase()
  if (value === "active") return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  if (value === "draft") return "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]"
  return "bg-[#fff0ee] text-[#b2382f] border border-[#f4d0ca]"
}

type PackagesQueryResult = {
  packages: PackageRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
  summary: { activeCount: number; totalCapacity: number; totalBooked: number; projectedRevenue: number }
  partnerTypeCounts: Record<string, number>
}

const PACKAGES_PAGE_SIZE = 20

async function fetchPackages(params: { search: string; status: string; collection: string; partnerType: string; page: number }): Promise<PackagesQueryResult> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(PACKAGES_PAGE_SIZE) })
  if (params.search.trim()) query.set("search", params.search.trim())
  if (params.status !== "all") query.set("status", params.status)
  if (params.collection !== "all") query.set("collection", params.collection)
  if (params.partnerType !== "all") query.set("partnerType", params.partnerType)

  const response = await fetch(`/api/admin/operator-auth/packages?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load packages")

  const list: any[] = Array.isArray(payload?.data) ? payload.data : []
  return {
    packages: list.map((pkg: any) => normalizePackage(pkg)),
    total: Number(payload?.meta?.total ?? list.length),
    page: Number(payload?.meta?.page ?? params.page),
    limit: Number(payload?.meta?.limit ?? PACKAGES_PAGE_SIZE),
    totalPages: Number(payload?.meta?.totalPages ?? 1),
    summary: {
      activeCount: Number(payload?.summary?.activeCount ?? 0),
      totalCapacity: Number(payload?.summary?.totalCapacity ?? 0),
      totalBooked: Number(payload?.summary?.totalBooked ?? 0),
      projectedRevenue: Number(payload?.summary?.projectedRevenue ?? 0),
    },
    partnerTypeCounts: (payload?.partnerTypeCounts as Record<string, number>) || {},
  }
}

export default function PackagesPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [collectionFilter, setCollectionFilter] = useState("all")
  const [partnerFilter, setPartnerFilter] = useState<(typeof partnerTypeOptions)[number]["value"]>("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, statusFilter, collectionFilter, partnerFilter])

  const { data, isLoading, isFetching, error, refetch } = useQuery<PackagesQueryResult>({
    queryKey: ["packages", debouncedSearch, statusFilter, collectionFilter, partnerFilter, page],
    queryFn: () => fetchPackages({ search: debouncedSearch, status: statusFilter, collection: collectionFilter, partnerType: partnerFilter, page }),
    placeholderData: (previous) => previous,
  })

  const packages = data?.packages ?? []
  const partnerTypeCounts = data?.partnerTypeCounts ?? {}
  const summary = data?.summary ?? { activeCount: 0, totalCapacity: 0, totalBooked: 0, projectedRevenue: 0 }

  const totalPartnerCount = useMemo(
    () => Object.values(partnerTypeCounts).reduce((sum, value) => sum + value, 0),
    [partnerTypeCounts],
  )

  const seatsFilledPercent = summary.totalCapacity > 0 ? Math.round((summary.totalBooked / summary.totalCapacity) * 100) : 0
  const showsCatalogNotice = PARTNER_TYPES_WITHOUT_CATALOG.has(partnerFilter)

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Operations</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Package management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Centralized view of every product listed across all partner types, from Hajj and Umrah packages to future transport, SIM, and FX catalogs.</p>
        </div>
        <button type="button" onClick={() => void refetch()} className="inline-flex items-center justify-center rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
          Refresh
        </button>
          <button type="button" onClick={() => window.location.assign("/dashboard/packages/create")} className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]"><Plus className="size-4" /> Create package</button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active packages</span>
            <PackageIcon className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.activeCount}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Currently bookable{partnerFilter !== "all" ? ` for ${partnerTypeOptions.find((o) => o.value === partnerFilter)?.label.toLowerCase()}` : ""}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Seats filled</span>
            <Users className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.totalBooked} <span className="text-base font-semibold text-[#9aa39e]">/ {summary.totalCapacity}</span></p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#0f74c1]" style={{ width: `${Math.min(seatsFilledPercent, 100)}%` }} /></div>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Revenue projected</span>
            <Banknote className="size-4 text-[#8a6500]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatCompactNaira(summary.projectedRevenue)}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Booked seats × listed price</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {partnerTypeOptions.map((option) => {
            const isActive = partnerFilter === option.value
            const count = option.value === "all" ? totalPartnerCount : partnerTypeCounts[option.value] ?? 0
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
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white text-[#0d7d5f]" : "bg-[#edf3f0] text-[#4f5d58]"}`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by package title or partner" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#17201c] outline-none ring-0 transition focus:border-[#0d7d5f]" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-44"
              options={[
                { value: "active", label: "Active" },
                { value: "past", label: "Past" },
                { value: "draft", label: "Draft" },
                { value: "inactive", label: "Inactive" },
                { value: "all", label: "All statuses" },
              ]}
            />
            <AppSelect value={collectionFilter} onValueChange={setCollectionFilter} className="w-52" options={collectionOptions.map((option) => ({ value: option.value, label: option.label }))} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Package</th>
                <th className="px-5 py-3 font-bold">Partner</th>
                <th className="px-5 py-3 font-bold">Dates</th>
                <th className="px-5 py-3 font-bold">Capacity</th>
                <th className="px-5 py-3 font-bold">Price</th>
                <th className="px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading packages…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load packages"}</td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">
                    {showsCatalogNotice
                      ? "This partner type doesn't have a product catalog in the package system yet. It'll show up here once that's built."
                      : "No packages match the current filters."}
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => {
                  const capacity = Number(pkg.capacity ?? 0)
                  const booked = Number(pkg.booked ?? 0)
                  const fillPercent = capacity > 0 ? Math.min(Math.round((booked / capacity) * 100), 100) : 0
                  const partnerLabel = (pkg.operatorPartnerType || "tour-operator").replaceAll("-", " ")

                  return (
                    <tr key={String(pkg.id)} className="cursor-pointer transition-colors hover:bg-[#f7faf9]" onClick={() => window.location.assign(`/dashboard/packages/${pkg.id}`)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-[#eaf9f3] text-[#0d7d5f]"><PackageIcon className="size-4" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[#17201c]">{pkg.title || "Untitled package"}</span>
                            <span className="mt-0.5 block text-xs uppercase tracking-[0.06em] text-[#72807b]">{(pkg.type || "package").replaceAll("_", " ")}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block text-sm font-semibold text-[#17201c]">{pkg.operatorName || "—"}</span>
                        <span className="mt-0.5 inline-block rounded-full border border-[#dfe7e3] bg-[#f7faf9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#68716d]">{partnerLabel}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs text-[#68716d]">
                          <div className="flex items-center gap-2"><Calendar className="size-3.5 text-[#6a7771]" /> Dep: {formatDate(pkg.departureDate)}</div>
                          <div className="flex items-center gap-2"><Calendar className="size-3.5 text-[#6a7771]" /> Ret: {formatDate(pkg.returnDate)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#17201c]">{booked} <span className="font-normal text-[#9aa39e]">/ {capacity}</span></span>
                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-[#edf1ef]"><div className={`h-full rounded-full ${fillPercent >= 100 ? "bg-[#b2382f]" : "bg-[#0d7d5f]"}`} style={{ width: `${fillPercent}%` }} /></div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-bold text-[#17201c]">{formatNaira(Number(pkg.price ?? 0))}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${statusTone(pkg.status)}`}><TicketPercent className="size-3.5" />{pkg.status || "draft"}</span></td>
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
