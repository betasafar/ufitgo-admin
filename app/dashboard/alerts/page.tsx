"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, BellRing, CheckCircle2, Hand, Loader2, Mail, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useCan } from "@/components/auth/permission-gate"

type Category = "money" | "systems" | "compliance"

type OpsAlert = {
  id: string
  key: string
  severity: "critical" | "high"
  category: Category
  title: string
  message: string
  link: string | null
  source: string
  status: "open" | "acknowledged" | "resolved"
  count: number
  firstSeenAt: string
  lastSeenAt: string
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  resolutionNote: string | null
}

type Recipient = { email: string; categories: Category[] }

const CATEGORIES: Array<{ value: Category; label: string; hint: string }> = [
  { value: "money", label: "Money & payments", hint: "Withdrawals, card charges, refunds, transfers" },
  { value: "systems", label: "Systems", hint: "Failing jobs, providers, many failures at once" },
  { value: "compliance", label: "Compliance", hint: "Reserved for compliance issues" },
]

function when(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "-"
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/ops-alerts${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Request failed.")
  return payload as T
}

export default function EmergencyAlertsPage() {
  const can = useCan()
  const canAct = can(["reconciliation.manage"], "all")
  const canManageRecipients = can(["settings.manage"], "all")
  const [view, setView] = useState<"active" | "resolved">("active")
  const [alerts, setAlerts] = useState<OpsAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [resolving, setResolving] = useState<OpsAlert | null>(null)
  const [note, setNote] = useState("")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [savingRecipients, setSavingRecipients] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setAlerts(await api<OpsAlert[]>(`?view=${view}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alerts.")
    } finally {
      setLoading(false)
    }
  }, [view])

  const loadRecipients = useCallback(async () => {
    if (!canManageRecipients) return
    try {
      const rows = await api<Recipient[]>("/recipients")
      setRecipients(rows.map((r) => ({ email: r.email, categories: r.categories })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alert recipients.")
    }
  }, [canManageRecipients])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 30000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    void loadRecipients()
  }, [loadRecipients])

  const acknowledge = async (alert: OpsAlert) => {
    setBusyId(alert.id)
    setError("")
    setNotice("")
    try {
      await api(`/${alert.id}/acknowledge`, { method: "POST" })
      setNotice("You've taken this alert. Reminders have stopped.")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not take this alert.")
    } finally {
      setBusyId(null)
    }
  }

  const submitResolve = async () => {
    if (!resolving) return
    setBusyId(resolving.id)
    setError("")
    setNotice("")
    try {
      await api(`/${resolving.id}/resolve`, { method: "POST", body: JSON.stringify({ note: note.trim() }) })
      setNotice("Alert resolved. Everyone who was emailed has been told.")
      setResolving(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve this alert.")
    } finally {
      setBusyId(null)
    }
  }

  const saveRecipients = async () => {
    setSavingRecipients(true)
    setError("")
    setNotice("")
    try {
      const saved = await api<Recipient[]>("/recipients", {
        method: "PUT",
        body: JSON.stringify({ recipients: recipients.filter((r) => r.email.trim()) }),
      })
      setRecipients(saved.map((r) => ({ email: r.email, categories: r.categories })))
      setNotice("Alert recipients saved. Anyone newly added has been sent a test email.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recipients.")
    } finally {
      setSavingRecipients(false)
    }
  }

  const sendTest = async () => {
    setError("")
    setNotice("")
    try {
      const result = await api<{ sentTo: number }>("/recipients/test", { method: "POST" })
      setNotice(`Test alert sent to ${result.sentTo} recipient${result.sentTo === 1 ? "" : "s"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the test alert.")
    }
  }

  const toggleCategory = (index: number, category: Category) => {
    setRecipients((rows) =>
      rows.map((row, i) =>
        i !== index
          ? row
          : {
              ...row,
              categories: row.categories.includes(category)
                ? row.categories.filter((c) => c !== category)
                : [...row.categories, category],
            },
      ),
    )
  }

  const openCount = alerts.filter((a) => a.status === "open").length
  let heading = "Nothing waiting"

  if (view === "resolved") {
    heading = "Recently resolved"
  } else if (openCount > 0) {
    heading = `${openCount} need${openCount === 1 ? "" : "s"} someone`
  }

  const renderAlerts = () => {
    if (loading && alerts.length === 0) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-[#d7e2dc] bg-white p-6 text-sm text-[#63736b]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      )
    }
    if (alerts.length === 0) {
      return (
        <div className="rounded-xl border border-[#d7e2dc] bg-white p-6 text-sm text-[#63736b]">
          {view === "active" ? "Nothing needs attention right now." : "No resolved alerts yet."}
        </div>
      )
    }
    return alerts.map((alert) => (
      <article
        key={alert.id}
        className={`rounded-xl border bg-white p-5 shadow-sm ${
          alert.status === "open" && alert.severity === "critical" ? "border-[#e8a89f]" : "border-[#d7e2dc]"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
              <span className={`rounded-full px-2 py-0.5 ${alert.severity === "critical" ? "bg-[#fff0ee] text-[#a83b31]" : "bg-[#fff8de] text-[#806000]"}`}>
                {alert.severity}
              </span>
              <span className="rounded-full bg-[#edf5f0] px-2 py-0.5 text-[#204236]">
                {CATEGORIES.find((c) => c.value === alert.category)?.label}
              </span>
              {alert.status === "acknowledged" && (
                <span className="rounded-full bg-[#e8f0fb] px-2 py-0.5 text-[#2b4f86]">Taken by {alert.acknowledgedBy}</span>
              )}
              {alert.count > 1 && <span className="text-[#63736b]">Seen {alert.count} times</span>}
            </div>
            <h2 className="mt-2 text-base font-bold text-[#18241f]">{alert.title}</h2>
            <p className="mt-1 text-sm text-[#33463d]">{alert.message}</p>
            <p className="mt-2 text-xs text-[#63736b]">
              First seen {when(alert.firstSeenAt)} · Last seen {when(alert.lastSeenAt)} · Source: {alert.source}
            </p>
            {alert.status === "resolved" && (
              <p className="mt-1 text-xs text-[#13633c]">
                Resolved by {alert.resolvedBy} on {when(alert.resolvedAt)}
                {alert.resolutionNote ? `: ${alert.resolutionNote}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {alert.link && (
              <Link
                href={alert.link}
                className="inline-flex h-9 items-center rounded-lg border border-[#b9ccc2] bg-white px-3 text-xs font-bold text-[#204236] hover:bg-[#edf5f0]"
              >
                Open
              </Link>
            )}
            {canAct && alert.status === "open" && (
              <button
                type="button"
                onClick={() => void acknowledge(alert)}
                disabled={busyId === alert.id}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07845f] px-3 text-xs font-bold text-white hover:bg-[#066b4d] disabled:opacity-50"
              >
                <Hand className="size-3.5" /> Take it
              </button>
            )}
            {canAct && alert.status !== "resolved" && (
              <button
                type="button"
                onClick={() => {
                  setResolving(alert)
                  setNote("")
                }}
                disabled={busyId === alert.id}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#a9e6ca] bg-white px-3 text-xs font-bold text-[#13633c] hover:bg-[#eaf9f0] disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" /> Resolve
              </button>
            )}
          </div>
        </div>
      </article>
    ))
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[#d7e2dc] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#b44035]">
            <BellRing className="size-4" /> Emergency alerts
          </div>
          <h1 className="mt-1.5 text-2xl font-bold text-[#18241f] sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-[#5c6d64]">
            Problems that need staff attention now. Each issue is emailed once, then reminded until someone takes it (critical every 3 hours, high every 12 hours).
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-lg border border-[#c9d8d0] bg-white p-1">
            {(["active", "resolved"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === option ? "bg-[#07845f] text-white" : "text-[#204236]"}`}
              >
                {option === "active" ? "Active" : "Resolved"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-4 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

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

      <section className="space-y-3">{renderAlerts()}</section>

      {canManageRecipients && (
        <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#18241f]">
                <Mail className="size-5" /> Who gets alert emails
              </h2>
              <p className="mt-1 text-sm text-[#5c6d64]">
                Up to 10 people. Choose which types each person receives. Newly added people get a test email straight away, so typos are caught now.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void sendTest()}
              className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg border border-[#b9ccc2] bg-white px-3 text-xs font-bold text-[#204236] hover:bg-[#edf5f0]"
            >
              <BellRing className="size-3.5" /> Send test alert
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-lg border border-[#e3ebe6] p-3 lg:flex-row lg:items-center">
                <input
                  type="email"
                  value={recipient.email}
                  placeholder="name@ufitgo.ng"
                  aria-label="Recipient email"
                  onChange={(event) =>
                    setRecipients((rows) => rows.map((row, i) => (i === index ? { ...row, email: event.target.value } : row)))
                  }
                  className="h-10 flex-1 rounded-lg border border-[#d3dad7] px-3 text-sm outline-none focus:border-[#0d7d5f]"
                />
                <div className="flex flex-wrap gap-3">
                  {CATEGORIES.map((category) => (
                    <label key={category.value} className="flex items-center gap-1.5 text-xs font-semibold text-[#33463d]" title={category.hint}>
                      <input
                        type="checkbox"
                        checked={recipient.categories.includes(category.value)}
                        onChange={() => toggleCategory(index, category.value)}
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${recipient.email || "recipient"}`}
                  onClick={() => setRecipients((rows) => rows.filter((_, i) => i !== index))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f1c4bd] text-[#a83b31] hover:bg-[#fff0ee]"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {recipients.length === 0 && (
              <p className="rounded-lg border border-[#ecd68a] bg-[#fff8de] p-3 text-sm text-[#806000]">
                No one is set up yet. Until you add someone, alerts only go to the backup list set on the server (OPS_ALERT_FALLBACK_EMAILS).
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={recipients.length >= 10}
              onClick={() => setRecipients((rows) => [...rows, { email: "", categories: ["money", "systems"] }])}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#b9ccc2] bg-white px-4 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-50"
            >
              <Plus className="size-4" /> Add person
            </button>
            <button
              type="button"
              onClick={() => void saveRecipients()}
              disabled={savingRecipients}
              className="h-10 rounded-lg bg-[#07845f] px-4 text-sm font-bold text-white hover:bg-[#066b4d] disabled:opacity-50"
            >
              {savingRecipients ? "Saving…" : "Save recipients"}
            </button>
          </div>
        </section>
      )}

      {resolving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#18241f]">Resolve: {resolving.title}</h2>
            <p className="mt-2 text-sm text-[#33463d]">
              Only resolve once the problem is actually fixed. Everyone who was emailed will be told, with your note.
            </p>
            <label className="mt-4 block text-xs font-semibold text-[#63736b]">
              What was done?
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="e.g. Refunded ₦5,000 to the customer's card on 22 Nov"
                className="mt-1 block w-full rounded-lg border border-[#d3dad7] p-3 text-sm outline-none focus:border-[#0d7d5f]"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setResolving(null)} className="h-10 rounded-lg border border-[#c9d8d0] px-4 text-sm font-bold text-[#204236]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitResolve()}
                disabled={!note.trim() || busyId === resolving.id}
                className="h-10 rounded-lg bg-[#07845f] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {busyId === resolving.id ? "Saving…" : "Resolve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
