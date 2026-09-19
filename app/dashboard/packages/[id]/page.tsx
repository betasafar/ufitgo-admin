"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AppSelect } from "@/components/ui/app-select"
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Package as PackageIcon,
  Percent,
  Save,
  Trash2,
  Users,
} from "lucide-react"

type PackageTier = {
  id?: string | number
  name?: string
  price?: number | string
  serviceLevel?: string
  inclusions?: string[]
}

type PackageDetailRecord = {
  id?: string | number
  title?: string
  description?: string
  type?: string
  serviceLevel?: string
  price?: number | string
  capacity?: number | string
  booked?: number | string
  status?: string
  departureDate?: string
  returnDate?: string
  departingFrom?: string
  goingTo?: string
  inclusions?: string[]
  images?: string[]
  commissionConfigId?: number | string | null
  operator?: { id?: string | number; companyName?: string; partnerType?: string }
  tiers?: PackageTier[]
}

type BookingRecord = {
  id?: string | number
  bookingRef?: string
  createdAt?: string
  numberOfPilgrims?: number
  totalAmount?: number | string
  amountPaid?: number | string
  packageCost?: number | string
  totalAmountPayable?: number | string
  totalPaid?: number | string
  totalOutstanding?: number | string
  paymentBreakdown?: {
    packageCost?: number
    totalAmountPayable?: number
    totalPaid?: number
    totalOutstanding?: number
    registration?: { status?: string }
    finalBalance?: { status?: string }
  }
  status?: string
}

type CommissionOption = {
  id: number
  name?: string
  type?: string
  value?: number | string
}

function formatDate(value?: string) {
  if (!value) return "TBD"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "TBD"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function formatNaira(amount: number | string | undefined) {
  const numeric = Number(amount ?? 0)
  if (!Number.isFinite(numeric)) return "₦0"
  return `₦${numeric.toLocaleString("en-NG")}`
}

function partnerTypeLabel(value?: string) {
  const type = value || "tour-operator"
  const labels: Record<string, string> = {
    "tour-operator": "Tour Operator",
    "exchange-agent": "FX Agent",
    transport: "Transport Provider",
    "sim-seller": "SIM Seller",
    "tour-guide": "Tour Guide",
  }
  return labels[type] || type.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? "")

  const [pkg, setPkg] = useState<PackageDetailRecord | null>(null)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [commissions, setCommissions] = useState<CommissionOption[]>([])
  const [selectedCommissionId, setSelectedCommissionId] = useState<number | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)
  const [commissionSaving, setCommissionSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [pkgRes, bookingsRes, commissionsRes] = await Promise.all([
        fetch(`/api/admin/operator-auth/packages/${id}`, { cache: "no-store" }),
        fetch(`/api/admin/customers/packages/${id}/bookings`, { cache: "no-store" }),
        fetch(`/api/admin/commissions`, { cache: "no-store" }),
      ])

      const pkgPayload = await pkgRes.json().catch(() => null)
      if (!pkgRes.ok) throw new Error(pkgPayload?.message || "Unable to load package")
      const record: PackageDetailRecord = pkgPayload?.data || null
      setPkg(record)
      setSelectedCommissionId(record?.commissionConfigId ? Number(record.commissionConfigId) : "")

      const bookingsPayload = await bookingsRes.json().catch(() => null)
      setBookings(Array.isArray(bookingsPayload?.data) ? bookingsPayload.data : [])

      const commissionsPayload = await commissionsRes.json().catch(() => null)
      const commissionList = Array.isArray(commissionsPayload?.data)
        ? commissionsPayload.data
        : Array.isArray(commissionsPayload)
          ? commissionsPayload
          : []
      setCommissions(commissionList)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load package")
      setPkg(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const stats = useMemo(() => {
    const totalPilgrims = bookings.reduce((sum, b) => sum + Number(b.numberOfPilgrims || 1), 0)
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.paymentBreakdown?.totalPaid ?? b.totalPaid ?? b.amountPaid ?? 0), 0)
    return { totalBookings: bookings.length, totalPilgrims, totalRevenue }
  }, [bookings])

  async function toggleStatus() {
    if (!pkg) return
    const nextStatus = pkg.status === "active" ? "inactive" : "active"
    setStatusSaving(true)
    try {
      const response = await fetch(`/api/admin/operator-auth/packages/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!response.ok) throw new Error("Unable to update status")
      setPkg((current) => (current ? { ...current, status: nextStatus } : current))
    } catch {
      window.alert("Failed to update package status.")
    } finally {
      setStatusSaving(false)
    }
  }

  async function saveCommission() {
    if (!selectedCommissionId) return
    setCommissionSaving(true)
    try {
      const response = await fetch(`/api/admin/operator-auth/packages/${id}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionConfigId: selectedCommissionId }),
      })
      if (!response.ok) throw new Error("Unable to update commission")
      window.alert("Commission tag updated successfully.")
    } catch {
      window.alert("Failed to update commission tag.")
    } finally {
      setCommissionSaving(false)
    }
  }

  async function deletePackage() {
    if (!window.confirm("Are you sure you want to delete this package? This cannot be undone.")) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/operator-auth/packages/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Unable to delete package")
      router.push("/dashboard/packages")
    } catch {
      window.alert("Failed to delete package.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center p-8">
        <Loader2 className="size-8 animate-spin text-[#0d7d5f]" />
      </main>
    )
  }

  if (error || !pkg) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{error || "Package not found."}</div>
        <Link href="/dashboard/packages" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a43229]">
          <ArrowLeft className="size-4" /> Back to packages
        </Link>
      </main>
    )
  }

  const capacity = Number(pkg.capacity ?? 0)
  const booked = Number(pkg.booked ?? 0)
  const isActive = pkg.status === "active"

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/packages" className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Package profile</p>
            <h1 className="mt-2 font-brand flex flex-wrap items-center gap-3 text-3xl font-bold text-[#17201c]">
              {pkg.title || "Untitled package"}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${isActive ? "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]" : "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]"}`}>
                {pkg.status || "draft"}
              </span>
            </h1>
            <p className="mt-2 text-sm text-[#68716d]">
              Operated by{" "}
              {pkg.operator?.id ? (
                <Link href={`/dashboard/operators/${pkg.operator.id}`} className="font-bold text-[#0d7d5f] hover:underline">{pkg.operator.companyName || "Unknown partner"}</Link>
              ) : (
                <span className="font-bold text-[#17201c]">{pkg.operator?.companyName || "Unknown partner"}</span>
              )}
              {" · "}{partnerTypeLabel(pkg.operator?.partnerType)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/packages/${id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">Edit package</Link>
          <button type="button" onClick={() => void toggleStatus()} disabled={statusSaving} className="inline-flex items-center gap-2 rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0] disabled:opacity-50">
            {statusSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isActive ? "Deactivate" : "Activate"}
          </button>
          <button type="button" onClick={() => void deletePackage()} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg border border-[#f4d0ca] bg-[#fff0ee] px-4 py-2.5 text-sm font-bold text-[#a43229] hover:bg-[#fddedb] disabled:opacity-50">
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pilgrims booked</span>
            <Users className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{stats.totalPilgrims} <span className="text-base font-semibold text-[#9aa39e]">/ {capacity}</span></p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total tickets</span>
            <PackageIcon className="size-4 text-[#07845f]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{stats.totalBookings}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Travel dates</span>
            <Calendar className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-3 text-sm font-bold text-[#17201c]">Dep: {formatDate(pkg.departureDate)}</p>
          <p className="text-sm font-bold text-[#17201c]">Ret: {formatDate(pkg.returnDate)}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Revenue collected</span>
            <Banknote className="size-4 text-[#8a6500]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{formatNaira(stats.totalRevenue)}</p>
        </div>
      </div>

      {pkg.tiers && pkg.tiers.length > 0 && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
          <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#17201c]"><PackageIcon className="size-4 text-[#0d7d5f]" /> Package tiers</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pkg.tiers.map((tier) => (
              <div key={String(tier.id)} className="rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
                <p className="font-bold text-[#17201c]">{tier.name}</p>
                <p className="mt-1 text-lg font-bold text-[#0d7d5f]">{formatNaira(tier.price)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
        <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#17201c]"><Percent className="size-4 text-[#0d7d5f]" /> Commission settings</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Commission tag</label>
            <AppSelect
              value={selectedCommissionId ? String(selectedCommissionId) : ""}
              onValueChange={(value) => setSelectedCommissionId(value ? Number(value) : "")}
              className="sm:max-w-md"
              placeholder="Select a commission rule"
              options={commissions.map((commission) => ({
                value: String(commission.id),
                label: `${commission.name || `Rule #${commission.id}`} (${commission.type === "PERCENTAGE" ? `${commission.value}%` : formatNaira(commission.value)})`,
              }))}
            />
          </div>
          <button
            type="button"
            onClick={() => void saveCommission()}
            disabled={!selectedCommissionId || commissionSaving || selectedCommissionId === Number(pkg.commissionConfigId)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {commissionSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save tag
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="border-b border-[#edf1ef] px-5 py-4">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Booking history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
              <tr>
                <th className="px-5 py-3 font-bold">Booking ref</th>
                <th className="px-5 py-3 font-bold">Date</th>
                <th className="px-5 py-3 font-bold">Pilgrims</th>
                <th className="px-5 py-3 font-bold">Total</th>
                <th className="px-5 py-3 font-bold">Paid</th>
                <th className="px-5 py-3 font-bold">Balance</th>
                <th className="px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1ef]">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">No bookings yet for this package.</td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const total = Number(booking.paymentBreakdown?.totalAmountPayable ?? booking.totalAmountPayable ?? booking.totalAmount ?? 0)
                  const paid = Number(booking.paymentBreakdown?.totalPaid ?? booking.totalPaid ?? booking.amountPaid ?? 0)
                  const balance = Number(booking.paymentBreakdown?.totalOutstanding ?? booking.totalOutstanding ?? total - paid)
                  const isPaid = booking.status === "PAID" || balance <= 0

                  return (
                    <tr key={String(booking.id ?? booking.bookingRef)} className="transition-colors hover:bg-[#f7faf9]">
                      <td className="px-5 py-4 font-bold text-[#0d7d5f]">{booking.bookingRef || "—"}</td>
                      <td className="px-5 py-4 text-[#68716d]">{formatDate(booking.createdAt)}</td>
                      <td className="px-5 py-4 font-bold text-[#17201c]">{booking.numberOfPilgrims ?? 1}</td>
                      <td className="px-5 py-4 text-[#17201c]">{formatNaira(total)}</td>
                      <td className="px-5 py-4 font-semibold text-[#0c6b50]">{formatNaira(paid)}</td>
                      <td className="px-5 py-4 font-semibold text-[#a43229]">{balance > 0 ? formatNaira(balance) : "₦0"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${isPaid ? "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]" : "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"}`}>
                          {isPaid ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                          {isPaid ? "Paid" : booking.paymentBreakdown?.finalBalance?.status?.replaceAll("_", " ") || "Pending"}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
