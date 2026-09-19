"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { AppSelect } from "@/components/ui/app-select"
import {
  ArrowLeft,
  Banknote,
  Calendar,
  ClipboardCheck,
  IdCard,
  Loader2,
  Mail,
  MessageSquare,
  Package as PackageIcon,
  Phone,
  Receipt,
  Save,
  Stamp,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react"

type BookingRecord = {
  id?: string | number
  bookingRef?: string
  pilgrimName?: string
  pilgrimPhone?: string
  pilgrimEmail?: string
  numberOfPilgrims?: number
  packageName?: string
  operatorName?: string
  totalAmount?: number | string
  amountPaid?: number | string
  status?: string
  currentJourneyStage?: string
  stageEnteredAt?: string
  stageNotes?: string
  assignedConcierge?: string
  followUpCount?: number
  nextFollowUpAt?: string
  lastContactedAt?: string
  createdAt?: string
  departureDate?: string
  conciergeDocumentReview?: Record<string, { status?: string; notes?: string; url?: string; updatedAt?: string }>
  visaProgress?: {
    status?: string
    applicationNumber?: string
    passportNumberMasked?: string
    submittedAt?: string
    note?: string
    updatedAt?: string
    history?: Array<{ status: string; note?: string; updatedAt: string; updatedBy?: string }>
  }
}

type TravelerDocument = { id: string; type: string; viewUrl?: string; status?: string }
type Traveler = { id: string; fullName: string; relationship?: string; nin?: string; linkedUserId?: string }

type PaymentEvent = {
  id: string | number
  amount: number
  status: string
  reference?: string
  createdAt?: string
  stages: string[]
  platformCommission?: number
  operatorAmount?: number
  paymentStatus?: string
}

type PaymentBreakdown = {
  numberOfPilgrims?: number
  registrationFeeAmount: number
  registrationAmountPaid: number
  basePackageAmount: number
  discountAmount: number
  packageAmountPaid: number
  totalAmount: number
  amountPaid: number
  payments: PaymentEvent[]
}

const officialStages = [
  { value: "CHECKOUT_INITIATED", label: "Checkout initiated" },
  { value: "AWAITING_CONCIERGE", label: "Awaiting concierge" },
  { value: "CONCIERGE_PROCESSING", label: "Concierge processing" },
  { value: "DOCUMENTS_VERIFIED", label: "Documents verified" },
  { value: "PAYMENT_PHASE", label: "Payment phase" },
  { value: "FULFILLMENT_READY", label: "Fulfillment ready" },
  { value: "COMPLETED", label: "Completed" },
]

const documentRequirements = [
  { key: "passport", label: "Valid passport", hint: "At least 6 months validity from travel date and 2 blank pages." },
  { key: "vaccination", label: "Vaccination certificate", hint: "Meningitis ACWY plus current requirements based on origin." },
  { key: "passport_photo", label: "Passport photos", hint: "Recent colour passport photos on a white background." },
  { key: "relationship_proof", label: "Proof of relationship", hint: "Marriage certificate for spouses or birth certificates for children." },
  { key: "shahadah", label: "Shahadah certificate", hint: "Official Islamic centre letter when a convert passport has no Muslim name." },
]

const documentStatusOptions = ["missing", "received", "approved", "rejected", "not_applicable", "to_be_issued"]

const visaStatusOptions = [
  "NOT_STARTED", "DOCUMENTS_REQUESTED", "DOCUMENTS_RECEIVED", "SUBMITTED_TO_OPERATOR",
  "SUBMITTED_TO_AUTHORITY", "ADDITIONAL_INFORMATION_REQUIRED", "UNDER_PROCESSING",
  "APPROVED", "REJECTED_OR_DELAYED",
]

const travelerDocTypes = [
  { type: "PASSPORT", label: "Passport" },
  { type: "VISA", label: "Visa" },
  { type: "HEALTH_CARD", label: "Health card" },
]

const tabs = [
  { id: "overview", label: "Overview", icon: UserRound },
  { id: "payments", label: "Payments", icon: Receipt },
  { id: "documents", label: "Documents", icon: ClipboardCheck },
  { id: "visa", label: "Visa progress", icon: Stamp },
  { id: "travelers", label: "Travelers", icon: IdCard },
] as const

const stageLabels: Record<string, string> = {
  REGISTRATION: "Registration",
  INITIAL_PAYMENT: "Initial deposit",
  FINAL_PAYMENT: "Final balance",
}

const paymentStatusTone: Record<string, string> = {
  successful: "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]",
  pending: "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]",
  failed: "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]",
  cancelled: "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]",
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatNaira(amount?: number | string) {
  const numeric = Number(amount ?? 0)
  if (!Number.isFinite(numeric)) return "₦0"
  return `₦${numeric.toLocaleString("en-NG")}`
}

function paymentTileStatus(paid: number, total: number) {
  if (total <= 0) return { label: "Not applicable", tone: "text-[#9aa39e]" }
  if (paid <= 0) return { label: "Not started", tone: "text-[#9aa39e]" }
  if (paid >= total) return { label: "Paid in full", tone: "text-[#0c6b50]" }
  return { label: "Partially paid", tone: "text-[#8a6500]" }
}

function PaymentSummaryTile({ label, paid, total }: { label: string; paid: number; total: number }) {
  const percent = total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0
  const { label: statusLabel, tone } = paymentTileStatus(paid, total)
  return (
    <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">{label}</span>
      <p className="mt-3 text-2xl font-bold text-[#17201c]">{formatNaira(paid)} <span className="text-sm font-semibold text-[#9aa39e]">/ {formatNaira(total)}</span></p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#edf1ef]"><div className="h-full rounded-full bg-[#0d7d5f]" style={{ width: `${percent}%` }} /></div>
      <p className={`mt-2 text-xs font-bold ${tone}`}>{statusLabel}</p>
    </div>
  )
}

function PaymentsTab({ data, loading }: { data: PaymentBreakdown | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid place-items-center rounded-2xl border border-[#dbe2de] bg-white p-14">
        <Loader2 className="size-6 animate-spin text-[#0d7d5f]" />
      </div>
    )
  }

  if (!data || !Array.isArray(data.payments)) {
    return (
      <div className="rounded-2xl border border-[#dbe2de] bg-white p-8 text-center text-sm text-[#7b8580]">Unable to load payment history for this booking.</div>
    )
  }

  const packageBalance = Math.max(data.basePackageAmount - data.discountAmount, 0)
  const events = [...data.payments].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <PaymentSummaryTile label="Registration fee" paid={data.registrationAmountPaid} total={data.registrationFeeAmount} />
        <PaymentSummaryTile label="Package balance" paid={data.packageAmountPaid} total={packageBalance} />
        <PaymentSummaryTile label="Total booking value" paid={data.amountPaid} total={data.totalAmount} />
      </div>

      {typeof data.numberOfPilgrims === "number" && (
        <p className="text-xs text-[#7b8580]">Covers {data.numberOfPilgrims} pilgrim{data.numberOfPilgrims === 1 ? "" : "s"} on this booking — stage amounts already reflect the full group, not per-traveler splits.</p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="border-b border-[#edf1ef] px-5 py-4">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Payment history</h2>
          <p className="mt-0.5 text-xs text-[#7b8580]">Every tranche received for this booking, most recent first.</p>
        </div>
        {events.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#7b8580]">No payments recorded yet.</div>
        ) : (
          <div className="divide-y divide-[#edf1ef]">
            {events.map((event) => (
              <div key={String(event.id)} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-[#eaf9f3] text-[#0d7d5f]"><Receipt className="size-4" /></span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#17201c]">{formatNaira(event.amount)}</span>
                      {event.stages.length > 0 ? (
                        event.stages.map((stage) => (
                          <span key={stage} className="rounded-full border border-[#dfe7e3] bg-[#f7faf9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#68716d]">{stageLabels[stage] || stage}</span>
                        ))
                      ) : (
                        <span className="rounded-full border border-[#dfe7e3] bg-[#f7faf9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#68716d]">Unspecified stage</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#9aa39e]">{formatDateTime(event.createdAt)} {event.reference ? `· Ref ${event.reference}` : ""}</p>
                    {(event.operatorAmount !== undefined || event.platformCommission !== undefined) && (
                      <p className="mt-0.5 text-xs text-[#9aa39e]">Partner receives {formatNaira(event.operatorAmount)} · Platform fee {formatNaira(event.platformCommission)}</p>
                    )}
                  </div>
                </div>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${paymentStatusTone[event.status] || paymentStatusTone.pending}`}>{event.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function stageTone(stage?: string) {
  switch (stage) {
    case "COMPLETED": return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
    case "FULFILLMENT_READY": return "bg-[#e8f2ff] text-[#0f5fa8] border border-[#cfe3f7]"
    case "PAYMENT_PHASE":
    case "PAYMENT_PENDING": return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
    case "DOCUMENTS_VERIFIED": return "bg-[#f1ecff] text-[#5b3fb0] border border-[#e0d6fb]"
    case "CONCIERGE_PROCESSING":
    case "CONCIERGE_REVIEW":
    case "DOCUMENTS_PENDING": return "bg-[#e8fbff] text-[#0f7f9a] border border-[#cdeef5]"
    default: return "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]"
  }
}

function parseStageNotes(notes?: string) {
  if (!notes) return []
  return notes.split("\n").filter(Boolean).reverse()
}

export default function JourneyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? "")

  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [visaFeatureEnabled, setVisaFeatureEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview")

  const [stage, setStage] = useState("")
  const [concierge, setConcierge] = useState("")
  const [stageNotes, setStageNotes] = useState("")
  const [savingStage, setSavingStage] = useState(false)

  const [followUpNotes, setFollowUpNotes] = useState("")
  const [nextFollowUpAt, setNextFollowUpAt] = useState("")
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  const [surchargeAmount, setSurchargeAmount] = useState("")
  const [surchargeReason, setSurchargeReason] = useState("")
  const [savingSurcharge, setSavingSurcharge] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const [travelers, setTravelers] = useState<Traveler[]>([])
  const [travelersLoading, setTravelersLoading] = useState(false)
  const [travelerDocs, setTravelerDocs] = useState<Record<string, TravelerDocument[]>>({})
  const [newTraveler, setNewTraveler] = useState({ fullName: "", relationship: "", nin: "" })
  const [addingTraveler, setAddingTraveler] = useState(false)

  const [visaForm, setVisaForm] = useState({ status: "NOT_STARTED", applicationNumber: "", passportLast4: "", submittedAt: "", note: "" })
  const [savingVisa, setSavingVisa] = useState(false)

  const [docSaving, setDocSaving] = useState<string | null>(null)

  const [payments, setPayments] = useState<PaymentBreakdown | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [bookingsRes, configRes] = await Promise.all([
        fetch("/api/admin/bookings/journey-tracker", { cache: "no-store" }),
        fetch("/api/admin/customers/system/config", { cache: "no-store" }),
      ])
      const bookingsPayload = await bookingsRes.json().catch(() => null)
      if (!bookingsRes.ok) throw new Error(bookingsPayload?.message || "Unable to load booking")
      const list: BookingRecord[] = Array.isArray(bookingsPayload) ? bookingsPayload : Array.isArray(bookingsPayload?.data) ? bookingsPayload.data : []
      const found = list.find((item) => String(item.id) === id) || null
      if (!found) throw new Error("Booking not found")
      setBooking(found)
      setStage(found.currentJourneyStage || "CHECKOUT_INITIATED")
      setConcierge(found.assignedConcierge || "")

      const configPayload = await configRes.json().catch(() => null)
      setVisaFeatureEnabled(configPayload?.features?.enableVisaProgress !== false)

      const visa = found.visaProgress
      setVisaForm({
        status: visa?.status || "NOT_STARTED",
        applicationNumber: visa?.applicationNumber || "",
        passportLast4: visa?.passportNumberMasked?.slice(-4) || "",
        submittedAt: visa?.submittedAt?.slice(0, 10) || "",
        note: "",
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load booking")
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }

  const loadTravelers = async () => {
    setTravelersLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/travelers`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      const list: Traveler[] = Array.isArray(payload?.data) ? payload.data : []
      setTravelers(list)
      for (const traveler of list) {
        void loadTravelerDocs(traveler.id)
      }
    } finally {
      setTravelersLoading(false)
    }
  }

  const loadTravelerDocs = async (travelerId: string) => {
    const response = await fetch(`/api/admin/bookings/travelers/${travelerId}/documents`, { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    setTravelerDocs((current) => ({ ...current, [travelerId]: Array.isArray(payload?.data) ? payload.data : [] }))
  }

  const loadPayments = async () => {
    setPaymentsLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/payments`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setPayments(response.ok && Array.isArray(payload?.payments) ? payload : null)
    } finally {
      setPaymentsLoading(false)
    }
  }

  useEffect(() => {
    if (id) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (activeTab === "travelers" && id) void loadTravelers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id])

  useEffect(() => {
    if (activeTab === "payments" && id) void loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id])

  async function saveStage() {
    if (!booking) return
    setSavingStage(true)
    try {
      const data: Record<string, unknown> = {}
      if (stage !== booking.currentJourneyStage) data.stage = stage
      if (concierge !== (booking.assignedConcierge || "")) data.assignedConcierge = concierge
      if (stageNotes.trim()) data.notes = stageNotes.trim()
      const response = await fetch(`/api/admin/bookings/${id}/update-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Unable to save")
      setStageNotes("")
      await load()
    } catch {
      window.alert("Failed to update booking.")
    } finally {
      setSavingStage(false)
    }
  }

  async function saveFollowUp() {
    if (!followUpNotes.trim()) {
      window.alert("Follow-up notes are required.")
      return
    }
    setSavingFollowUp(true)
    try {
      const data: Record<string, unknown> = { notes: followUpNotes.trim() }
      if (nextFollowUpAt) data.nextFollowUpAt = nextFollowUpAt
      const response = await fetch(`/api/admin/bookings/${id}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error("Unable to save")
      setFollowUpNotes("")
      setNextFollowUpAt("")
      await load()
    } catch {
      window.alert("Failed to record follow-up.")
    } finally {
      setSavingFollowUp(false)
    }
  }

  async function applySurcharge() {
    const amount = Number(surchargeAmount)
    if (!amount || !surchargeReason.trim()) {
      window.alert("A surcharge amount and reason are required.")
      return
    }
    setSavingSurcharge(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/surcharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: surchargeReason.trim() }),
      })
      if (!response.ok) throw new Error("Unable to apply surcharge")
      setSurchargeAmount("")
      setSurchargeReason("")
      await load()
    } catch {
      window.alert("Failed to apply surcharge.")
    } finally {
      setSavingSurcharge(false)
    }
  }

  async function cancelBooking() {
    const reason = window.prompt("Enter cancellation reason (required):")
    if (!reason) return
    setCancelling(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!response.ok) throw new Error("Unable to cancel booking")
      router.push("/dashboard/journeys")
    } catch {
      window.alert("Failed to cancel booking.")
      setCancelling(false)
    }
  }

  async function saveDocumentReview(documentType: string, status: string) {
    setDocSaving(documentType)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/document-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, status }),
      })
      if (!response.ok) throw new Error("Unable to save")
      await load()
    } catch {
      window.alert("Failed to update document status.")
    } finally {
      setDocSaving(null)
    }
  }

  async function saveVisaProgress() {
    setSavingVisa(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/visa-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: visaForm.status,
          applicationNumber: visaForm.applicationNumber || undefined,
          passportNumberLast4: visaForm.passportLast4 || undefined,
          submittedAt: visaForm.submittedAt || undefined,
          note: visaForm.note || undefined,
        }),
      })
      if (!response.ok) throw new Error("Unable to save")
      setVisaForm((current) => ({ ...current, note: "" }))
      await load()
    } catch {
      window.alert("Failed to update visa progress.")
    } finally {
      setSavingVisa(false)
    }
  }

  async function addTraveler() {
    if (!newTraveler.fullName.trim()) return
    setAddingTraveler(true)
    try {
      const response = await fetch(`/api/admin/bookings/${id}/travelers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTraveler),
      })
      if (!response.ok) throw new Error("Unable to add traveler")
      setNewTraveler({ fullName: "", relationship: "", nin: "" })
      await loadTravelers()
    } catch {
      window.alert("Failed to add traveler.")
    } finally {
      setAddingTraveler(false)
    }
  }

  async function removeTraveler(travelerId: string) {
    if (!window.confirm("Remove this traveler?")) return
    await fetch(`/api/admin/bookings/travelers/${travelerId}`, { method: "DELETE" })
    await loadTravelers()
  }

  async function saveTravelerNin(travelerId: string, nin: string) {
    await fetch(`/api/admin/bookings/travelers/${travelerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nin }),
    })
  }

  async function uploadTravelerDocument(travelerId: string, type: string, file: File) {
    const form = new FormData()
    form.append("type", type)
    form.append("file", file)
    await fetch(`/api/admin/bookings/travelers/${travelerId}/documents`, { method: "POST", body: form })
    await loadTravelerDocs(travelerId)
  }

  async function removeTravelerDocument(travelerId: string, docId: string) {
    await fetch(`/api/admin/bookings/travelers/${travelerId}/documents/${docId}`, { method: "DELETE" })
    await loadTravelerDocs(travelerId)
  }

  const balance = useMemo(() => {
    if (!booking) return 0
    return Number(booking.totalAmount || 0) - Number(booking.amountPaid || 0)
  }, [booking])

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center p-8">
        <Loader2 className="size-8 animate-spin text-[#0d7d5f]" />
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{error || "Booking not found."}</div>
        <Link href="/dashboard/journeys" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a43229]">
          <ArrowLeft className="size-4" /> Back to journey tracker
        </Link>
      </main>
    )
  }

  const review = booking.conciergeDocumentReview || {}

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/journeys" className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Booking</p>
            <h1 className="mt-2 font-brand flex flex-wrap items-center gap-3 text-3xl font-bold text-[#17201c]">
              {booking.pilgrimName || "Pilgrim"}
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${stageTone(booking.currentJourneyStage)}`}>{(booking.currentJourneyStage || "").replaceAll("_", " ")}</span>
            </h1>
            <p className="mt-2 text-sm text-[#68716d]">{booking.bookingRef || `#${booking.id}`} · {booking.packageName || "Package unavailable"}</p>
          </div>
        </div>

        {booking.status === "pending" && (
          <button type="button" onClick={() => void cancelBooking()} disabled={cancelling} className="inline-flex items-center gap-2 rounded-lg border border-[#f4d0ca] bg-[#fff0ee] px-4 py-2.5 text-sm font-bold text-[#a43229] hover:bg-[#fddedb] disabled:opacity-50">
            {cancelling ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Cancel booking
          </button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pilgrims</span>
            <UserRound className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{booking.numberOfPilgrims ?? 1}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total amount</span>
            <Banknote className="size-4 text-[#8a6500]" />
          </div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatNaira(booking.totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Balance</span>
            <PackageIcon className="size-4 text-[#07845f]" />
          </div>
          <p className={`mt-4 text-2xl font-bold ${balance > 0 ? "text-[#a43229]" : "text-[#0c6b50]"}`}>{formatNaira(balance > 0 ? balance : 0)}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Departure</span>
            <Calendar className="size-4 text-[#0f74c1]" />
          </div>
          <p className="mt-4 text-lg font-bold text-[#17201c]">{formatDate(booking.departureDate)}</p>
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
                <div className="flex items-start gap-3"><Mail className="mt-0.5 size-4 text-[#66716c]" /> <span className="break-all">{booking.pilgrimEmail || "No email"}</span></div>
                <div className="flex items-start gap-3"><Phone className="mt-0.5 size-4 text-[#66716c]" /> <span>{booking.pilgrimPhone || "No phone"}</span></div>
                <div className="flex items-start gap-3"><PackageIcon className="mt-0.5 size-4 text-[#66716c]" /> <span>{booking.operatorName || "Unknown partner"}</span></div>
                <div className="flex items-start gap-3"><Calendar className="mt-0.5 size-4 text-[#66716c]" /> <span>Booked {formatDate(booking.createdAt)}</span></div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5">
              <h3 className="font-brand text-lg font-bold text-[#17201c]">Apply surcharge</h3>
              <p className="mt-1 text-xs text-[#7b8580]">Increases the booking total and notifies the pilgrim.</p>
              <div className="mt-3 space-y-2">
                <input type="number" value={surchargeAmount} onChange={(event) => setSurchargeAmount(event.target.value)} placeholder="Amount (₦)" className="h-10 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                <textarea value={surchargeReason} onChange={(event) => setSurchargeReason(event.target.value)} placeholder="Reason" className="h-20 w-full resize-none rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm outline-none focus:border-[#0d7d5f]" />
                <button type="button" onClick={() => void applySurcharge()} disabled={savingSurcharge} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#8a6500] px-4 text-sm font-bold text-white hover:bg-[#725300] disabled:opacity-50">
                  {savingSurcharge ? <Loader2 className="size-4 animate-spin" /> : null} Apply surcharge
                </button>
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
              <h2 className="font-brand text-lg font-bold text-[#17201c]">Stage & concierge</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Journey stage</label>
                  <AppSelect value={stage} onValueChange={setStage} options={officialStages} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Assigned concierge</label>
                  <input value={concierge} onChange={(event) => setConcierge(event.target.value)} placeholder="e.g. Sarah Smith" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Notes (optional)</label>
                <textarea value={stageNotes} onChange={(event) => setStageNotes(event.target.value)} placeholder="Add a note about this update…" className="h-20 w-full resize-none rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <button type="button" onClick={() => void saveStage()} disabled={savingStage} className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                {savingStage ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes
              </button>
            </section>

            <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
              <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#17201c]"><MessageSquare className="size-4 text-[#0d7d5f]" /> Follow-ups</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <textarea value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} placeholder="Summarize the conversation or action taken…" className="h-20 flex-1 resize-none rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm outline-none focus:border-[#0d7d5f]" />
                <div className="flex flex-col gap-2 sm:w-48">
                  <input type="date" value={nextFollowUpAt} onChange={(event) => setNextFollowUpAt(event.target.value)} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                  <button type="button" onClick={() => void saveFollowUp()} disabled={savingFollowUp} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                    {savingFollowUp ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
              {parseStageNotes(booking.stageNotes).length > 0 && (
                <div className="mt-5 space-y-3 border-t border-[#edf1ef] pt-4">
                  {parseStageNotes(booking.stageNotes).map((note, index) => (
                    <div key={index} className="rounded-lg bg-[#f7faf9] px-3 py-2 text-sm text-[#42504a]">{note}</div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <PaymentsTab data={payments} loading={paymentsLoading} />
      )}

      {activeTab === "documents" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Document checklist</h2>
          <p className="mt-1 text-sm text-[#68716d]">Track concierge review status for each required travel document.</p>
          <div className="mt-5 space-y-3">
            {documentRequirements.map((req) => {
              const status = review[req.key]?.status || "missing"
              return (
                <div key={req.key} className="flex flex-col gap-3 rounded-xl border border-[#dbe2de] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[#17201c]">{req.label}</p>
                    <p className="mt-0.5 text-xs text-[#7b8580]">{req.hint}</p>
                    {review[req.key]?.url && <a href={review[req.key]?.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-[#0d7d5f] hover:underline">View uploaded file</a>}
                  </div>
                  <AppSelect
                    value={status}
                    onValueChange={(next) => void saveDocumentReview(req.key, next)}
                    disabled={docSaving === req.key}
                    className="h-10 sm:w-52"
                    options={documentStatusOptions.map((option) => ({ value: option, label: option.replaceAll("_", " ") }))}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === "visa" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Visa progress</h2>
          {!visaFeatureEnabled ? (
            <p className="mt-3 text-sm text-[#7b8580]">Visa progress tracking is currently disabled platform-wide.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-[#68716d]">Record updates confirmed through the operator. Only the last four passport digits are stored.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Status</label>
                  <AppSelect
                    value={visaForm.status}
                    onValueChange={(next) => setVisaForm((current) => ({ ...current, status: next }))}
                    options={visaStatusOptions.map((option) => ({ value: option, label: option.replaceAll("_", " ") }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Application number</label>
                  <input value={visaForm.applicationNumber} onChange={(event) => setVisaForm((current) => ({ ...current, applicationNumber: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Passport last 4 digits</label>
                  <input value={visaForm.passportLast4} maxLength={4} onChange={(event) => setVisaForm((current) => ({ ...current, passportLast4: event.target.value.replace(/\D/g, "").slice(0, 4) }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Submitted date</label>
                  <input type="date" value={visaForm.submittedAt} onChange={(event) => setVisaForm((current) => ({ ...current, submittedAt: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Customer-visible update</label>
                <textarea value={visaForm.note} onChange={(event) => setVisaForm((current) => ({ ...current, note: event.target.value }))} placeholder="What was confirmed and what happens next?" className="h-20 w-full resize-none rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <button type="button" onClick={() => void saveVisaProgress()} disabled={savingVisa} className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                {savingVisa ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save update & notify
              </button>

              {(booking.visaProgress?.history?.length ?? 0) > 0 && (
                <div className="mt-6 space-y-3 border-t border-[#edf1ef] pt-4">
                  <h3 className="text-sm font-bold text-[#17201c]">Update history</h3>
                  {[...(booking.visaProgress?.history || [])].reverse().map((entry, index) => (
                    <div key={index} className="border-l-2 border-[#0d7d5f] pl-3 text-sm">
                      <p className="font-bold text-[#17201c]">{entry.status.replaceAll("_", " ")}</p>
                      {entry.note && <p className="mt-0.5 text-[#68716d]">{entry.note}</p>}
                      <p className="mt-0.5 text-xs text-[#9aa39e]">{formatDateTime(entry.updatedAt)} · {entry.updatedBy || "UfitGo Operations"}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === "travelers" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Travelers & travel documents</h2>
          <p className="mt-1 text-sm text-[#68716d]">Documents belong to each traveler, not this booking — they carry over to future trips.</p>

          {travelersLoading ? (
            <div className="mt-6"><Loader2 className="size-6 animate-spin text-[#0d7d5f]" /></div>
          ) : (
            <div className="mt-5 space-y-4">
              {travelers.map((traveler) => {
                const docs = travelerDocs[traveler.id] || []
                return (
                  <div key={traveler.id} className="rounded-xl border border-[#dbe2de] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-[#17201c]">{traveler.fullName} {traveler.linkedUserId && <span className="ml-2 text-xs font-semibold text-[#0d7d5f]">(Account holder)</span>}</h3>
                        <p className="mt-0.5 text-sm text-[#68716d]">{traveler.relationship || "—"}</p>
                      </div>
                      {!traveler.linkedUserId && (
                        <button type="button" onClick={() => void removeTraveler(traveler.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#a43229]">
                          <Trash2 className="size-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-[#9aa39e]">NIN:</span>
                      <input
                        defaultValue={traveler.nin || ""}
                        placeholder="Enter NIN"
                        onBlur={(event) => {
                          if (event.target.value !== (traveler.nin || "")) void saveTravelerNin(traveler.id, event.target.value)
                        }}
                        className="h-9 max-w-xs flex-1 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {travelerDocTypes.map(({ type, label }) => {
                        const doc = docs.find((d) => d.type === type)
                        return (
                          <div key={type} className="rounded-lg border border-[#dbe2de] p-3 text-sm">
                            <p className="mb-2 font-semibold text-[#17201c]">{label}</p>
                            {doc ? (
                              <div className="flex items-center justify-between gap-2">
                                <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#0d7d5f] hover:underline">View file</a>
                                <button type="button" onClick={() => void removeTravelerDocument(traveler.id, doc.id)} className="text-[#a43229]"><Trash2 className="size-4" /></button>
                              </div>
                            ) : (
                              <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0d7d5f]">
                                Upload
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) void uploadTravelerDocument(traveler.id, type, file)
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-dashed border-[#d9dfdc] p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#17201c]"><UserPlus className="size-4" /> Add a group member</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input value={newTraveler.fullName} onChange={(event) => setNewTraveler((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" className="h-10 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              <input value={newTraveler.relationship} onChange={(event) => setNewTraveler((current) => ({ ...current, relationship: event.target.value }))} placeholder="Relationship (e.g. Spouse)" className="h-10 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              <input value={newTraveler.nin} onChange={(event) => setNewTraveler((current) => ({ ...current, nin: event.target.value }))} placeholder="NIN (optional)" className="h-10 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <button type="button" disabled={!newTraveler.fullName.trim() || addingTraveler} onClick={() => void addTraveler()} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
              {addingTraveler ? <Loader2 className="size-4 animate-spin" /> : null} Add traveler
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
