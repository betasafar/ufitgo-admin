"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Filter,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"

type CustomerRecord = {
  id?: string | number
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  phoneNumber?: string
  createdAt?: string
  kycStatus?: string
  status?: string
  isVerified?: boolean
  walletBalance?: number | string
  bookingCount?: number | string
  totalBookings?: number | string
  lastLoginAt?: string
  role?: string
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

function formatCurrency(value: number | string | undefined) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return "₦0"
  return `₦${numeric.toLocaleString("en-NG")}`
}

function normalizeCustomer(raw: any): CustomerRecord {
  return {
    id: pick(raw?.id, raw?.userId, raw?.customerId),
    firstName: pick(raw?.firstName, raw?.first_name, raw?.name?.split(" ")?.[0]),
    lastName: pick(raw?.lastName, raw?.last_name, raw?.name?.split(" ")?.slice(1).join(" ")),
    email: pick(raw?.email, raw?.emailAddress),
    phone: pick(raw?.phone, raw?.phoneNumber, raw?.mobile, raw?.phone_number),
    phoneNumber: pick(raw?.phoneNumber, raw?.phone_number, raw?.phone, raw?.mobile),
    createdAt: pick(raw?.createdAt, raw?.created_at, raw?.joinedAt),
    kycStatus: pick(raw?.kycStatus, raw?.kyc_status, raw?.verificationStatus, raw?.status),
    status: pick(raw?.status, raw?.accountStatus),
    isVerified: Boolean(raw?.isVerified ?? (raw?.kycStatus || "").toLowerCase().includes("verified")),
    walletBalance: pick(raw?.walletBalance, raw?.wallet_balance, raw?.balance, raw?.availableBalance),
    bookingCount: pick(raw?.bookingCount, raw?.bookingsCount, raw?.totalBookings, raw?.total_bookings),
    lastLoginAt: pick(raw?.lastLoginAt, raw?.last_login_at),
    role: pick(raw?.role, raw?.accountType),
  }
}

function customerStatusBadge(status?: string) {
  const value = (status || "pending").toLowerCase()
  if (value.includes("verified") || value.includes("active") || value === "approved") {
    return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  }
  if (value.includes("pending") || value.includes("review")) {
    return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
  }
  return "bg-[#fff0ee] text-[#b2382f] border border-[#f4d0ca]"
}

function KycPill({ status }: { status?: string }) {
  const label = status ? status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Unverified"
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold ${customerStatusBadge(status)}`}>
      {status && /verified|approved|active/i.test(status) ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
      {label}
    </span>
  )
}

type CustomersQueryResult = {
  customers: CustomerRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const CUSTOMERS_PAGE_SIZE = 20

async function fetchCustomers(params: { search: string; status: string; page: number }): Promise<CustomersQueryResult> {
  const query = new URLSearchParams({ page: String(params.page), limit: String(CUSTOMERS_PAGE_SIZE) })
  if (params.search.trim()) query.set("search", params.search.trim())
  if (params.status !== "all") query.set("kycStatus", params.status)

  const response = await fetch(`/api/admin/customers?${query.toString()}`, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Unable to load customers")

  const list: any[] = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
  return {
    customers: list.map((customer: any) => normalizeCustomer(customer)),
    total: Number(payload?.total ?? list.length),
    page: Number(payload?.page ?? params.page),
    limit: Number(payload?.limit ?? CUSTOMERS_PAGE_SIZE),
    totalPages: Number(payload?.totalPages ?? 1),
  }
}

export default function CustomersPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, statusFilter])

  const { data, isLoading, isFetching, error, refetch } = useQuery<CustomersQueryResult>({
    queryKey: ["customers", debouncedSearch, statusFilter, page],
    queryFn: () => fetchCustomers({ search: debouncedSearch, status: statusFilter, page }),
    placeholderData: (previous) => previous,
  })

  const customers = data?.customers ?? []

  const summary = useMemo(() => {
    const verified = customers.filter((customer) => /verified|approved|active/i.test(customer.kycStatus || "")).length
    const pending = customers.filter((customer) => /pending|review/i.test(customer.kycStatus || "")).length
    const wallet = customers.reduce((total, customer) => total + Number(customer.walletBalance ?? 0), 0)
    return {
      total: customers.length,
      verified,
      pending,
      wallet,
    }
  }, [customers])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Operations</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Customer management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Stay close to customer trust, KYC quality, wallet health, and booking momentum without jumping across screens.</p>
        </div>
        <button type="button" onClick={() => void refetch()} className="inline-flex items-center justify-center rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
          Refresh
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total customers</span>
            <Users className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.total}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Registered and active in the system</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Verified</span>
            <ShieldCheck className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.verified}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Identity checks completed</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Awaiting review</span>
            <ShieldAlert className="size-4 text-[#b56a00]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.pending}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Requires internal follow-up</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Wallet value</span>
            <Wallet className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCurrency(summary.wallet)}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Combined customer balances</p>
        </div>
      </div>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or phone" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-10 pr-3 text-sm text-[#17201c] outline-none ring-0 transition focus:border-[#0d7d5f]" />
          </div>
          <div className="flex items-center gap-3">
            <AppSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              icon={<Filter className="size-4" />}
              className="w-56"
              options={[
                { value: "all", label: "All KYC" },
                { value: "verified", label: "Verified" },
                { value: "pending", label: "Pending" },
                { value: "review", label: "Needs review" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Customer</th>
                <th className="px-5 py-3 font-bold">Contact</th>
                <th className="px-5 py-3 font-bold">KYC</th>
                <th className="px-5 py-3 font-bold">Bookings</th>
                <th className="px-5 py-3 font-bold">Wallet</th>
                <th className="px-5 py-3 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading customers…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#a43229]">{error instanceof Error ? error.message : "Unable to load customers"}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">No customers match the current search.</td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
                  const contactPhone = customer.phone || customer.phoneNumber || "Not provided"
                  const bookingsValue = Number(customer.bookingCount ?? customer.totalBookings ?? 0)
                  const walletValue = Number(customer.walletBalance ?? 0)
                  return (
                    <tr key={String(customer.id)} className="cursor-pointer transition-colors hover:bg-[#f7faf9]" onClick={() => window.location.assign(`/dashboard/customers/${customer.id}`)}>
                      <td className="px-5 py-4">
                        <div className="group flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-full bg-[#eaf9f3] text-sm font-bold text-[#0d7d5f]">{customerName.slice(0, 1).toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-[#17201c] group-hover:text-[#07845f]">{customerName}</span>
                            <span className="mt-0.5 block text-xs text-[#72807b]">#{String(customer.id ?? "—")}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs text-[#68716d]">
                          <div className="flex items-center gap-2"><Mail className="size-3.5 text-[#6a7771]" /> <span className="truncate">{customer.email || "No email"}</span></div>
                          <div className="flex items-center gap-2"><Phone className="size-3.5 text-[#6a7771]" /> <span>{contactPhone}</span></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><KycPill status={customer.kycStatus || (customer.isVerified ? "verified" : "pending")} /></td>
                      <td className="px-5 py-4"><span className="text-sm font-bold text-[#17201c]">{bookingsValue}</span></td>
                      <td className="px-5 py-4"><span className="text-sm font-bold text-[#17201c]">{formatCurrency(walletValue)}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-xs text-[#68716d]">
                          <CalendarDays className="size-3.5 text-[#6a7771]" />
                          <span>{formatDate(customer.createdAt)}</span>
                        </div>
                      </td>
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
