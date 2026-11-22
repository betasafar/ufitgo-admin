"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Undo2 } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"
import { useCan } from "@/components/auth/permission-gate"

type StuckWithdrawal = {
  reference: string
  userId: string
  customerName: string | null
  customerEmail: string | null
  amount: number
  totalDeducted: number
  bankCode: string | null
  accountNumber: string | null
  accountName: string | null
  provider: string | null
  createdAt: string
  ageMinutes: number
  autoRetryStopped: boolean
}

type Resolution = { row: StuckWithdrawal; outcome: "SUCCESSFUL" | "FAILED" }

const naira = (value: number) =>
  `₦${Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h ${minutes % 60} min`
  return `${Math.floor(hours / 24)} days`
}

export default function StuckWithdrawalsPage() {
  const can = useCan()
  const canAct = can(["reconciliation.manage"], "all")
  const [rows, setRows] = useState<StuckWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [busyRef, setBusyRef] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [note, setNote] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/wallet/stuck-bank-withdrawals", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load withdrawals.")
      setRows(Array.isArray(payload) ? payload : payload?.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load withdrawals.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const retry = async (row: StuckWithdrawal) => {
    setBusyRef(row.reference)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/wallet/stuck-bank-withdrawals/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: row.reference }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Check failed.")
      if (payload?.status === "success") {
        setNotice(`${naira(row.amount)} to ${row.accountName || "the customer"} is now confirmed as paid.`)
      } else if (payload?.status === "failed") {
        setNotice(`The bank rejected the transfer. ${naira(row.totalDeducted)} has gone back to the customer's UfitFlex.`)
      } else {
        setNotice("Checked again. The provider still has no final answer. Try later, or confirm with the provider and resolve it here.")
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed.")
    } finally {
      setBusyRef(null)
    }
  }

  const openResolution = (row: StuckWithdrawal, outcome: Resolution["outcome"]) => {
    setResolution({ row, outcome })
    setNote("")
    setConfirmed(false)
  }

  const submitResolution = async () => {
    if (!resolution) return
    setBusyRef(resolution.row.reference)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/wallet/stuck-bank-withdrawals/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: resolution.row.reference, outcome: resolution.outcome, note: note.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.details?.message || payload?.message || "Could not save.")
      setNotice(
        resolution.outcome === "SUCCESSFUL"
          ? "Marked as paid. The customer's balance is unchanged."
          : `Refunded. ${naira(resolution.row.totalDeducted)} is back in the customer's UfitFlex and they have been notified.`,
      )
      setResolution(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.")
    } finally {
      setBusyRef(null)
    }
  }

  const renderRows = () => {
    if (loading && rows.length === 0) {
      return (
        <div className="flex items-center gap-2 p-6 text-sm text-[#63736b]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )
    }
    if (rows.length === 0) {
      return <div className="p-6 text-sm text-[#63736b]">No stuck withdrawals. Every bank withdrawal has a final outcome.</div>
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[#e3ebe6] text-xs uppercase tracking-wide text-[#63736b]">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">To bank account</th>
              <th className="px-4 py-3">Waiting</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.reference} className="border-b border-[#eef3f0] align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#18241f]">{row.customerName || "Unknown"}</div>
                  <div className="text-xs text-[#63736b]">{row.customerEmail || row.userId}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{naira(row.amount)}</div>
                  {row.totalDeducted !== row.amount && (
                    <div className="text-xs text-[#63736b]">{naira(row.totalDeducted)} incl. fee</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>{row.accountName || "-"}</div>
                  <div className="text-xs text-[#63736b]">
                    {row.accountNumber || "-"} · bank {row.bankCode || "-"} · via {row.provider || "-"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{formatAge(row.ageMinutes)}</div>
                  {row.autoRetryStopped && (
                    <span className="mt-1 inline-block rounded-full border border-[#ecd68a] bg-[#fff8de] px-2 py-0.5 text-[11px] font-bold text-[#806000]">
                      Needs staff
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#33463d]">{row.reference}</td>
                <td className="px-4 py-3">
                  {canAct ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void retry(row)}
                        disabled={busyRef === row.reference}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b9ccc2] bg-white px-3 text-xs font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-50"
                      >
                        {busyRef === row.reference ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                        Check again
                      </button>
                      <button
                        type="button"
                        onClick={() => openResolution(row, "SUCCESSFUL")}
                        disabled={busyRef === row.reference}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07845f] px-3 text-xs font-bold text-white hover:bg-[#066b4d] disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3.5" /> Mark as paid
                      </button>
                      <button
                        type="button"
                        onClick={() => openResolution(row, "FAILED")}
                        disabled={busyRef === row.reference}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#f1c4bd] bg-white px-3 text-xs font-bold text-[#a83b31] hover:bg-[#fff0ee] disabled:opacity-50"
                      >
                        <Undo2 className="size-3.5" /> Refund
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-[#63736b]">View only</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const isPaid = resolution?.outcome === "SUCCESSFUL"

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <TreasurySubnav
        title="Stuck Withdrawals"
        subtitle="UfitFlex withdrawals to a customer's bank that still have no final outcome after 10 minutes."
        loading={loading}
        onRefresh={() => void load()}
      />

      <section className="rounded-xl border border-[#d7e2dc] bg-[#f6faf8] p-5 text-sm text-[#33463d]">
        <h2 className="font-bold text-[#18241f]">How this works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>The money has already left the customer&apos;s UfitFlex balance and is held until the withdrawal is settled.</li>
          <li>The system checks each one automatically every 5 minutes for the first 6 hours. After that it stops and waits for you.</li>
          <li><strong>Check again</strong> is always safe. It never sends the money twice.</li>
          <li>
            Only use <strong>Mark as paid</strong> or <strong>Refund</strong> after confirming with the provider (Providus, Paystack or FCMB)
            what really happened. A refund when the money actually left means the customer is paid twice.
          </li>
        </ul>
      </section>

      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-[#a9e6ca] bg-[#eaf9f0] p-3 text-sm text-[#13633c]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#f1c4bd] bg-[#fff0ee] p-3 text-sm text-[#a83b31]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </div>
      )}

      <section className="rounded-xl border border-[#d7e2dc] bg-white shadow-[0_10px_30px_rgba(20,55,40,0.06)]">{renderRows()}</section>

      {resolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#18241f]">
              {isPaid ? "Mark withdrawal as paid" : "Refund withdrawal to UfitFlex"}
            </h2>
            <p className="mt-2 text-sm text-[#33463d]">
              {naira(resolution.row.amount)} to {resolution.row.accountName || "the customer"} ({resolution.row.accountNumber || "-"}).
            </p>
            <div
              className={`mt-3 rounded-lg border p-3 text-sm ${
                isPaid ? "border-[#d7e2dc] bg-[#f6faf8] text-[#33463d]" : "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
              }`}
            >
              {isPaid
                ? "Choose this only if the provider confirms the money reached the customer's bank. The customer's balance does not change."
                : `Choose this only if the provider confirms the money never left. ${naira(resolution.row.totalDeducted)} goes back to the customer's UfitFlex and they are notified. If the money did leave, the customer is paid twice.`}
            </div>
            <label className="mt-4 block text-xs font-semibold text-[#63736b]">
              How did you confirm this? (saved on the transaction with your name)
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="e.g. Providus support confirmed on 22 Nov that the transfer failed"
                className="mt-1 block w-full rounded-lg border border-[#d3dad7] p-3 text-sm text-[#17201c] outline-none focus:border-[#0d7d5f]"
              />
            </label>
            <label className="mt-3 flex items-start gap-2 text-sm text-[#33463d]">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              I have confirmed this outcome with the provider.
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolution(null)}
                className="h-10 rounded-lg border border-[#c9d8d0] px-4 text-sm font-bold text-[#204236]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitResolution()}
                disabled={!confirmed || !note.trim() || busyRef === resolution.row.reference}
                className={`h-10 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50 ${isPaid ? "bg-[#07845f]" : "bg-[#b44035]"}`}
              >
                {busyRef === resolution.row.reference ? "Saving…" : isPaid ? "Mark as paid" : "Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
