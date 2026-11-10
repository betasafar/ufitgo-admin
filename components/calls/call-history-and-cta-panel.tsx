"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Headphones,
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  Sparkles,
} from "lucide-react"

export type CustomerSentiment =
  | "HAPPY"
  | "NEUTRAL"
  | "UNHAPPY"
  | "FRUSTRATED_URGENT"

export interface CallActionItem {
  id: string
  title: string
  category:
    | "UNHAPPY_CUSTOMER_ESCALATION"
    | "FAILED_TRANSACTION_DISPUTE"
    | "PAYMENT_PROMISE"
    | "DOCUMENT_COLLECTION"
    | "VISA_PROCESSING"
    | "CALLBACK_REQUEST"
    | "TRAVEL_PREFERENCE"
    | "GENERAL_FOLLOWUP"
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  dueHint?: string | null
  status: "PENDING" | "DONE"
  completedAt?: string | null
  completedBy?: string | null
  callId?: string
  callCreatedAt?: string
  bookingId?: number | null
  callerName?: string
}

export interface ConciergeCallLogRecord {
  id: string
  userId: string
  bookingId?: number | null
  pilgrimName: string
  pilgrimPhone?: string | null
  callerName: string
  reason?: string | null
  direction: "ADMIN_TO_PILGRIM" | "PILGRIM_TO_ADMIN"
  status: "RINGING" | "ACCEPTED" | "ON_HOLD" | "DECLINED" | "ENDED" | "MISSED"
  customerSentiment?: CustomerSentiment
  sentimentReason?: string | null
  durationSeconds: number
  recordingUrl?: string | null
  transcript?: string | null
  aiSummary?: string | null
  callNotes?: string | null
  actionItems?: CallActionItem[]
  createdAt: string
  acceptedAt?: string | null
  endedAt?: string | null
}

function formatDuration(sec: number) {
  if (!sec || sec <= 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function priorityBadgeStyle(priority: CallActionItem["priority"]) {
  if (priority === "CRITICAL") {
    return "border-[#dc2626] bg-[#dc2626] text-white"
  }
  if (priority === "HIGH") {
    return "border-[#f4d0ca] bg-[#fff0ee] text-[#a43229]"
  }
  if (priority === "MEDIUM") {
    return "border-[#f3d9a4] bg-[#fff8e6] text-[#8a6500]"
  }
  return "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]"
}

function sentimentBadge(sentiment?: CustomerSentiment) {
  switch (sentiment) {
    case "FRUSTRATED_URGENT":
      return {
        label: "Frustrated / Urgent Escalation",
        className: "border-[#dc2626] bg-[#fef2f2] text-[#b91c1c]",
      }
    case "UNHAPPY":
      return {
        label: "Unhappy Customer",
        className: "border-[#f59e0b] bg-[#fffbeb] text-[#b45309]",
      }
    case "HAPPY":
      return {
        label: "Happy / Satisfied",
        className: "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]",
      }
    default:
      return null
  }
}

function categoryLabel(category: CallActionItem["category"]) {
  switch (category) {
    case "UNHAPPY_CUSTOMER_ESCALATION":
      return "Unhappy Customer Escalation"
    case "FAILED_TRANSACTION_DISPUTE":
      return "Failed Transaction / Wallet Issue"
    case "PAYMENT_PROMISE":
      return "Payment Promise"
    case "DOCUMENT_COLLECTION":
      return "Document Collection"
    case "VISA_PROCESSING":
      return "Visa & Fulfilment"
    case "CALLBACK_REQUEST":
      return "Callback Request"
    case "TRAVEL_PREFERENCE":
      return "Travel Preference"
    default:
      return "Follow-Up"
  }
}

interface CallHistoryAndCtaPanelProps {
  customerId: string
  bookingId?: string | number
  compact?: boolean
  refreshKey?: number
  activeCallId?: string
  isPreparingCallId?: string | null
}

export function CallHistoryAndCtaPanel({
  customerId,
  bookingId,
  compact = false,
  refreshKey = 0,
  activeCallId,
  isPreparingCallId,
}: CallHistoryAndCtaPanelProps) {
  const [logs, setLogs] = useState<ConciergeCallLogRecord[]>([])
  const [pendingCtas, setPendingCtas] = useState<CallActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<
    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  >("HIGH")
  const [newTaskCategory, setNewTaskCategory] = useState<
    CallActionItem["category"]
  >("GENERAL_FOLLOWUP")
  const [addingTask, setAddingTask] = useState(false)

  const loadHistory = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const qs = bookingId ? `?bookingId=${encodeURIComponent(String(bookingId))}` : ""
      const res = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/calls/history${qs}`,
        { cache: "no-store" },
      )
      const payload = await res.json().catch(() => null)
      const data = payload?.data ?? payload
      setLogs(Array.isArray(data?.logs) ? data.logs : [])
      setPendingCtas(
        Array.isArray(data?.pendingActionItems) ? data.pendingActionItems : [],
      )
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [customerId, bookingId])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory, refreshKey])

  // Real-time auto-poll while a recent call is still preparing its recording or transcript
  const hasPreparingLogs = useCallback(
    (items: ConciergeCallLogRecord[]) => {
      if (isPreparingCallId) return true
      const now = Date.now()
      return items.some((l) => {
        const ageMs = now - new Date(l.createdAt).getTime()
        return (
          ageMs < 90_000 &&
          (l.status === "RINGING" ||
            l.status === "ACCEPTED" ||
            l.status === "ON_HOLD" ||
            (l.status === "ENDED" &&
              l.durationSeconds > 0 &&
              !l.recordingUrl &&
              !l.transcript))
        )
      })
    },
    [isPreparingCallId],
  )

  useEffect(() => {
    if (!hasPreparingLogs(logs)) return
    const timer = window.setInterval(() => {
      void loadHistory()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [logs, hasPreparingLogs, loadHistory])

  const toggleActionItem = async (
    callId: string,
    actionId: string,
    currentStatus: "PENDING" | "DONE",
  ) => {
    const nextStatus = currentStatus === "DONE" ? "PENDING" : "DONE"
    setTogglingId(actionId)
    try {
      const res = await fetch(
        `/api/admin/customers/calls/${encodeURIComponent(callId)}/action-items/${encodeURIComponent(actionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      )
      if (res.ok) {
        await loadHistory()
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleAddActionItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetCallId = logs[0]?.id
    if (!targetCallId || !newTaskTitle.trim()) return
    setAddingTask(true)
    try {
      const res = await fetch(
        `/api/admin/customers/calls/${encodeURIComponent(targetCallId)}/action-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTaskTitle.trim(),
            priority: newTaskPriority,
            category: newTaskCategory,
          }),
        },
      )
      if (res.ok) {
        setNewTaskTitle("")
        await loadHistory()
      }
    } finally {
      setAddingTask(false)
    }
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[#dbe2de] bg-white p-6 text-sm text-[#68716d]">
        <Loader2 className="mr-2 size-4 animate-spin text-[#0d7d5f]" />
        Loading call recordings, transcripts & AI Call-to-Actions...
      </div>
    )
  }

  const latestUnhappyLog = logs.find(
    (l) =>
      l.customerSentiment === "UNHAPPY" ||
      l.customerSentiment === "FRUSTRATED_URGENT",
  )
  const hasFailedTxDispute = pendingCtas.some(
    (c) => c.category === "FAILED_TRANSACTION_DISPUTE",
  )

  return (
    <div className="space-y-4">
      {/* 0. Urgent Unhappy Customer / Failed Transaction Escalation Banner */}
      {(latestUnhappyLog || hasFailedTxDispute) && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border-2 border-[#dc2626] bg-[#fef2f2] p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#dc2626] text-white">
              <AlertCircle className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-brand text-sm font-bold text-[#991b1b]">
                  {hasFailedTxDispute
                    ? "Urgent: Failed Transaction / Uncredited Transfer Reported on Call"
                    : "Attention: Unhappy / Frustrated Pilgrim Detected on Recent Call"}
                </h4>
                <span className="rounded-full bg-[#dc2626] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Priority Care
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-[#7f1d1d]">
                {latestUnhappyLog?.sentimentReason ||
                  "Handle this pilgrim with extra empathy and resolve pending transaction or service escalations below first."}
              </p>
            </div>
          </div>
          {hasFailedTxDispute && (
            <Link
              href="/dashboard/treasury/reconciliation"
              className="shrink-0 rounded-lg bg-[#dc2626] px-3 py-2 text-xs font-bold text-white hover:bg-[#b91c1c]"
            >
              Open Treasury Reconciliation
            </Link>
          )}
        </div>
      )}

      {/* 1. AI Highlighted Call-to-Actions Queue */}
      <section className="rounded-2xl border border-[#cfeee0] bg-gradient-to-br from-[#f3fbf7] to-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#0d7d5f] text-white shadow-xs">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-brand text-base font-bold text-[#17201c]">
                  Call-to-Actions from Previous Calls
                </h3>
                <span className="rounded-full bg-[#0d7d5f] px-2 py-0.5 text-[11px] font-bold text-white">
                  {pendingCtas.length} Pending
                </span>
              </div>
              <p className="text-xs text-[#5d6b65]">
                AI-highlighted promises, missing documents & follow-ups from concierge calls so the next admin knows exactly what to act on.
              </p>
            </div>
          </div>
        </div>

        {pendingCtas.length === 0 ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#dbeee4] bg-white px-4 py-3 text-xs font-semibold text-[#0c6b50]">
            <CheckCircle2 className="size-4 shrink-0 text-[#0d7d5f]" />
            All call follow-up actions are caught up for this pilgrim.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {pendingCtas.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#dbe2de] bg-white p-3.5 shadow-2xs transition hover:border-[#0d7d5f]/50 sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    disabled={togglingId === item.id || !item.callId}
                    onClick={() =>
                      item.callId &&
                      void toggleActionItem(item.callId, item.id, item.status)
                    }
                    title="Mark action item as Done"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-[#0d7d5f] bg-white text-[#0d7d5f] transition hover:bg-[#eaf9f3] disabled:opacity-50"
                  >
                    {togglingId === item.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityBadgeStyle(item.priority)}`}
                      >
                        {item.priority}
                      </span>
                      <span className="rounded-md bg-[#f1f5f3] px-2 py-0.5 text-[10px] font-bold text-[#42504a]">
                        {categoryLabel(item.category)}
                      </span>
                      {item.dueHint && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a43229]">
                          <Clock className="size-3" /> {item.dueHint}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-bold text-[#17201c]">
                      {item.title}
                    </p>
                    {item.callCreatedAt && (
                      <p className="mt-0.5 text-[11px] text-[#78817d]">
                        From call on{" "}
                        {new Date(item.callCreatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {item.callId && (
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={togglingId === item.id}
                      onClick={() =>
                        item.callId &&
                        void toggleActionItem(item.callId, item.id, item.status)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d7d5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                    >
                      <CheckCircle2 className="size-3.5" /> Mark Done
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick manual CTA input if at least 1 call log exists */}
        {logs.length > 0 && (
          <form
            onSubmit={(e) => void handleAddActionItem(e)}
            className="mt-3 flex flex-wrap items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a custom follow-up action from call..."
              className="h-9 min-w-[220px] flex-1 rounded-lg border border-[#d3dad7] bg-white px-3 text-xs font-medium text-[#17201c] outline-none focus:border-[#0d7d5f]"
            />
            <select
              aria-label="Action item category"
              value={newTaskCategory}
              onChange={(e) =>
                setNewTaskCategory(
                  e.target.value as CallActionItem["category"],
                )
              }
              className="h-9 rounded-lg border border-[#d3dad7] bg-white px-2.5 text-xs font-bold text-[#35443e] outline-none focus:border-[#0d7d5f]"
            >
              <option value="FAILED_TRANSACTION_DISPUTE">
                Failed Transaction / Wallet Issue
              </option>
              <option value="UNHAPPY_CUSTOMER_ESCALATION">
                Unhappy Customer Escalation
              </option>
              <option value="PAYMENT_PROMISE">Payment Promise</option>
              <option value="DOCUMENT_COLLECTION">Document Collection</option>
              <option value="VISA_PROCESSING">Visa &amp; Fulfilment</option>
              <option value="CALLBACK_REQUEST">Callback Request</option>
              <option value="GENERAL_FOLLOWUP">General Follow-Up</option>
            </select>
            <select
              aria-label="Action item priority"
              value={newTaskPriority}
              onChange={(e) =>
                setNewTaskPriority(
                  e.target.value as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
                )
              }
              className="h-9 rounded-lg border border-[#d3dad7] bg-white px-2.5 text-xs font-bold text-[#35443e] outline-none focus:border-[#0d7d5f]"
            >
              <option value="CRITICAL">Critical (Urgent)</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#0d7d5f] bg-white px-3 text-xs font-bold text-[#0d7d5f] hover:bg-[#eaf9f3] disabled:opacity-50"
            >
              {addingTask ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add Action
            </button>
          </form>
        )}
      </section>

      {/* 2. Call Recordings & Conversation Transcripts History List */}
      <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Headphones className="size-4 text-[#0d7d5f]" />
            <h3 className="font-brand text-base font-bold text-[#17201c]">
              Call Recordings &amp; Conversation History ({logs.length})
            </h3>
          </div>
          {!activeCallId && (
            <Link
              href={`/dashboard/calls/${encodeURIComponent(logs[0]?.id || customerId)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0d7d5f] bg-[#f3fbf7] px-3 py-1.5 text-xs font-bold text-[#0d7d5f] transition hover:bg-[#eaf9f3]"
            >
              <Headphones className="size-3.5" />
              Open Call Desk Workspace
            </Link>
          )}
        </div>

        {logs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#d3dad7] bg-[#f8faf9] p-6 text-center text-xs text-[#68716d]">
            No in-app concierge voice calls have been recorded for this pilgrim yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.map((log, index) => {
              const isExpanded =
                expandedCallId === null
                  ? index === 0
                  : expandedCallId === log.id
              const isPreparingThisCall =
                Boolean(isPreparingCallId && isPreparingCallId === log.id) ||
                (index === 0 && Boolean(isPreparingCallId)) ||
                (Date.now() - new Date(log.createdAt).getTime() < 90_000 &&
                  log.status === "ENDED" &&
                  log.durationSeconds > 0 &&
                  !log.recordingUrl &&
                  !log.transcript)
              const allItems = Array.isArray(log.actionItems)
                ? log.actionItems
                : []

              const startDate = new Date(
                log.acceptedAt || log.createdAt,
              )
              const computedEndDate = log.endedAt
                ? new Date(log.endedAt)
                : log.durationSeconds > 0
                  ? new Date(startDate.getTime() + log.durationSeconds * 1000)
                  : null
              const dateStr = startDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              const startTimeStr = startDate.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
              const endTimeStr = computedEndDate
                ? computedEndDate.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : null

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-[#dbeee4] bg-[#f9fbfa] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${
                          log.direction === "PILGRIM_TO_ADMIN"
                            ? "bg-[#e7f3ff] text-[#0f74c1]"
                            : "bg-[#eaf9f3] text-[#0d7d5f]"
                        }`}
                      >
                        {log.direction === "PILGRIM_TO_ADMIN" ? (
                          <PhoneIncoming className="size-4" />
                        ) : (
                          <PhoneOutgoing className="size-4" />
                        )}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#0d7d5f]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#0d7d5f]">
                            Call #{logs.length - index}
                          </span>
                          <p className="text-sm font-bold text-[#17201c]">
                            {log.reason || "Concierge Support Call"}
                          </p>
                          <span className="rounded-full bg-[#e6ece9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#35443e]">
                            {log.status}
                          </span>
                          {sentimentBadge(log.customerSentiment) && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sentimentBadge(log.customerSentiment)?.className}`}
                            >
                              {sentimentBadge(log.customerSentiment)?.label}
                            </span>
                          )}
                          {log.durationSeconds > 0 && (
                            <span className="text-xs font-semibold text-[#0d7d5f]">
                              · Duration: {formatDuration(log.durationSeconds)}
                            </span>
                          )}
                          {isPreparingThisCall && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#f59e0b]/40 bg-[#fffbeb] px-2.5 py-0.5 text-[10px] font-bold text-[#b45309]">
                              <Loader2 className="size-3 animate-spin" />
                              Preparing recording &amp; transcript…
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#68716d]">
                          <span>{dateStr}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                            Started: {startTimeStr}
                          </span>
                          {endTimeStr ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-2 py-0.5 text-[11px] font-bold text-[#dc2626]">
                              Ended: {endTimeStr}
                            </span>
                          ) : null}
                          <span>·</span>
                          <span>
                            {log.direction === "PILGRIM_TO_ADMIN"
                              ? "Inbound from Pilgrim"
                              : `Called by ${log.callerName}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCallId(isExpanded ? "COLLAPSED" : log.id)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d3dad7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0d7d5f] hover:bg-[#eaf9f3]"
                    >
                      <FileText className="size-3.5" />
                      {isExpanded
                        ? "Collapse Details"
                        : "Show Transcript & Notes"}
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Always-Visible Call Audio Recording Player Section */}
                  {log.recordingUrl ? (
                    <div className="mt-3 rounded-lg border border-[#cfeee0] bg-white p-3 shadow-2xs">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#0d7d5f]">
                        <span className="flex items-center gap-1.5">
                          <Headphones className="size-4" /> Call Audio Recording (
                          {formatDuration(log.durationSeconds)})
                        </span>
                        <a
                          href={log.recordingUrl}
                          download={`ufitgo-call-${log.id.slice(0, 8)}.webm`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-[#eaf9f3] px-2.5 py-1 text-[11px] font-bold text-[#0d7d5f] hover:bg-[#d5f3e6]"
                        >
                          Download Audio
                        </a>
                      </div>
                      <audio
                        controls
                        preload="metadata"
                        src={log.recordingUrl}
                        className="h-10 w-full"
                      />
                    </div>
                  ) : isPreparingThisCall ? (
                    <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-xs font-semibold text-[#92400e]">
                      <Loader2 className="size-4 shrink-0 animate-spin text-[#d97706]" />
                      <span>
                        Uploading call audio &amp; generating AI conversation
                        transcript… This player will appear automatically in a
                        few seconds.
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#e3e9e6] bg-white px-3 py-2 text-xs text-[#68716d]">
                      <span className="flex items-center gap-1.5">
                        <Headphones className="size-3.5 text-[#8d9692]" />
                        No audio file was stored for this earlier session. New calls automatically save playable audio here.
                      </span>
                    </div>
                  )}

                  {/* AI Executive Summary */}
                  {log.aiSummary && (
                    <div className="mt-3 rounded-lg border border-[#dbeee4] bg-[#f2faf6] px-3 py-2 text-xs text-[#253630]">
                      <span className="font-bold text-[#0d7d5f]">
                        AI Call Summary:{" "}
                      </span>
                      {log.aiSummary}
                    </div>
                  )}

                  {/* Unified Transcript, Notes & Action Items */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t border-[#e3e9e6] pt-3">
                      {log.transcript ? (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#68716d]">
                            Conversation Transcript
                          </p>
                          <pre className="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#dbe2de] bg-white p-3 font-sans text-xs leading-5 text-[#17201c]">
                            {log.transcript}
                          </pre>
                        </div>
                      ) : isPreparingThisCall ? (
                        <div className="flex items-center gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] p-3 text-xs font-semibold text-[#92400e]">
                          <Loader2 className="size-4 shrink-0 animate-spin text-[#d97706]" />
                          Preparing speech transcript &amp; AI summary from call
                          audio… It will appear here automatically once ready.
                        </div>
                      ) : (
                        <p className="flex items-center gap-1.5 text-xs italic text-[#78817d]">
                          <AlertCircle className="size-3.5" /> No speech
                          transcript was captured yet. Speak during a call or
                          save concierge notes to populate this section.
                        </p>
                      )}

                      {log.callNotes && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#68716d]">
                            Concierge Notes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border border-[#dbe2de] bg-white p-3 text-xs text-[#35443e]">
                            {log.callNotes}
                          </p>
                        </div>
                      )}

                      {allItems.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#68716d]">
                            Action Items from Call History ({allItems.length})
                          </p>
                          <div className="mt-1.5 space-y-1.5">
                            {allItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-[#dbe2de] bg-white px-3 py-2 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={item.title}
                                    checked={item.status === "DONE"}
                                    disabled={togglingId === item.id}
                                    onChange={() =>
                                      void toggleActionItem(
                                        log.id,
                                        item.id,
                                        item.status,
                                      )
                                    }
                                    className="size-4 accent-[#0d7d5f]"
                                  />
                                  <span
                                    className={
                                      item.status === "DONE"
                                        ? "line-through text-[#8d9692]"
                                        : "font-semibold text-[#17201c]"
                                    }
                                  >
                                    {item.title}
                                  </span>
                                </div>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    item.status === "DONE"
                                      ? "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]"
                                      : priorityBadgeStyle(item.priority)
                                  }`}
                                >
                                  {item.status === "DONE"
                                    ? "DONE"
                                    : item.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
