"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react"

type PackageRecord = {
  id?: string | number
  title?: string
  type?: string
  price?: number | string
  departureDate?: string
  returnDate?: string
  isActive?: boolean
}

type BusinessOwner = {
  title?: string
  firstName?: string
  lastName?: string
  phone?: string
  nin?: string
  idUrl?: string
}

type DocumentRecord = {
  id?: string | number
  type?: string
  status?: string
  filename?: string
  url?: string
  createdAt?: string
  metadata?: Record<string, any>
}

type OperatorRecord = {
  id?: string | number
  companyName?: string
  email?: string
  phone?: string
  whatsappNumber?: string
  partnerType?: string
  verificationStatus?: string
  isActive?: boolean
  createdAt?: string
  tier?: string
  country?: string
  location?: string
  address?: string
  description?: string
  nahconId?: string
  capacity?: string | number
  transportReg?: string
  fleetSize?: string | number
  telecomPermit?: string
  supportedNetworks?: string
  guideLanguages?: string
  guideExperience?: string
  guideExpertise?: string[] | string
  businessOwner?: BusinessOwner | null
  packages?: PackageRecord[]
  documents?: DocumentRecord[]
  totalBookings?: number | string
  totalRevenue?: number | string
  trustScore?: number | string
}

function pick<T>(...values: Array<T | null | undefined>): T | undefined {
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

function getRequiredDocuments(partnerType?: string) {
  const docs: Record<string, Array<{ key: string; label: string }>> = {
    "tour-operator": [
      { key: "cac", label: "CAC Certificate" },
      { key: "license", label: "Business License" },
      { key: "insurance", label: "Insurance" },
      { key: "tax", label: "Tax Document" },
      { key: "id_card", label: "ID Card" },
    ],
    "exchange-agent": [
      { key: "cac", label: "CAC Certificate" },
      { key: "license", label: "FX/BDC License" },
      { key: "bank_statement", label: "Bank Statement" },
      { key: "id_card", label: "ID Card" },
    ],
    transport: [
      { key: "license", label: "Vehicle / Fleet License" },
      { key: "insurance", label: "Insurance" },
      { key: "bank_statement", label: "Bank Statement" },
      { key: "id_card", label: "ID Card" },
    ],
    "sim-seller": [
      { key: "cac", label: "CAC Certificate" },
      { key: "license", label: "Telecom Permit" },
      { key: "bank_statement", label: "Bank Statement" },
      { key: "id_card", label: "ID Card" },
    ],
    "tour-guide": [
      { key: "id_card", label: "ID Card" },
      { key: "license", label: "Guide License" },
      { key: "cac", label: "Business Registration" },
    ],
  }

  return docs[partnerType || "tour-operator"] || docs["tour-operator"]
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

export default function OperatorDetailPage() {
  const params = useParams<{ id: string }>()
  const operatorId = params.id
  const [activeTab, setActiveTab] = useState("overview")
  const [operator, setOperator] = useState<OperatorRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!operatorId) return

    const load = async () => {
      setLoading(true)
      setError("")

      try {
        const response = await fetch(`/api/admin/operator-auth/operators/${operatorId}/dossier`, { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message || "Unable to load operator")

        const detail = payload?.data || payload || {}
        const packages = Array.isArray(detail?.packages) ? detail.packages : []

        const documents = Array.isArray(detail?.tierDocuments)
          ? detail.tierDocuments.map((doc: any) => ({
              id: pick(doc?.id, doc?.documentId),
              type: pick(doc?.type, doc?.documentType),
              status: pick(doc?.status, doc?.documentStatus),
              filename: pick(doc?.filename, doc?.name),
              url: pick(doc?.url, doc?.documentUrl, doc?.fileUrl),
              createdAt: pick(doc?.createdAt, doc?.created_at),
              metadata: doc?.metadata || {},
            }))
          : Array.isArray(detail?.documents)
            ? detail.documents.map((doc: any) => ({
                id: pick(doc?.id, doc?.documentId),
                type: pick(doc?.type, doc?.documentType),
                status: pick(doc?.status, doc?.documentStatus),
                filename: pick(doc?.filename, doc?.name),
                url: pick(doc?.url, doc?.documentUrl, doc?.fileUrl),
                createdAt: pick(doc?.createdAt, doc?.created_at),
                metadata: doc?.metadata || {},
              }))
            : []

        setOperator({
          id: pick(detail?.id, operatorId),
          companyName: pick(detail?.companyName, detail?.company_name, detail?.name),
          email: pick(detail?.email, detail?.emailAddress),
          phone: pick(detail?.phone, detail?.phoneNumber, detail?.whatsappNumber, detail?.mobile),
          whatsappNumber: pick(detail?.whatsappNumber, detail?.whatsapp_number),
          partnerType: pick(detail?.partnerType, detail?.partner_type, detail?.type),
          verificationStatus: pick(detail?.verificationStatus, detail?.verification_status, detail?.status, "pending"),
          isActive: Boolean(detail?.isActive ?? detail?.active ?? true),
          createdAt: pick(detail?.createdAt, detail?.created_at, detail?.joinedAt),
          tier: pick(detail?.tier, detail?.commissionTier),
          country: pick(detail?.country, detail?.countryCode),
          location: pick(detail?.location, detail?.city),
          address: pick(detail?.address, detail?.physicalAddress),
          description: pick(detail?.description, detail?.bio),
          nahconId: pick(detail?.nahconId, detail?.nahcon_id),
          capacity: pick(detail?.capacity, detail?.operatorCapacity),
          transportReg: pick(detail?.transportReg, detail?.transport_reg),
          fleetSize: pick(detail?.fleetSize, detail?.fleet_size),
          telecomPermit: pick(detail?.telecomPermit, detail?.telecom_permit),
          supportedNetworks: pick(detail?.supportedNetworks, detail?.supported_networks),
          guideLanguages: pick(detail?.guideLanguages, detail?.guide_languages),
          guideExperience: pick(detail?.guideExperience, detail?.guide_experience),
          guideExpertise: pick(detail?.guideExpertise, detail?.guide_expertise),
          businessOwner: detail?.businessOwner || null,
          packages: packages.map((pkg: any) => ({
            id: pick(pkg?.id, pkg?.packageId),
            title: pick(pkg?.title, pkg?.name),
            type: pick(pkg?.type, pkg?.packageType),
            price: pick(pkg?.price, pkg?.amount, pkg?.startingPrice),
            departureDate: pick(pkg?.departureDate, pkg?.departure_date),
            returnDate: pick(pkg?.returnDate, pkg?.return_date),
            isActive: Boolean(pkg?.isActive ?? pkg?.active ?? true),
          })),
          documents,
          totalBookings: pick(detail?.totalBookings, detail?.bookingsCount),
          totalRevenue: pick(detail?.totalRevenue, detail?.revenue, detail?.grossRevenue),
          trustScore: pick(detail?.trustScore, detail?.rating, detail?.score),
        })
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load operator.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [operatorId])

  const summary = useMemo(() => {
    const packages = operator?.packages?.length ?? 0
    const activePackages = operator?.packages?.filter((pkg) => pkg.isActive).length ?? 0
    const bookings = Number(operator?.totalBookings ?? 0)
    const revenue = Number(operator?.totalRevenue ?? 0)
    return { packages, activePackages, bookings, revenue }
  }, [operator])

  const tabs = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "compliance", label: "Compliance", icon: ShieldCheck },
    { id: "packages", label: "Packages", icon: BriefcaseBusiness },
    { id: "owner", label: "Owner", icon: UserRound },
  ]

  if (loading) {
    return (
      <main className="p-5 sm:p-8">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-10 text-center text-sm text-[#7b8580]">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="size-5 animate-spin text-[#07845f]" />
            Loading operator profile…
          </div>
        </div>
      </main>
    )
  }

  if (error || !operator) {
    return (
      <main className="p-5 sm:p-8">
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-[#a43229]">
          <p className="font-bold">Unable to load this operator</p>
          <p className="mt-2 text-sm">{error || "The operator profile could not be loaded."}</p>
          <Link href="/dashboard/operators" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a43229]">
            <ArrowLeft className="size-4" /> Back to operators
          </Link>
        </div>
      </main>
    )
  }

  const companyName = operator.companyName || "Partner"
  const initials = companyName.split(" ").slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "OP"
  const partnerLabel = partnerTypeLabel(operator.partnerType)
  const ownerName = operator.businessOwner ? [operator.businessOwner.title, operator.businessOwner.firstName, operator.businessOwner.lastName].filter(Boolean).join(" ") : "Not linked"
  const verificationStatus = operator.verificationStatus || "pending"
  const requiredDocuments = getRequiredDocuments(operator.partnerType)
  const submittedDocuments = operator.documents || []
  const documentMap = new Map(submittedDocuments.map((doc) => [String(doc.type || "").toLowerCase(), doc]))

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/operators" className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Partner profile</p>
            <h1 className="mt-2 font-brand flex items-center gap-3 text-3xl font-bold text-[#17201c]">
              {companyName}
              {operator.isActive && <CheckCircle2 className="size-5 text-[#0c6b50]" />}
            </h1>
            <p className="mt-2 text-sm text-[#68716d]">Partner ID: #{String(operator.id ?? "—")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VerificationPill status={verificationStatus} />
          <Link href="/dashboard/operators" className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">
            Back to list <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="rounded-2xl border border-[#dbe2de] bg-[#0f2330] p-5 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-white/10 text-2xl font-bold text-white">{initials}</div>
            <div>
              <h2 className="text-xl font-bold">{companyName}</h2>
              <p className="mt-1 text-sm text-white/70">{partnerLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">Tier {operator.tier || "Standard"}</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">{operator.isActive ? "Active" : "Suspended"}</span>
          </div>
        </div>
      </div>

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
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5">
              <h3 className="font-brand text-lg font-bold text-[#17201c]">Contact</h3>
              <div className="mt-4 space-y-3 text-sm text-[#68716d]">
                <div className="flex items-start gap-3"><Mail className="mt-0.5 size-4 text-[#66716c]" /> <span className="break-all">{operator.email || "No email on file"}</span></div>
                <div className="flex items-start gap-3"><Phone className="mt-0.5 size-4 text-[#66716c]" /> <span>{operator.phone || operator.whatsappNumber || "No phone number"}</span></div>
                <div className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 text-[#66716c]" /> <span>{[operator.location, operator.country].filter(Boolean).join(", ") || "Location not provided"}</span></div>
                <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-4 text-[#66716c]" /> <span>Joined {formatDate(operator.createdAt)}</span></div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5">
              <h3 className="font-brand text-lg font-bold text-[#17201c]">Business owner</h3>
              <div className="mt-4 space-y-2 text-sm text-[#68716d]">
                <div className="font-bold text-[#17201c]">{ownerName}</div>
                {operator.businessOwner?.phone && <div>{operator.businessOwner.phone}</div>}
                {operator.businessOwner?.nin && <div>NIN: {operator.businessOwner.nin}</div>}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">
                  <span>Packages</span>
                  <BriefcaseBusiness className="size-4 text-[#07845f]" />
                </div>
                <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.packages}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Live board</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">
                  <span>Bookings</span>
                  <Wallet className="size-4 text-[#0d7d5f]" />
                </div>
                <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.bookings}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Total</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">
                  <span>Revenue</span>
                  <CircleDollarSign className="size-4 text-[#07845f]" />
                </div>
                <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCurrency(summary.revenue)}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Gross</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">
                  <span>Trust</span>
                  <ShieldCheck className="size-4 text-[#0c6b50]" />
                </div>
                <p className="mt-4 text-3xl font-bold text-[#17201c]">{operator.trustScore ?? "—"}</p>
                <p className="mt-1 text-xs text-[#7b8580]">Score</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dbe2de] bg-white p-5">
              <h3 className="font-brand text-xl font-bold text-[#17201c]">Operator essentials</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Address</div>
                  <div className="mt-2 text-sm font-bold text-[#17201c]">{operator.address || "Not provided"}</div>
                </div>
                <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Partner type</div>
                  <div className="mt-2 text-sm font-bold text-[#17201c]">{partnerLabel}</div>
                </div>
                <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Verification</div>
                  <div className="mt-2"><VerificationPill status={verificationStatus} /></div>
                </div>
                <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Tier</div>
                  <div className="mt-2 text-sm font-bold text-[#17201c]">{operator.tier || "Standard"}</div>
                </div>
              </div>
              {operator.description && (
                <div className="mt-5 rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4 text-sm leading-6 text-[#4d5d59]">{operator.description}</div>
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === "compliance" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
          <h3 className="font-brand text-xl font-bold text-[#17201c]">Compliance</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Verification status</div>
              <div className="mt-3"><VerificationPill status={verificationStatus} /></div>
            </div>
            <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Access</div>
              <div className="mt-3 text-sm font-bold text-[#17201c]">{operator.isActive ? "Active" : "Suspended"}</div>
            </div>
            {operator.nahconId && <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">NAHCON</div><div className="mt-3 text-sm font-bold text-[#17201c]">{operator.nahconId}</div></div>}
            {operator.telecomPermit && <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Telecom permit</div><div className="mt-3 text-sm font-bold text-[#17201c]">{operator.telecomPermit}</div></div>}
            {operator.transportReg && <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Transport reg</div><div className="mt-3 text-sm font-bold text-[#17201c]">{operator.transportReg}</div></div>}
            {operator.capacity && <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Capacity</div><div className="mt-3 text-sm font-bold text-[#17201c]">{operator.capacity}</div></div>}
          </div>

          <div className="mt-8 rounded-2xl border border-[#edf1ef] bg-[#fafcfa] p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-brand text-lg font-bold text-[#17201c]">Submitted partner documents</h4>
              <span className="rounded-full bg-[#eaf9f3] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0d7d5f]">{submittedDocuments.length} files</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {requiredDocuments.map((doc) => {
                const submitted = documentMap.get(doc.key)
                const status = submitted?.status || "not_uploaded"
                const label = submitted?.filename || doc.label
                const href = submitted?.url

                return (
                  <div key={doc.key} className="rounded-xl border border-[#e5ebe8] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-[#17201c]">{doc.label}</div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${status === "approved" ? "bg-[#eaf9f3] text-[#0c6b50]" : status === "rejected" ? "bg-[#fff0ee] text-[#b2382f]" : "bg-[#fff6dc] text-[#8a6500]"}`}>
                        {status === "approved" ? "Verified" : status === "rejected" ? "Rejected" : status === "pending" ? "Pending" : "Not uploaded"}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-[#68716d]">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-[#0d7d5f] underline">{label}</a>
                      ) : (
                        <span>No file uploaded</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {activeTab === "packages" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
          <h3 className="font-brand text-xl font-bold text-[#17201c]">Packages</h3>
          <div className="mt-6 overflow-hidden rounded-xl border border-[#edf1ef]">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                <tr>
                  <th className="px-4 py-3 font-bold">Title</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Price</th>
                  <th className="px-4 py-3 font-bold">Departure</th>
                  <th className="px-4 py-3 font-bold">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {(!operator.packages || operator.packages.length === 0) ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#7b8580]">No packages yet.</td></tr>
                ) : (
                  operator.packages.map((pkg) => (
                    <tr key={String(pkg.id ?? pkg.title ?? Math.random())}>
                      <td className="px-4 py-3 font-bold text-[#17201c]">{pkg.title || "Package"}</td>
                      <td className="px-4 py-3 text-[#49615b]">{pkg.type || "Custom"}</td>
                      <td className="px-4 py-3 font-bold text-[#17201c]">{formatCurrency(pkg.price)}</td>
                      <td className="px-4 py-3 text-[#49615b]">{formatDate(pkg.departureDate)}</td>
                      <td className="px-4 py-3 text-[#49615b]">{formatDate(pkg.returnDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "owner" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6">
          <h3 className="font-brand text-xl font-bold text-[#17201c]">Business owner</h3>
          {!operator.businessOwner ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#d9dfdc] bg-[#f9fbfa] p-8 text-center text-sm text-[#7b8580]">No owner linked.</div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Full name</div><div className="mt-2 text-sm font-bold text-[#17201c]">{ownerName}</div></div>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Phone</div><div className="mt-2 text-sm font-bold text-[#17201c]">{operator.businessOwner.phone || "Not provided"}</div></div>
              <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">NIN</div><div className="mt-2 text-sm font-bold text-[#17201c]">{operator.businessOwner.nin || "Not provided"}</div></div>
              {operator.businessOwner.idUrl && (
                <div className="rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4"><div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">ID document</div><a className="mt-2 inline-flex text-sm font-bold text-[#0d7d5f] underline" href={operator.businessOwner.idUrl} target="_blank" rel="noreferrer">View document</a></div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
