"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, Loader2, Play, XCircle } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type WebhookEvent = {
  id: string
  providerEventId?: string
  eventType?: string
  status?: string
  processingError?: string
  receivedAt?: string
  processedAt?: string
  payloadHash?: string
  accountNumber?: string
  amount?: string
  reference?: string
  scope?: string
  eventTime?: string
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function statusStyle(status?: string) {
  if (status === "PROCESSED") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (status === "QUARANTINED") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

function renderEventStatusIcon(status?: string) {
  if (status === "PROCESSED") {
    return <CheckCircle2 className="size-5 shrink-0 text-[#19824e]" />
  }
  if (status === "QUARANTINED") {
    return <XCircle className="size-5 shrink-0 text-[#b44035]" />
  }
  return <CircleAlert className="size-5 shrink-0 text-[#b48100]" />
}

export default function TreasuryWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [accountNumber, setAccountNumber] = useState("4000138405")
  const [amount, setAmount] = useState("1200")
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const webhooksResponse = await fetch("/api/admin/fcmb-diagnostics/webhooks", { cache: "no-store" })
      const webhooksPayload = await webhooksResponse.json().catch(() => null)
      if (Array.isArray(webhooksPayload?.events)) {
        setEvents(webhooksPayload.events)
        setSelectedEvent((current) => current ?? webhooksPayload.events[0] ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load webhook events.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(interval)
  }, [])

  const triggerPayment = async () => {
    setTriggering(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/sandbox-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, amount: Number(amount) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Sandbox payment was rejected.")
      setNotice(
        `Sandbox payment accepted${
          payload?.resourceId ? `: resource ${payload.resourceId}` : "."
        } Waiting for the BaaS webhook.`
      )
      window.setTimeout(() => void load(), 2500)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sandbox payment failed.")
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="space-y-6">
      <TreasurySubnav
        title="BaaS Webhooks & Sandbox Simulator"
        subtitle="Inspect authenticated inward webhook deliveries (/api/internal/baas/webhooks/fcmb & /providus) and simulate sandbox credits."
        loading={loading}
        onRefresh={() => void load()}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Delivered Webhook Events</h2>
            <span className="text-xs font-semibold text-[#63736b]">Refreshes every 15 seconds</span>
          </div>

          {loading && (
            <div className="grid min-h-52 place-items-center">
              <Loader2 className="size-6 animate-spin text-[#07845f]" />
            </div>
          )}
          {!loading && error && (
            <div className="mt-5 rounded-lg bg-[#fff0ee] p-4 text-sm text-[#a83b31]">{error}</div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-[#c9d8d0] p-8 text-center text-sm text-[#63736b]">
              No authenticated BaaS events have reached UfitGo yet.
            </div>
          )}
          {!loading && !error && events.length > 0 && (
            <div className="mt-5 space-y-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className={`flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition ${
                    selectedEvent?.id === event.id
                      ? "border-[#07845f] bg-[#ecf8f2]"
                      : "border-[#e0e8e3] hover:bg-[#f7faf8]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {renderEventStatusIcon(event.status)}
                    <div>
                      <p className="font-bold">{event.eventType || "Unknown event"}</p>
                      <p className="mt-1 text-xs text-[#63736b]">{formatDate(event.receivedAt)}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(event.status)}`}>
                    {event.status || "RECEIVED"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
            <h2 className="text-lg font-bold">Selected Event Details</h2>
            {selectedEvent ? (
              <dl className="mt-5 grid gap-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Event</dt>
                  <dd className="mt-1 font-bold">{selectedEvent.eventType || "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Provider Event ID</dt>
                  <dd className="mt-1 break-all font-mono text-xs">{selectedEvent.providerEventId || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Wallet Credit</dt>
                  <dd className="mt-1">
                    {selectedEvent.accountNumber || "-"} · NGN {selectedEvent.amount || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Reference / Scope</dt>
                  <dd className="mt-1 break-all text-xs">
                    {selectedEvent.reference || "-"}
                    <span className="ml-2 text-[#63736b]">{selectedEvent.scope || ""}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Received</dt>
                  <dd className="mt-1">{formatDate(selectedEvent.receivedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Payload Checksum</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-[#52625a]">
                    {selectedEvent.payloadHash || "-"}
                  </dd>
                </div>
                {selectedEvent.processingError && (
                  <div className="rounded-lg bg-[#fff0ee] p-3 text-sm text-[#a83b31]">
                    {selectedEvent.processingError}
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-5 text-sm text-[#63736b]">Select an event to inspect it.</p>
            )}
          </section>

          <section className="rounded-xl border border-[#e5d49c] bg-[#fffcef] p-5">
            <div className="flex items-center gap-2">
              <Play className="size-4 text-[#9a7000]" />
              <h2 className="text-lg font-bold">Sandbox Payment Simulator</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <div>
                <label htmlFor="sandbox-wallet-account" className="block text-sm font-semibold">
                  Wallet account
                </label>
                <input
                  id="sandbox-wallet-account"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 font-mono text-sm outline-none focus:border-[#967000]"
                />
              </div>
              <div>
                <label htmlFor="sandbox-amount-ngn" className="block text-sm font-semibold">
                  Amount (NGN)
                </label>
                <input
                  id="sandbox-amount-ngn"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 text-sm outline-none focus:border-[#967000]"
                />
              </div>
            </div>
            {notice && <p className="mt-4 rounded-lg bg-[#edf8f1] p-3 text-sm text-[#17633d]">{notice}</p>}
            <button
              type="button"
              onClick={() => void triggerPayment()}
              disabled={triggering || !accountNumber || Number(amount) <= 0}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#a67900] text-sm font-bold text-white hover:bg-[#8d6600] disabled:opacity-60"
            >
              {triggering ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Trigger sandbox credit
            </button>
          </section>
        </aside>
      </section>
    </div>
  )
}
