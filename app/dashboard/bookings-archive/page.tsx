"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Archive, Loader2, RefreshCw, RotateCcw, Search, Undo2, X } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"

type ArchiveReason = "expired" | "user_cancelled" | "admin_cancelled"

type LatePayment = {
  status: "open" | "reinstated" | "refunded"
  payments: { reference: string; amount: number; receivedAt: string }[]
  resolvedAt?: string
  resolvedBy?: string
  refundReference?: string
  note?: string
}

type ArchivedBooking = {
  id: number
  bookingRef: string
  pilgrimName?: string
  pilgrimPhone?: string
  pilgrimEmail?: string
  packageId: number
  packageName?: string
  operatorName?: string
  numberOfPilgrims?: number
  totalAmount: number
  amountPaid: number
  createdAt: string
  closedAt: string
  hiddenFromTraveller: boolean
  reason: ArchiveReason
  cancellationReason: string | null
  latePayment: LatePayment | null
}

type ArchiveResponse = {
  data: ArchivedBooking[]
  total: number
  page: number
  limit: number
  reviewCount: number
}

type PendingAction = { booking: ArchivedBooking; kind: "reinstate" | "refund" }

const PAGE_SIZE = 25

const reasonOptions = [
  { value: "all", label: "All reasons" },
  { value: "expired", label: "Expired (unpaid)" },
  { value: "user_cancelled", label: "Cancelled by traveller" },
  { value: "admin_cancelled", label: "Cancelled by admin" },
]

const REASON_LABEL: Record<ArchiveReason, string> = {
  expired: "Expired",
  user_cancelled: "Cancelled by traveller",
  admin_cancelled: "Cancelled by admin",
}

const naira = (amount: number) => `₦${Number(amount || 0).toLocaleString("en-NG")}`
const dateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—"

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.details?.message || payload?.message || "Request failed")
  }
  return payload
}

export default function ArchivedBookingsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [reason, setReason] = useState("all")
  const [needsReview, setNeedsReview] = useState(false)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [note, setNote] = useState("")
  const [refundReference, setRefundReference] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  if (submittedSearch.trim()) params.set("search", submittedSearch.trim())
  if (reason !== "all") params.set("reason", reason)
  if (needsReview) params.set("needsReview", "true")
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  const queryString = params.toString()

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["archived-bookings", queryString],
    queryFn: async () => {
      const response = await fetch(`/api/admin/bookings/archived?${queryString}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Could not load archived bookings")
      return payload as ArchiveResponse
    },
  })

  const resolve = useMutation({
    mutationFn: async (action: PendingAction) => {
      const id = action.booking.id
      if (action.kind === "reinstate") {
        return postJson(`/api/admin/bookings/archived/${id}/reinstate`, { note: note.trim() || undefined })
      }
      return postJson(`/api/admin/bookings/archived/${id}/mark-refunded`, {
        note: note.trim(),
        refundReference: refundReference.trim() || undefined,
      })
    },
    onSuccess: (_result, action) => {
      setNotice(
        action.kind === "reinstate"
          ? `${action.booking.bookingRef} reinstated and payment applied. The traveller can see it in My Trips again.`
          : `Refund recorded for ${action.booking.bookingRef}.`,
      )
      closeDialog()
      void queryClient.invalidateQueries({ queryKey: ["archived-bookings"] })
    },
  })

  function closeDialog() {
    setPending(null)
    setNote("")
    setRefundReference("")
    resolve.reset()
  }

  function applyFilter(update: () => void) {
    update()
    setPage(1)
  }

  const rows = data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const reviewCount = data?.reviewCount ?? 0

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Operations</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Archived bookings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">
            Expired and cancelled bookings, including those hidden from travellers. Payments that arrive after a booking closed land here for review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#36413d] hover:bg-[#f7f9f8]"
        >
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      {reviewCount > 0 && !needsReview && (
        <button
          type="button"
          onClick={() => applyFilter(() => setNeedsReview(true))}
          className="flex w-full items-start gap-3 rounded-xl border border-[#f1e0a9] bg-[#fff6dc] p-4 text-left hover:bg-[#fff1c9]"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#8a6500]" />
          <div>
            <p className="text-sm font-bold text-[#5c4300]">
              {reviewCount} payment{reviewCount === 1 ? "" : "s"} received after the booking closed
            </p>
            <p className="mt-0.5 text-xs text-[#7a5d00]">
              The traveller was charged but has no active booking. Reinstate the booking or record a refund.
            </p>
          </div>
        </button>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-4 py-3 text-sm font-semibold text-[#0c6b50]">
          {notice}
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}><X className="size-4" /></button>
        </div>
      )}

      <section className="rounded-xl border border-[#dbe2de] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#edf1ef] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <form
            className="relative w-full xl:w-80"
            onSubmit={(event) => {
              event.preventDefault()
              applyFilter(() => setSubmittedSearch(search))
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa39e]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ref, name, phone, email or package"
              className="h-10 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-9 pr-3 text-sm outline-none focus:border-[#0d7d5f]"
            />
          </form>
          <div className="flex flex-wrap items-center gap-3">
            <AppSelect value={reason} onValueChange={(value) => applyFilter(() => setReason(value))} options={reasonOptions} className="w-52" />
            <input type="date" value={from} onChange={(event) => applyFilter(() => setFrom(event.target.value))} aria-label="Created from" className="h-10 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm" />
            <input type="date" value={to} onChange={(event) => applyFilter(() => setTo(event.target.value))} aria-label="Created to" className="h-10 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm" />
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#36413d]">
              <input type="checkbox" checked={needsReview} onChange={(event) => applyFilter(() => setNeedsReview(event.target.checked))} className="size-4 accent-[#0d7d5f]" />
              Needs review only
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#68716d]"><Loader2 className="size-4 animate-spin" /> Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-[#a43229]">{(error as Error).message}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-[#68716d]"><Archive className="size-6 text-[#9aa39e]" /> No archived bookings match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[#f7faf9] text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">
                <tr>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Traveller</th>
                  <th className="px-5 py-3">Package</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Created / closed</th>
                  <th className="px-5 py-3">Late payment</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {rows.map((booking) => {
                  const late = booking.latePayment
                  const lateTotal = late?.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0
                  const isOpen = late?.status === "open"
                  const travellers = booking.numberOfPilgrims || 1
                  return (
                    <tr key={booking.id} className={isOpen ? "bg-[#fffbeb]" : undefined}>
                      <td className="px-5 py-4 align-top">
                        <p className="font-bold text-[#17201c]">{booking.bookingRef}</p>
                        <p className="mt-0.5 text-xs text-[#78817d]">{naira(booking.totalAmount)} · {travellers} traveller{travellers === 1 ? "" : "s"}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[#17201c]">{booking.pilgrimName || "—"}</p>
                        <p className="mt-0.5 text-xs text-[#78817d]">{booking.pilgrimPhone || booking.pilgrimEmail || ""}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-[#17201c]">{booking.packageName || `Package #${booking.packageId}`}</p>
                        <p className="mt-0.5 text-xs text-[#78817d]">{booking.operatorName || ""}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex rounded-full border border-[#dbe2de] bg-[#f7faf9] px-2.5 py-1 text-xs font-bold text-[#36413d]">{REASON_LABEL[booking.reason]}</span>
                        {booking.reason === "admin_cancelled" && booking.cancellationReason ? (
                          <p className="mt-1 max-w-[220px] text-xs text-[#78817d]">{booking.cancellationReason}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 align-top text-xs text-[#36413d]">
                        <p>{dateTime(booking.createdAt)}</p>
                        <p className="mt-0.5 text-[#78817d]">Closed {dateTime(booking.closedAt)}</p>
                      </td>
                      <td className="px-5 py-4 align-top text-xs">
                        {!late ? (
                          <span className="text-[#9aa39e]">—</span>
                        ) : (
                          <div className="space-y-1">
                            <span
                              className={
                                isOpen
                                  ? "inline-flex rounded-full border border-[#f1e0a9] bg-[#fff6dc] px-2.5 py-1 font-bold text-[#8a6500]"
                                  : late.status === "reinstated"
                                    ? "inline-flex rounded-full border border-[#cfeee0] bg-[#eaf9f3] px-2.5 py-1 font-bold text-[#0c6b50]"
                                    : "inline-flex rounded-full border border-[#dbe2de] bg-[#f7faf9] px-2.5 py-1 font-bold text-[#36413d]"
                              }
                            >
                              {isOpen ? "Needs review" : late.status === "reinstated" ? "Reinstated" : "Refunded"} · {naira(lateTotal)}
                            </span>
                            {late.payments.map((p) => (
                              <p key={p.reference} className="font-mono text-[11px] text-[#78817d]">{p.reference} · {dateTime(p.receivedAt)}</p>
                            ))}
                            {!isOpen && late.resolvedBy ? (
                              <p className="text-[11px] text-[#78817d]">By {late.resolvedBy} · {dateTime(late.resolvedAt)}{late.note ? ` — ${late.note}` : ""}</p>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        {isOpen ? (
                          <div className="inline-flex flex-col gap-2">
                            <button type="button" onClick={() => setPending({ booking, kind: "reinstate" })} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d7d5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b6b51]">
                              <RotateCcw className="size-3.5" /> Reinstate
                            </button>
                            <button type="button" onClick={() => setPending({ booking, kind: "refund" })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#36413d] hover:bg-[#f7f9f8]">
                              <Undo2 className="size-3.5" /> Mark refunded
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9aa39e]">Read-only</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <PaginationBar page={page} totalPages={totalPages} total={data?.total ?? 0} limit={PAGE_SIZE} onPageChange={setPage} isFetching={isFetching} />
        )}
      </section>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-brand text-lg font-bold text-[#17201c]">
                  {pending.kind === "reinstate" ? "Reinstate booking" : "Record refund"} · {pending.booking.bookingRef}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#68716d]">
                  {pending.kind === "reinstate"
                    ? `Re-opens the booking, reserves ${pending.booking.numberOfPilgrims || 1} slot(s) again and applies the late payment. The traveller will see it in My Trips. This fails if the package no longer has enough slots.`
                    : "Use this after refunding the traveller from the payment provider dashboard. The booking stays closed; this only records the outcome."}
                </p>
              </div>
              <button type="button" onClick={closeDialog} aria-label="Close" disabled={resolve.isPending}><X className="size-5 text-[#68716d]" /></button>
            </div>

            {pending.kind === "refund" && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Refund reference (optional)</label>
                <input value={refundReference} onChange={(event) => setRefundReference(event.target.value)} placeholder="e.g. Paystack refund ID" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            )}
            <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">
              Note {pending.kind === "refund" ? "(required)" : "(optional)"}
            </label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={pending.kind === "refund" ? "How and when the refund was made" : "Why this booking is being reinstated"} className="w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] p-3 text-sm outline-none focus:border-[#0d7d5f]" />

            {resolve.error && <p className="mt-3 text-sm font-semibold text-[#a43229]">{(resolve.error as Error).message}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeDialog} disabled={resolve.isPending} className="rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#36413d] hover:bg-[#f7f9f8]">Cancel</button>
              <button
                type="button"
                onClick={() => resolve.mutate(pending)}
                disabled={resolve.isPending || (pending.kind === "refund" && !note.trim())}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
              >
                {resolve.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {pending.kind === "reinstate" ? "Reinstate and apply payment" : "Record refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
