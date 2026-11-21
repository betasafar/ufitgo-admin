"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Eye, Loader2, Send, ShieldCheck, Undo2 } from "lucide-react"
import { TitleWithHelp, operatorReleaseHelp } from "./staff-help"

type ReleaseState = "not_released" | "active" | "revoked" | "expired"
type ReleaseView = {
  operatorId: number
  operatorName: string | null
  state: ReleaseState
  accessUntil: string | null
  release: {
    travelerIds: string[]
    releasedBy: string | null
    firstReleasedAt: string
    lastSentAt: string
    sendCount: number
    revokedAt: string | null
    revokedBy: string | null
  } | null
  travelers: { travelerId: string; fullName: string; isAccountHolder: boolean; missing: { label: string; status: string }[] }[]
  views: { travelerName: string; documentType: string | null; action?: "view" | "download"; viewedBy: string | null; viewedAt: string }[]
}

const statusWord: Record<string, string> = {
  missing: "not received",
  pending_review: "not yet verified",
  needs_new_copy: "new copy requested",
  expired: "expired",
  expires_too_soon: "expires too soon",
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"
const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"
const docLabel = (type?: string | null) => (type ? type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Document")

export function OperatorReleasePanel({ bookingId, onToast }: { bookingId: string; onToast: (type: "success" | "error", text: string) => void }) {
  const [data, setData] = useState<ReleaseView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState<"release" | "revoke" | null>(null)

  const errorFrom = async (response: Response, fallback: string) => {
    const body = await response.json().catch(() => null)
    const message = body?.message
    return new Error(Array.isArray(message) ? message.join(" ") : message || fallback)
  }

  const load = async () => {
    setLoadError(null)
    const response = await fetch(`/api/admin/bookings/${bookingId}/operator-release`, { cache: "no-store" })
    if (!response.ok) {
      setLoadError((await errorFrom(response, "Unable to load operator sharing")).message)
      return
    }
    const payload = await response.json().catch(() => null)
    const view: ReleaseView = payload?.data || payload
    setData(view)
    const released = view.release && view.state === "active" ? view.release.travelerIds : []
    setSelected(released.length ? released : view.travelers.map((t) => t.travelerId))
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId])

  const release = async () => {
    setBusy("release")
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/operator-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ travelerIds: selected }),
      })
      if (!response.ok) throw await errorFrom(response, "Unable to release documents")
      const payload = await response.json().catch(() => null)
      const notified = payload?.data?.notified !== false
      onToast(
        notified ? "success" : "error",
        notified
          ? data?.state === "active" ? "Update sent to the operator." : "Documents released. The operator has been notified."
          : "Released, but the operator notification failed. Let them know by phone.",
      )
      await load()
    } catch (requestError) {
      onToast("error", requestError instanceof Error ? requestError.message : "Unable to release documents")
    } finally {
      setBusy(null)
    }
  }

  const revoke = async () => {
    if (!window.confirm("Withdraw the operator's access to these documents? They will be told by email.")) return
    setBusy("revoke")
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/operator-release`, { method: "DELETE" })
      if (!response.ok) throw await errorFrom(response, "Unable to withdraw access")
      onToast("success", "Operator access withdrawn.")
      await load()
    } catch (requestError) {
      onToast("error", requestError instanceof Error ? requestError.message : "Unable to withdraw access")
    } finally {
      setBusy(null)
    }
  }

  if (loadError) {
    return (
      <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
        <TitleWithHelp guide={operatorReleaseHelp}>Share with operator</TitleWithHelp>
        <p className="mt-3 rounded-lg border border-[#f3dfb0] bg-[#fff8e6] px-3 py-2 text-sm text-[#8a5a00]">{loadError}</p>
      </section>
    )
  }
  if (!data) {
    return (
      <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
        <Loader2 className="size-5 animate-spin text-[#0d7d5f]" />
      </section>
    )
  }

  const active = data.state === "active"
  const chosen = data.travelers.filter((t) => selected.includes(t.travelerId))
  const incomplete = chosen.filter((t) => t.missing.length > 0)
  const addedSinceRelease = active && data.release ? data.travelers.filter((t) => !data.release!.travelerIds.includes(t.travelerId)) : []

  const statusBanner = {
    not_released: { tone: "border-[#dbe2de] bg-[#f8faf9] text-[#4b5551]", icon: ShieldCheck, text: "Not shared yet. The operator can't see any documents for this booking." },
    active: {
      tone: "border-[#bfe5d4] bg-[#eef8f3] text-[#0d6b51]",
      icon: CheckCircle2,
      text: `Shared on ${formatDate(data.release?.firstReleasedAt)}${data.release?.releasedBy ? ` by ${data.release.releasedBy}` : ""}${(data.release?.sendCount || 0) > 1 ? ` · last update ${formatDate(data.release?.lastSentAt)}` : ""}. Operator access until ${formatDate(data.accessUntil)}.`,
    },
    revoked: { tone: "border-[#f4d0ca] bg-[#fdf1ef] text-[#a43229]", icon: Undo2, text: `Access withdrawn on ${formatDate(data.release?.revokedAt)}${data.release?.revokedBy ? ` by ${data.release.revokedBy}` : ""}. Release again if needed.` },
    expired: { tone: "border-[#dbe2de] bg-[#f8faf9] text-[#4b5551]", icon: ShieldCheck, text: "Operator access has ended because the trip is over or the booking was cancelled." },
  }[data.state]
  const StatusIcon = statusBanner.icon

  return (
    <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
      <TitleWithHelp guide={operatorReleaseHelp}>Share with operator</TitleWithHelp>
      <p className="mt-1 text-sm text-[#68716d]">
        When you&apos;re satisfied with the documents collected, release them to {data.operatorName || "the operator"} so they can start the visa. They view them only in their logged-in portal. Nothing is attached to emails.
      </p>

      <div className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${statusBanner.tone}`}>
        <StatusIcon className="mt-0.5 size-4 shrink-0" />
        <span>{statusBanner.text}</span>
      </div>

      {data.state !== "expired" && (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-[#dbe2de]">
            {data.travelers.length === 0 && <p className="px-4 py-3 text-sm text-[#68716d]">No travellers yet. Add them on the Travelers tab first.</p>}
            {data.travelers.map((traveler) => (
              <label key={traveler.travelerId} className="flex items-start gap-3 border-b border-[#edf1ef] px-4 py-3 last:border-b-0">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(traveler.travelerId)}
                  onChange={() => setSelected((current) => current.includes(traveler.travelerId) ? current.filter((id) => id !== traveler.travelerId) : [...current, traveler.travelerId])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#17201c]">
                    {traveler.fullName}
                    {traveler.isAccountHolder && <span className="ml-2 text-xs font-semibold text-[#0d7d5f]">Main applicant</span>}
                    {addedSinceRelease.some((t) => t.travelerId === traveler.travelerId) && <span className="ml-2 text-xs font-semibold text-[#8a5a00]">Not shared yet</span>}
                  </p>
                  {traveler.missing.length === 0 ? (
                    <p className="text-xs font-semibold text-[#0d7d5f]">All documents verified</p>
                  ) : (
                    <p className="text-xs text-[#8a5a00]">{traveler.missing.map((item) => `${item.label}: ${statusWord[item.status] || item.status.replaceAll("_", " ")}`).join(" · ")}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {incomplete.length > 0 && selected.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f3dfb0] bg-[#fff8e6] px-3 py-2.5 text-xs text-[#8a5a00]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {incomplete.map((t) => t.fullName).join(", ")} {incomplete.length === 1 ? "has" : "have"} documents missing or not verified. You can still release now and press <strong>Send update</strong> once the rest are in.
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null || selected.length === 0}
              onClick={() => void release()}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
            >
              {busy === "release" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {active ? `Send update (${selected.length})` : `Release documents (${selected.length})`}
            </button>
            {active && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void revoke()}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#f4d0ca] px-4 text-sm font-bold text-[#a43229] hover:bg-[#fdf1ef] disabled:opacity-50"
              >
                {busy === "revoke" ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />} Withdraw access
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-[#7b8580]">The operator&apos;s document contacts are emailed. Change them on the operator&apos;s page under Operators.</p>
        </>
      )}

      <div className="mt-6 border-t border-[#edf1ef] pt-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#17201c]"><Eye className="size-4" /> Who viewed or downloaded what</h3>
        {data.views.length === 0 ? (
          <p className="mt-2 text-sm text-[#7b8580]">{data.release ? "The operator hasn't opened or downloaded any files yet." : "Views will appear here once documents are shared."}</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#edf1ef] text-sm">
            {data.views.map((view, index) => (
              <li key={index} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-[#17201c]">
                  {view.travelerName} · {docLabel(view.documentType)}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${view.action === "download" ? "bg-[#fff3e0] text-[#8a5a00]" : "bg-[#eef3f1] text-[#4b5551]"}`}>{view.action === "download" ? "Downloaded" : "Viewed"}</span>
                </span>
                <span className="text-xs text-[#7b8580]">{view.viewedBy || "Operator"} · {formatDateTime(view.viewedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
