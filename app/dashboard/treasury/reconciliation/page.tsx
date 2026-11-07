"use client"

import { useEffect, useState } from "react"
import { ListChecks, Loader2, Play, RefreshCw } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type PaystackDvaTransfer = {
  reference: string
  amount: number
  paystackStatus: string
  accountNumber: string
  bankName: string
  customerEmail: string
  customerName: string
  paidAt: string
  reconciliationStatus: "SETTLED" | "MISSED_OR_PENDING" | "UNMAPPED_ACCOUNT"
  settledTransactionId: string | null
  settledDescription: string | null
  mappedUserId: string | null
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
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function statusStyle(status?: string) {
  if (status === "PROCESSED" || status === "SUCCESSFUL") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (status === "QUARANTINED" || status === "FAILED") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

function dvaStatusBadgeStyle(reconciliationStatus: PaystackDvaTransfer["reconciliationStatus"]) {
  if (reconciliationStatus === "SETTLED") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (reconciliationStatus === "UNMAPPED_ACCOUNT") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

function dvaStatusLabel(reconciliationStatus: PaystackDvaTransfer["reconciliationStatus"]) {
  if (reconciliationStatus === "SETTLED") return "SETTLED"
  if (reconciliationStatus === "UNMAPPED_ACCOUNT") return "UNMAPPED ACCOUNT"
  return "MISSED / PENDING"
}

export default function TreasuryReconciliationPage() {
  const [paystackDvaTransfers, setPaystackDvaTransfers] = useState<PaystackDvaTransfer[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [retriggeringRef, setRetriggeringRef] = useState<string | null>(null)
  const [retriggeringAll, setRetriggeringAll] = useState(false)
  const [manualReference, setManualReference] = useState("")
  const [manualAccountNumber, setManualAccountNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [paystackDvaResponse, ledgerResponse] = await Promise.all([
        fetch("/api/admin/fcmb-diagnostics/paystack-dva/transfers?limit=30", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/ledger?limit=50", { cache: "no-store" }).catch(() => null),
      ])
      const paystackDvaPayload = paystackDvaResponse ? await paystackDvaResponse.json().catch(() => null) : null
      const ledgerPayload = ledgerResponse ? await ledgerResponse.json().catch(() => null) : null

      if (Array.isArray(paystackDvaPayload?.transfers)) {
        setPaystackDvaTransfers(paystackDvaPayload.transfers)
      }
      if (Array.isArray(ledgerPayload?.entries)) {
        setLedgerEntries(ledgerPayload.entries)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load DVA transfers and reconciliation ledger.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const retriggerPaystackDva = async (reference?: string, overrideAccountNumber?: string) => {
    if (reference) {
      setRetriggeringRef(reference)
    } else {
      setRetriggeringAll(true)
    }
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/paystack-dva/retrigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference?.trim() || undefined,
          accountNumber: overrideAccountNumber?.trim() || undefined,
          forceNotify: true,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to re-trigger Paystack DVA transfer.")
      }
      if (reference) {
        setNotice(`Re-settled Paystack transfer ${reference} and dispatched push/in-app notification to customer.`)
        setManualReference("")
        setManualAccountNumber("")
      } else {
        setNotice(`Reconciled ${payload?.settledCount ?? 0} missed Paystack DVA transfer(s) and notified customer(s).`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-trigger Paystack DVA settlement.")
    } finally {
      setRetriggeringRef(null)
      setRetriggeringAll(false)
    }
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <TreasurySubnav
        title="DVA Inward Transfers & Reconciliation Ledger"
        subtitle="Compare Paystack-Titan Dedicated Virtual Account transfers against UfitGo's ledger and re-trigger missed inward settlements."
        loading={loading}
        onRefresh={() => void load()}
      />

      {notice && (
        <div className="rounded-lg border border-[#a9e6ca] bg-[#eaf9f0] p-3 text-sm font-medium text-[#13633c]">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#f1c4bd] bg-[#fff0ee] p-3 text-sm font-medium text-[#a83b31]">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
        <div className="flex flex-col gap-4 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="size-5 text-[#07845f]" />
              <h2 className="text-lg font-bold">Paystack-Titan DVA Inward Transfers &amp; SRE Re-Trigger</h2>
            </div>
            <p className="mt-1 text-xs text-[#63736b]">
              Live view of Dedicated Virtual Account (`dedicated_nuban`) transfers on Paystack compared against UfitGo&apos;s ledger. Re-trigger any missed transfer or re-send the customer&apos;s push notification in one click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={retriggeringAll}
              onClick={() => void retriggerPaystackDva()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07845f] px-3.5 text-xs font-bold text-white hover:bg-[#05684a] disabled:opacity-60"
            >
              {retriggeringAll ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Sync &amp; Settle All Missed Transfers
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#e2eae5] bg-[#f8fbf9] p-3.5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="dva-ref-input" className="block text-xs font-bold text-[#204236]">
              Paystack Reference
            </label>
            <input
              id="dva-ref-input"
              value={manualReference}
              onChange={(e) => setManualReference(e.target.value)}
              placeholder="e.g. 1793389959942hz27bmvve2tc6"
              className="mt-1 h-9 w-full rounded-lg border border-[#c9d8d0] bg-white px-3 font-mono text-xs outline-none focus:border-[#07845f]"
            />
          </div>
          <div className="sm:w-56">
            <label htmlFor="dva-nuban-input" className="block text-xs font-bold text-[#204236]">
              Target NUBAN (Optional override)
            </label>
            <input
              id="dva-nuban-input"
              value={manualAccountNumber}
              onChange={(e) => setManualAccountNumber(e.target.value)}
              placeholder="e.g. 1238571129"
              className="mt-1 h-9 w-full rounded-lg border border-[#c9d8d0] bg-white px-3 font-mono text-xs outline-none focus:border-[#07845f]"
            />
          </div>
          <button
            type="button"
            disabled={!manualReference.trim() || retriggeringRef === manualReference.trim()}
            onClick={() => void retriggerPaystackDva(manualReference, manualAccountNumber)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#07845f] bg-white px-4 text-xs font-bold text-[#07845f] hover:bg-[#ecf8f2] disabled:opacity-50"
          >
            {retriggeringRef === manualReference.trim() ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Verify &amp; Re-Trigger Reference
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">DVA Account</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">UfitGo Status</th>
                <th className="px-4 py-3">Paid At</th>
                <th className="px-4 py-3 text-right">SRE Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9efeb]">
              {paystackDvaTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#63736b]">
                    No Paystack Dedicated Virtual Account (`dedicated_nuban`) transfers found yet.
                  </td>
                </tr>
              ) : (
                paystackDvaTransfers.map((tx) => {
                  const isSettled = tx.reconciliationStatus === "SETTLED"
                  const isBusy = retriggeringRef === tx.reference
                  return (
                    <tr key={tx.reference}>
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#18241f]">
                        {tx.reference}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-[#087851]">
                          {tx.accountNumber || "-"}
                        </span>
                        <span className="ml-2 text-xs text-[#63736b]">{tx.bankName}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-semibold text-[#18241f]">{tx.customerName || "-"}</div>
                        <div className="text-[#63736b]">{tx.customerEmail || "-"}</div>
                      </td>
                      <td className="px-4 py-3.5 font-bold">
                        ₦{Number(tx.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${dvaStatusBadgeStyle(
                            tx.reconciliationStatus
                          )}`}
                        >
                          {dvaStatusLabel(tx.reconciliationStatus)}
                        </span>
                        {tx.settledDescription && (
                          <div className="mt-1 text-[11px] text-[#63736b]">{tx.settledDescription}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#63736b]">{formatDate(tx.paidAt)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void retriggerPaystackDva(tx.reference, tx.accountNumber)}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-50 ${
                            isSettled
                              ? "border-[#c9d8d0] bg-white text-[#204236] hover:bg-[#edf5f0]"
                              : "border-[#07845f] bg-[#07845f] text-white hover:bg-[#05684a]"
                          }`}
                        >
                          {isBusy && <Loader2 className="size-3 animate-spin" />}
                          {isSettled ? "Re-send Notification" : "Settle & Notify"}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-[#07845f]" />
          <div>
            <h2 className="text-lg font-bold">Reconciliation Ledger</h2>
            <p className="mt-1 text-sm text-[#63736b]">
              Pending entries are rechecked automatically after 10 minutes. References let support trace a customer report without opening raw provider payloads.
            </p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Movement</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reconciliation</th>
                <th className="px-4 py-3">Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9efeb]">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#63736b]">
                    No BaaS ledger entries have been recorded yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-4 text-[#63736b]">{formatDate(entry.createdAt)}</td>
                    <td className="max-w-[220px] px-4 py-4 font-mono text-xs text-[#087851]">
                      <div className="truncate">{entry.providerTransactionRef || entry.internalReference || "-"}</div>
                    </td>
                    <td className="px-4 py-4 capitalize">
                      {(entry.transactionType || "transaction").split("_").join(" ")}
                      <span className="ml-2 text-xs text-[#63736b]">{entry.direction}</span>
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {entry.currency || "NGN"} {Number(entry.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(entry.status)}`}>
                        {entry.status || "INITIATED"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#63736b]">
                      {entry.reconciliationStatus || "none"}
                      {entry.settledAt ? ` · settled ${formatDate(entry.settledAt)}` : ""}
                    </td>
                    <td className="max-w-[240px] px-4 py-4 text-xs text-[#a83b31]">
                      {entry.failureReason || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
