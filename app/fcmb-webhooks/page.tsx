"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, Database, ExternalLink, ListChecks, Loader2, Play, RefreshCw, Radio, XCircle } from "lucide-react"

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

type Account = {
  id: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  activeTier?: number
  status?: string
  createdAt?: string
}

type LedgerEntry = {
  id: string
  internalReference?: string
  providerTransactionRef?: string
  amount?: number
  currency?: string
  transactionType?: string
  direction?: string
  status?: string
  reconciliationStatus?: string
  failureReason?: string
  webhookReceivedAt?: string
  settledAt?: string
  createdAt?: string
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function statusStyle(status?: string) {
  if (status === "PROCESSED") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (status === "QUARANTINED") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

export default function FcmbWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [accountNumber, setAccountNumber] = useState("4000138405")
  const [amount, setAmount] = useState("1200")
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [webhooksResponse, accountsResponse, ledgerResponse] = await Promise.all([
        fetch("/api/admin/fcmb-diagnostics/webhooks", { cache: "no-store" }),
        fetch("/api/admin/fcmb-diagnostics/accounts", { cache: "no-store" }),
        fetch("/api/admin/fcmb-diagnostics/ledger?limit=50", { cache: "no-store" }),
      ])
      const webhooksPayload = await webhooksResponse.json().catch(() => null)
      const accountsPayload = await accountsResponse.json().catch(() => null)
      const ledgerPayload = await ledgerResponse.json().catch(() => null)
      if (!webhooksResponse.ok || !accountsResponse.ok || !ledgerResponse.ok) throw new Error(webhooksPayload?.message || accountsPayload?.message || ledgerPayload?.message || "Unable to load FCMB diagnostics.")
      setEvents(Array.isArray(webhooksPayload?.events) ? webhooksPayload.events : [])
      setAccounts(Array.isArray(accountsPayload?.accounts) ? accountsPayload.accounts : [])
      setLedgerEntries(Array.isArray(ledgerPayload?.entries) ? ledgerPayload.entries : [])
      setSelectedEvent((current) => current ?? webhooksPayload?.events?.[0] ?? null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load diagnostics.")
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
      setNotice(`Sandbox payment accepted${payload?.resourceId ? `: resource ${payload.resourceId}` : "."} Waiting for the FCMB webhook.`)
      window.setTimeout(() => void load(), 2500)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sandbox payment failed.")
    } finally {
      setTriggering(false)
    }
  }

  const backfillAccounts = async () => {
    setBackfilling(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/backfill-accounts", { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Account backfill failed.")
      setNotice(`Backfill complete: ${payload?.mapped ?? 0} of ${payload?.scanned ?? 0} accounts mapped.`)
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Account backfill failed.")
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-5 py-8 text-[#18241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1480px]">
        <header className="flex flex-col gap-5 border-b border-[#d7e2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]"><Radio className="size-4" /> FCMB sandbox</div>
            <h1 className="mt-2 text-3xl font-bold">Webhook Diagnostics</h1>
            <p className="mt-2 text-sm text-[#5c6d64]">Callback: https://api.ufitgo.ng/api/internal/baas/webhooks/fcmb</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-4 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </header>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Delivered events</h2><span className="text-xs font-semibold text-[#63736b]">Refreshes every 15 seconds</span></div>
            {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-6 animate-spin text-[#07845f]" /></div> : error ? <div className="mt-5 rounded-lg bg-[#fff0ee] p-4 text-sm text-[#a83b31]">{error}</div> : events.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#c9d8d0] p-8 text-center text-sm text-[#63736b]">No authenticated FCMB events have reached UfitGo yet.</div> : <div className="mt-5 space-y-2">{events.map((event) => <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className={`flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition ${selectedEvent?.id === event.id ? "border-[#07845f] bg-[#ecf8f2]" : "border-[#e0e8e3] hover:bg-[#f7faf8]"}`}><div className="flex min-w-0 items-center gap-3">{event.status === "PROCESSED" ? <CheckCircle2 className="size-5 shrink-0 text-[#19824e]" /> : event.status === "QUARANTINED" ? <XCircle className="size-5 shrink-0 text-[#b44035]" /> : <CircleAlert className="size-5 shrink-0 text-[#b48100]" />}<div><p className="font-bold">{event.eventType || "Unknown event"}</p><p className="mt-1 text-xs text-[#63736b]">{formatDate(event.receivedAt)}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(event.status)}`}>{event.status || "RECEIVED"}</span></button>)}</div>}
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><h2 className="text-lg font-bold">Selected event</h2>{selectedEvent ? <dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Event</dt><dd className="mt-1 font-bold">{selectedEvent.eventType || "Unknown"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">FCMB event ID</dt><dd className="mt-1 break-all font-mono text-xs">{selectedEvent.providerEventId || "-"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Wallet credit</dt><dd className="mt-1">{selectedEvent.accountNumber || "-"} · NGN {selectedEvent.amount || "-"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Reference / scope</dt><dd className="mt-1 break-all text-xs">{selectedEvent.reference || "-"}<span className="ml-2 text-[#63736b]">{selectedEvent.scope || ""}</span></dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Received</dt><dd className="mt-1">{formatDate(selectedEvent.receivedAt)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Payload checksum</dt><dd className="mt-1 break-all font-mono text-xs text-[#52625a]">{selectedEvent.payloadHash || "-"}</dd></div>{selectedEvent.processingError && <div className="rounded-lg bg-[#fff0ee] p-3 text-sm text-[#a83b31]">{selectedEvent.processingError}</div>}</dl> : <p className="mt-5 text-sm text-[#63736b]">Select an event to inspect it.</p>}</section>

            <section className="rounded-xl border border-[#e5d49c] bg-[#fffcef] p-5"><div className="flex items-center gap-2"><Play className="size-4 text-[#9a7000]" /><h2 className="text-lg font-bold">Sandbox payment</h2></div><div className="mt-4 grid gap-3"><label className="text-sm font-semibold">Wallet account<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 font-mono text-sm outline-none focus:border-[#967000]" /></label><label className="text-sm font-semibold">Amount (NGN)<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 text-sm outline-none focus:border-[#967000]" /></label></div>{notice && <p className="mt-4 rounded-lg bg-[#edf8f1] p-3 text-sm text-[#17633d]">{notice}</p>}<button type="button" onClick={() => void triggerPayment()} disabled={triggering || !accountNumber || Number(amount) <= 0} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#a67900] text-sm font-bold text-white hover:bg-[#8d6600] disabled:opacity-60">{triggering ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Trigger sandbox credit</button></section>
          </aside>
        </section>

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Database className="size-5 text-[#07845f]" /><h2 className="text-lg font-bold">UfitGo settlement account mappings</h2></div><button type="button" onClick={() => void backfillAccounts()} disabled={backfilling} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-3 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60">{backfilling && <Loader2 className="size-4 animate-spin" />} Backfill existing accounts</button></div><div className="mt-5 overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Bank</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr></thead><tbody className="divide-y divide-[#e9efeb]">{accounts.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#63736b]">No settlement mappings yet. Use the backfill action to register existing Tier 1 accounts.</td></tr> : accounts.map((account) => <tr key={account.id}><td className="px-4 py-4 font-mono font-bold text-[#087851]">{account.accountNumber || "-"}</td><td className="px-4 py-4">{account.accountName || "-"}</td><td className="px-4 py-4">{account.bankName || "FCMB"}</td><td className="px-4 py-4">{account.activeTier || 1}</td><td className="px-4 py-4"><span className="rounded-full bg-[#eaf9f0] px-2.5 py-1 text-xs font-bold text-[#17633d]">{account.status || "active"}</span></td><td className="px-4 py-4 text-[#63736b]">{formatDate(account.createdAt)}</td></tr>)}</tbody></table></div></section>

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><div className="flex items-center gap-2"><ListChecks className="size-5 text-[#07845f]" /><div><h2 className="text-lg font-bold">Reconciliation ledger</h2><p className="mt-1 text-sm text-[#63736b]">Pending entries are rechecked automatically after 10 minutes. References let support trace a customer report without opening raw provider payloads.</p></div></div><div className="mt-5 overflow-x-auto"><table className="min-w-[960px] w-full text-left text-sm"><thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]"><tr><th className="px-4 py-3">Created</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3">Issue</th></tr></thead><tbody className="divide-y divide-[#e9efeb]">{ledgerEntries.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#63736b]">No FCMB ledger entries have been recorded yet.</td></tr> : ledgerEntries.map((entry) => <tr key={entry.id}><td className="px-4 py-4 text-[#63736b]">{formatDate(entry.createdAt)}</td><td className="max-w-[220px] px-4 py-4 font-mono text-xs text-[#087851]"><div className="truncate">{entry.providerTransactionRef || entry.internalReference || "-"}</div></td><td className="px-4 py-4 capitalize">{(entry.transactionType || "transaction").replace(/_/g, " ")}<span className="ml-2 text-xs text-[#63736b]">{entry.direction}</span></td><td className="px-4 py-4 font-bold">{entry.currency || "NGN"} {Number(entry.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(entry.status)}`}>{entry.status || "INITIATED"}</span></td><td className="px-4 py-4 text-xs text-[#63736b]">{entry.reconciliationStatus || "none"}{entry.settledAt ? ` · settled ${formatDate(entry.settledAt)}` : ""}</td><td className="max-w-[240px] px-4 py-4 text-xs text-[#a83b31]">{entry.failureReason || "-"}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  )
}