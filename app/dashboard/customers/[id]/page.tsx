"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Building,
  CalendarDays,
  CreditCard,
  Loader2,
  Mail,
  Map,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Target,
  User,
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
  role?: string
  country?: string
  city?: string
}

type BookingRecord = {
  id?: string | number
  bookingRef?: string
  status?: string
  totalPrice?: number | string
  totalPayable?: number | string
  amountPaid?: number | string
  registrationPaid?: number | string
  packagePaid?: number | string
  createdAt?: string
  packageName?: string
  destination?: string
}

type SavingsGoal = {
  id?: string | number
  title?: string
  targetAmount?: number | string
  autoSaveAmount?: number | string
  currentAmount?: number | string
  status?: string
}

type KycData = {
  status?: string
  tier?: number
  bvn?: string | number | null
  nin?: string | number | null
  verifiedName?: string
  docStatus?: string
}

type AuditAccount = {
  id?: string
  provider?: string
  accountId?: string
  nubanAccountNumber?: string | null
  activeTier?: number
  status?: string
  balanceLimit?: number | string
  createdAt?: string
}

type AuditEvent = {
  id?: string
  eventType?: string
  credentialType?: string | null
  maskedCredential?: string | null
  provider?: string
  accountNumber?: string | null
  tier?: number | null
  status?: string
  actorType?: string
  ipAddress?: string | null
  userAgent?: string | null
  source?: string
  deviceType?: string | null
  createdAt?: string
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

function isPositiveStatus(status?: string) {
  if (!status) return false
  const value = status.toLowerCase()
  return value.includes("verified") || value.includes("approved") || value.includes("active") || value.includes("paid")
}

function statusTone(status?: string) {
  const value = (status || "pending").toLowerCase()
  if (isPositiveStatus(status) || value.includes("completed") || value.includes("active")) {
    return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  }
  if (value.includes("pending") || value.includes("review") || value.includes("in_progress")) {
    return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
  }
  return "bg-[#fff0ee] text-[#b2382f] border border-[#f4d0ca]"
}

function KycBadge({ status }: { status?: string }) {
  const display = status ? status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Unverified"
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>
      {isPositiveStatus(status) ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
      {display}
    </span>
  )
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const customerId = params.id
  const [activeTab, setActiveTab] = useState("overview")
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [savings, setSavings] = useState<SavingsGoal[]>([])
  const [kyc, setKyc] = useState<KycData | null>(null)
  const [auditAccounts, setAuditAccounts] = useState<AuditAccount[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!customerId) return

    const load = async () => {
      setLoading(true)
      setError("")

      try {
        const [customerResponse, kycResponse, bookingsResponse, savingsResponse, auditResponse] = await Promise.all([
          fetch(`/api/admin/customers/${customerId}`, { cache: "no-store" }),
          fetch(`/api/admin/customers/${customerId}/kyc`, { cache: "no-store" }),
          fetch(`/api/admin/customers/${customerId}/bookings`, { cache: "no-store" }),
          fetch(`/api/admin/customers/${customerId}/savings`, { cache: "no-store" }),
          fetch(`/api/admin/customers/${customerId}/audit`, { cache: "no-store" }),
        ])

        const customerPayload = await customerResponse.json().catch(() => null)
        const kycPayload = await kycResponse.json().catch(() => null)
        const bookingsPayload = await bookingsResponse.json().catch(() => null)
        const savingsPayload = await savingsResponse.json().catch(() => null)
        const auditPayload = await auditResponse.json().catch(() => null)

        if (!customerResponse.ok) throw new Error(customerPayload?.message || "Unable to load customer")

        const detail = customerPayload?.data || customerPayload || {}
        const bookingList = Array.isArray(bookingsPayload?.data)
          ? bookingsPayload.data
          : Array.isArray(bookingsPayload)
            ? bookingsPayload
            : Array.isArray(detail?.bookings)
              ? detail.bookings
              : []

        const savingsList = Array.isArray(savingsPayload?.data)
          ? savingsPayload.data
          : Array.isArray(savingsPayload)
            ? savingsPayload
            : []

        setCustomer({
          id: pick(detail?.id, customerId),
          firstName: pick(detail?.firstName, detail?.first_name, detail?.name?.split(" ")?.[0]),
          lastName: pick(detail?.lastName, detail?.last_name, detail?.name?.split(" ")?.slice(1).join(" ")),
          email: pick(detail?.email, detail?.emailAddress),
          phone: pick(detail?.phone, detail?.phoneNumber, detail?.mobile, detail?.phone_number),
          phoneNumber: pick(detail?.phoneNumber, detail?.phone_number, detail?.phone, detail?.mobile),
          createdAt: pick(detail?.createdAt, detail?.created_at, detail?.joinedAt),
          kycStatus: pick(detail?.kycStatus, detail?.kyc_status, detail?.verificationStatus),
          status: pick(detail?.status, detail?.accountStatus),
          isVerified: Boolean(detail?.isVerified ?? (String(detail?.kycStatus || "").toLowerCase().includes("verified"))),
          walletBalance: pick(detail?.walletBalance, detail?.wallet_balance, detail?.balance, detail?.availableBalance),
          role: pick(detail?.role, detail?.accountType),
          country: pick(detail?.country, detail?.countryCode),
          city: pick(detail?.city, detail?.location),
        })

        setKyc({
          status: pick(kycPayload?.status, kycPayload?.kycStatus, detail?.kycStatus, "pending"),
          tier: Number(pick(kycPayload?.tier, kycPayload?.level, 0) ?? 0),
          bvn: pick(kycPayload?.bvn, kycPayload?.nin, kycPayload?.bvnNumber, "Not provided"),
          nin: pick(kycPayload?.nin, kycPayload?.nationalId, "Not provided"),
          verifiedName: pick(kycPayload?.verifiedName, detail?.verifiedName),
          docStatus: pick(kycPayload?.docStatus, kycPayload?.documentStatus, "Not uploaded"),
        })

        setBookings(bookingList.map((booking: any) => ({
          id: pick(booking?.id, booking?.bookingId),
          bookingRef: pick(booking?.bookingRef, booking?.reference, booking?.booking_reference),
          status: pick(booking?.status, booking?.bookingStatus),
          totalPrice: pick(booking?.totalPrice, booking?.total_price, booking?.amount, booking?.finalAmount),
          amountPaid: pick(booking?.paymentBreakdown?.totalPaid, booking?.totalPaid, booking?.amountPaid, booking?.amount_paid, booking?.paidAmount),
          totalPayable: pick(booking?.paymentBreakdown?.totalAmountPayable, booking?.totalAmountPayable, booking?.totalAmount),
          registrationPaid: pick(booking?.paymentBreakdown?.registration?.paid, booking?.registrationAmountPaid),
          packagePaid: pick(booking?.paymentBreakdown?.packageAmountPaid, booking?.packageAmountPaid),
          createdAt: pick(booking?.createdAt, booking?.created_at, booking?.bookingDate),
          packageName: pick(booking?.packageName, booking?.package_name, booking?.tourName),
          destination: pick(booking?.destination, booking?.city, booking?.packageDestination),
        })))

        setSavings(savingsList.map((goal: any) => ({
          id: pick(goal?.id, goal?.goalId),
          title: pick(goal?.title, goal?.name),
          targetAmount: pick(goal?.targetAmount, goal?.target_amount, goal?.goalAmount),
          autoSaveAmount: pick(goal?.autoSaveAmount, goal?.auto_save_amount),
          currentAmount: pick(goal?.currentAmount, goal?.savedAmount),
          status: pick(goal?.status, goal?.goalStatus),
        })))

        setAuditAccounts(Array.isArray(auditPayload?.accounts) ? auditPayload.accounts : [])
        const registrationEvents = Array.isArray(auditPayload?.registrationEvents)
          ? auditPayload.registrationEvents.map((event: AuditEvent) => ({ ...event, eventType: "ACCOUNT_REGISTERED" }))
          : []
        const kycEvents = Array.isArray(auditPayload?.kycEvents) ? auditPayload.kycEvents : []
        setAuditEvents([...registrationEvents, ...kycEvents].sort((left, right) =>
          new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
        ))
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load customer.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [customerId])

  const summary = useMemo(() => {
    const totalBookings = bookings.length
    const totalValue = bookings.reduce((sum, booking) => sum + Number(booking.totalPayable ?? booking.totalPrice ?? 0), 0)
    const paidValue = bookings.reduce((sum, booking) => sum + Number(booking.amountPaid ?? 0), 0)
    return {
      totalBookings,
      totalValue,
      paidValue,
      activeBookings: bookings.filter((booking) => !/cancelled|completed|rejected|failed/i.test(booking.status || "")).length,
    }
  }, [bookings])

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "kyc", label: "KYC & Docs", icon: ShieldCheck },
    { id: "financials", label: "Wallet & Savings", icon: Wallet },
    { id: "audit", label: "Account & Audit", icon: Building },
    { id: "bookings", label: "Bookings", icon: Map },
  ]

  if (loading) {
    return (
      <main className="p-5 sm:p-8">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-10 text-center text-sm text-[#7b8580]">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="size-5 animate-spin text-[#07845f]" />
            Loading customer profile…
          </div>
        </div>
      </main>
    )
  }

  if (error || !customer) {
    return (
      <main className="p-5 sm:p-8">
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-[#a43229]">
          <p className="font-bold">Unable to load this customer</p>
          <p className="mt-2 text-sm">{error || "The profile could not be loaded."}</p>
          <Link href="/dashboard/customers" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a43229]">
            <ArrowLeft className="size-4" /> Back to customers
          </Link>
        </div>
      </main>
    )
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"
  const contactPhone = customer.phone || customer.phoneNumber || "Not provided"
  const customerKycStatus = customer.kycStatus || (customer.isVerified ? "verified" : "pending")

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/customers" className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Customer profile</p>
            <h1 className="mt-2 font-brand flex items-center gap-3 text-3xl font-bold text-[#17201c]">
              {fullName}
              {customer.isVerified && <ShieldCheck className="size-5 text-[#0c6b50]" />}
            </h1>
            <p className="mt-2 text-sm text-[#68716d]">Customer ID: #{String(customer.id ?? "—")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <KycBadge status={customerKycStatus} />
          <Link href="/dashboard/customers" className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
            Back to list <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="border-b border-[#d9dfdc]">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${isActive ? "text-[#0d7d5f]" : "text-[#68716d] hover:text-[#17201c]"}`}
              >
                <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#0d7d5f] ${isActive ? "opacity-100" : "opacity-0"}`} />
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[350px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
              <div className="flex flex-col items-center text-center">
                <div className="grid size-24 place-items-center rounded-full bg-[#eaf9f3] text-3xl font-bold text-[#0d7d5f]">
                  {fullName.slice(0, 1).toUpperCase()}
                </div>
                <h2 className="mt-4 text-xl font-bold text-[#17201c]">{fullName}</h2>
                <span className="mt-2 rounded-full border border-[#dbe2de] bg-[#f7faf9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#68716d]">
                  {customer.role ? customer.role.replaceAll("_", " ") : "Customer"}
                </span>
              </div>

              <div className="mt-8 space-y-4 text-sm text-[#68716d]">
                <div className="flex items-center gap-3"><Mail className="size-4 text-[#66716c]" /> <span className="break-all">{customer.email || "No email on file"}</span></div>
                <div className="flex items-center gap-3"><Phone className="size-4 text-[#66716c]" /> <span>{contactPhone}</span></div>
                <div className="flex items-center gap-3"><CalendarDays className="size-4 text-[#66716c]" /> <span>Joined {formatDate(customer.createdAt)}</span></div>
                <div className="flex items-center gap-3"><MapPin className="size-4 text-[#66716c]" /> <span>{customer.city || customer.country || "Location not specified"}</span></div>
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Wallet</span>
                  <Wallet className="size-4 text-[#0d7d5f]" />
                </div>
                <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCurrency(customer.walletBalance)}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Available balance</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Bookings</span>
                  <Map className="size-4 text-[#07845f]" />
                </div>
                <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.totalBookings}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Trips linked to this account</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active</span>
                  <ShieldCheck className="size-4 text-[#0c6b50]" />
                </div>
                <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.activeBookings}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Bookings still in progress</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Value</span>
                  <CreditCard className="size-4 text-[#0d7d5f]" />
                </div>
                <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCurrency(summary.totalValue)}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Amount on bookings</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbe2de] bg-white p-5">
              <h3 className="font-brand text-xl font-bold text-[#17201c]">Recent activity</h3>
              <div className="mt-5 overflow-hidden rounded-lg border border-[#edf1ef]">
                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Ref</th>
                        <th className="px-4 py-3 font-bold">Package</th>
                        <th className="px-4 py-3 font-bold">Destination</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf1ef]">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#7b8580]">No recent activity to display.</td>
                        </tr>
                      ) : (
                        bookings.slice(0, 5).map((booking) => (
                          <tr key={String(booking.id ?? booking.bookingRef ?? Math.random())}>
                            <td className="px-4 py-3 font-bold text-[#17201c]">{booking.bookingRef || `#${booking.id || "—"}`}</td>
                            <td className="px-4 py-3 text-[#49615b]">{booking.packageName || "Package"}</td>
                            <td className="px-4 py-3 text-[#49615b]">{booking.destination || "—"}</td>
                            <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(booking.status)}`}>{booking.status || "Unknown"}</span></td>
                            <td className="px-4 py-3 font-bold text-[#17201c]">{formatCurrency(booking.totalPayable ?? booking.totalPrice)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "kyc" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-brand text-xl font-bold text-[#17201c]">KYC verification</h3>
              <p className="mt-1 text-sm text-[#68716d]">Manage user identity and travel documents.</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusTone(customerKycStatus)}`}>
              {customerKycStatus ? customerKycStatus.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Unverified"}
            </span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#78817d]">Identity</h4>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">BVN / NIN</div>
                <div className="mt-2 text-sm font-bold text-[#17201c]">{kyc?.bvn ?? kyc?.nin ?? "Not provided"}</div>
              </div>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Verified name</div>
                <div className="mt-2 text-sm font-bold text-[#17201c]">{kyc?.verifiedName || "Pending"}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#78817d]">Documents</h4>
              <div className="rounded-xl border border-dashed border-[#d9dfdc] bg-[#f9fbfa] p-8 text-center">
                <ShieldCheck className="mx-auto size-10 text-[#75807b]" />
                <p className="mt-3 text-sm font-semibold text-[#17201c]">{kyc?.docStatus || "No documents uploaded yet"}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Tier {kyc?.tier ?? 0} verification</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "financials" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
            <h3 className="font-brand text-xl font-bold text-[#17201c] flex items-center gap-2">
              <Building className="size-5 text-[#07845f]" />
              Virtual bank account
            </h3>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Account name</div>
                <div className="mt-2 text-sm font-bold text-[#17201c]">{fullName}</div>
              </div>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Account number</div>
                <div className="mt-2 text-sm font-bold text-[#17201c]">Not assigned</div>
              </div>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Bank name</div>
                <div className="mt-2 text-sm font-bold text-[#17201c]">Not assigned</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
            <h3 className="font-brand text-xl font-bold text-[#17201c] flex items-center gap-2">
              <Target className="size-5 text-[#07845f]" />
              Target savings goals
            </h3>
            <div className="mt-6 space-y-4">
              {savings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d9dfdc] bg-[#f9fbfa] p-8 text-center text-sm text-[#7b8580]">
                  No active savings goals.
                </div>
              ) : (
                savings.map((goal) => (
                  <div key={String(goal.id ?? goal.title ?? Math.random())} className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#17201c]">{goal.title || "Savings goal"}</h4>
                        <p className="mt-1 text-xs text-[#7b8580]">Target: {formatCurrency(goal.targetAmount)} • Auto-save: {formatCurrency(goal.autoSaveAmount)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#17201c]">{formatCurrency(goal.currentAmount)}</div>
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(goal.status)}`}>{goal.status || "Active"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
            <h3 className="font-brand flex items-center gap-2 text-xl font-bold text-[#17201c]">
              <Building className="size-5 text-[#07845f]" />
              Bank account details
            </h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {auditAccounts.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-[#d9dfdc] bg-[#f9fbfa] p-8 text-center text-sm text-[#7b8580]">
                  No FCMB account has been created for this customer.
                </div>
              ) : auditAccounts.map((account) => (
                <div key={account.id || account.accountId} className="contents">
                  <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Bank / provider</div><div className="mt-2 text-sm font-bold text-[#17201c]">{account.provider || "FCMB"}</div></div>
                  <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Account number</div><div className="mt-2 text-sm font-bold text-[#17201c]">{account.nubanAccountNumber || "Not assigned"}</div></div>
                  <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Tier / status</div><div className="mt-2 text-sm font-bold text-[#17201c]">Tier {account.activeTier ?? "—"} · {account.status || "Unknown"}</div></div>
                  <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Balance limit</div><div className="mt-2 text-sm font-bold text-[#17201c]">{formatCurrency(account.balanceLimit)}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
            <h3 className="font-brand text-xl font-bold text-[#17201c]">Registration and verification audit</h3>
            <div className="mt-6 overflow-hidden rounded-xl border border-[#edf1ef]"><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]"><tr><th className="px-4 py-3 font-bold">Event</th><th className="px-4 py-3 font-bold">Credential</th><th className="px-4 py-3 font-bold">Actor / device</th><th className="px-4 py-3 font-bold">IP address</th><th className="px-4 py-3 font-bold">Date</th></tr></thead><tbody className="divide-y divide-[#edf1ef]">
              {auditEvents.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#7b8580]">Not recorded (pre-audit customer).</td></tr> : auditEvents.map((event) => <tr key={event.id || `${event.eventType}-${event.createdAt}`}><td className="px-4 py-3 font-bold text-[#17201c]">{event.eventType?.replaceAll("_", " ") || "Recorded event"}<div className="mt-1 text-xs font-normal text-[#68716d]">{event.status || event.source || "Recorded"}</div></td><td className="px-4 py-3 text-[#49615b]">{event.credentialType ? `${event.credentialType}: ${event.maskedCredential || "masked"}` : "—"}</td><td className="px-4 py-3 text-[#49615b]">{event.actorType || "USER"}{event.deviceType ? ` · ${event.deviceType}` : ""}<div className="mt-1 max-w-[280px] truncate text-xs text-[#7b8580]" title={event.userAgent || ""}>{event.userAgent || "—"}</div></td><td className="px-4 py-3 text-[#49615b]">{event.ipAddress || "Not recorded"}</td><td className="px-4 py-3 text-[#68716d]">{formatDate(event.createdAt)}</td></tr>)}
            </tbody></table></div></div>
          </section>
        </div>
      )}

      {activeTab === "bookings" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
          <h3 className="font-brand text-xl font-bold text-[#17201c] flex items-center gap-2">
            <Map className="size-5 text-[#07845f]" />
            Trip bookings
          </h3>

          <div className="mt-6 overflow-hidden rounded-xl border border-[#edf1ef]">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Package</th>
                    <th className="px-4 py-3 font-bold">Destination</th>
                    <th className="px-4 py-3 font-bold">Booking Ref</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#7b8580]">This customer has not booked any packages yet.</td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={String(booking.id ?? booking.bookingRef ?? Math.random())}>
                        <td className="px-4 py-3 font-bold text-[#17201c]">{booking.packageName || "Package"}</td>
                        <td className="px-4 py-3 text-[#49615b]">{booking.destination || "—"}</td>
                        <td className="px-4 py-3 text-[#49615b]">{booking.bookingRef || `#${booking.id || "—"}`}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(booking.status)}`}>{booking.status || "Unknown"}</span></td>
                        <td className="px-4 py-3 text-[#68716d]">{formatDate(booking.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
