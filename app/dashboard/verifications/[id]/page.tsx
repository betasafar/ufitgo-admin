"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react"

type UpgradeRequest = {
  id: string
  currentTier?: number
  requestedTier: number
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  submittedDocuments?: { livenessImageUrl?: string; utilityBillUrl?: string }
  user?: { id?: string; firstName?: string; lastName?: string; email?: string }
}

const COMPLIANCE_CACHE_TIME = 60_000
const COMPLIANCE_GC_TIME = 10 * 60_000

function statusTone(status: string) {
  if (status === "APPROVED") return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  if (status === "REJECTED") return "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]"
  return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
}

function StatusBadge({ status }: { status: string }) {
  const Icon = status === "APPROVED" ? CheckCircle2 : status === "REJECTED" ? XCircle : Clock
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${statusTone(status)}`}>
      <Icon className="size-3.5" /> {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-[#f7faf9] text-[#66716c]"><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">{label}</p>
        <p className="truncate text-sm font-semibold text-[#17201c]">{value || "—"}</p>
      </div>
    </div>
  )
}

export default function VerificationDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const id = String(params?.id ?? "")

  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  const { data: request, isLoading, error } = useQuery<UpgradeRequest>({
    queryKey: ["kyc-upgrade", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/kyc/upgrades/${id}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to load verification request")
      return payload?.data
    },
    enabled: Boolean(id),
    staleTime: COMPLIANCE_CACHE_TIME,
    gcTime: COMPLIANCE_GC_TIME,
  })

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/admin/kyc/upgrades/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Unable to approve request")
        return response.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kyc-upgrade", id] })
      void queryClient.invalidateQueries({ queryKey: ["kyc-upgrades"] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      fetch(`/api/admin/kyc/upgrades/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then(async (response) => {
        if (!response.ok) throw new Error("Unable to reject request")
        return response.json()
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["kyc-upgrade", id] })
      void queryClient.invalidateQueries({ queryKey: ["kyc-upgrades"] })
      setShowRejectForm(false)
      setRejectionReason("")
    },
  })

  if (isLoading) {
    return (
      <main className="grid min-h-[60vh] place-items-center p-8">
        <Loader2 className="size-8 animate-spin text-[#0d7d5f]" />
      </main>
    )
  }

  if (error || !request) {
    return (
      <main className="p-8">
        <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{error instanceof Error ? error.message : "Verification request not found."}</div>
        <Link href="/dashboard/verifications" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#a43229]">
          <ArrowLeft className="size-4" /> Back to verifications
        </Link>
      </main>
    )
  }

  const documents = request.submittedDocuments || {}
  const hasDocuments = Boolean(documents.livenessImageUrl || documents.utilityBillUrl)

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/verifications" className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Verification request</p>
            <h1 className="mt-2 font-brand flex flex-wrap items-center gap-3 text-3xl font-bold text-[#17201c]">
              {[request.user?.firstName, request.user?.lastName].filter(Boolean).join(" ") || "Unknown user"}
              <StatusBadge status={request.status} />
            </h1>
            <p className="mt-2 text-sm text-[#68716d]">Request #{id.slice(-6)} · Tier {request.currentTier || 1} → Tier {request.requestedTier}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">Personal profile information</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <DetailRow icon={User} label="Full registered name" value={[request.user?.firstName, request.user?.lastName].filter(Boolean).join(" ")} />
              <DetailRow icon={Mail} label="Account email address" value={request.user?.email} />
              <DetailRow icon={ShieldCheck} label="Unique account ID" value={request.user?.id} />
              <DetailRow icon={Calendar} label="Request submitted at" value={new Date(request.createdAt).toLocaleString("en-NG")} />
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-[#cfeee0] bg-[#f7faf9] p-6">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#78817d]"><CreditCard className="size-4 text-[#0d7d5f]" /> Identity records for validation (Tier {request.requestedTier})</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {request.requestedTier === 2 && documents.livenessImageUrl && (
                <div className="rounded-2xl border border-[#dbe2de] bg-white p-5 text-center shadow-sm">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">Liveness selfie</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={documents.livenessImageUrl} alt="Liveness selfie" className="mx-auto max-h-64 rounded-xl border border-[#edf1ef]" />
                </div>
              )}
              {request.requestedTier === 3 && documents.utilityBillUrl && (
                <div className="rounded-2xl border border-[#dbe2de] bg-white p-5 text-center shadow-sm">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">Utility bill</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={documents.utilityBillUrl} alt="Utility bill" className="mx-auto max-h-64 rounded-xl border border-[#edf1ef]" />
                </div>
              )}
              {!hasDocuments && (
                <p className="py-8 text-center text-sm italic text-[#9aa39e] sm:col-span-2">No documents attached to this upgrade request.</p>
              )}
            </div>
          </section>

          {request.status === "REJECTED" && request.rejectionReason && (
            <section className="rounded-2xl border border-[#f4d0ca] bg-[#fff0ee] p-6">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#a43229]"><AlertCircle className="size-4" /> Official rejection reason</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#9c4a41]">{request.rejectionReason}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#78817d]">Admin action center</h2>

            {request.status === "PENDING" ? (
              showRejectForm ? (
                <div className="mt-5 space-y-3">
                  <p className="text-xs text-[#68716d]">Specify the reason for rejecting this request. This note is kept for internal audit records.</p>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="e.g. Identity record 'NIN' could not be validated against Govt database…"
                    className="h-28 w-full resize-none rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm outline-none focus:border-[#a43229]"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowRejectForm(false)} className="flex-1 rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#36413d] hover:bg-[#f7f9f8]">Dismiss</button>
                    <button
                      type="button"
                      disabled={!rejectionReason.trim() || rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(rejectionReason.trim())}
                      className="flex-[2] inline-flex items-center justify-center gap-2 rounded-lg bg-[#a43229] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8c281f] disabled:opacity-50"
                    >
                      {rejectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm rejection"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="flex gap-2 rounded-lg border border-[#f1e0a9] bg-[#fff6dc] p-3 text-xs text-[#8a6500]">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>Verification is manual. Confirm the credentials against the relevant national database before proceeding.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-3 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                  >
                    {approveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><CheckCircle2 className="size-4" /> Approve verification</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#f4d0ca] bg-white px-4 py-3 text-sm font-bold text-[#a43229] hover:bg-[#fff0ee]"
                  >
                    <XCircle className="size-4" /> Deny submission
                  </button>
                </div>
              )
            ) : (
              <div className="mt-5 text-center">
                <div className={`mx-auto grid size-16 place-items-center rounded-full border-4 ${request.status === "APPROVED" ? "border-[#cfeee0] bg-[#eaf9f3]" : "border-[#f4d0ca] bg-[#fff0ee]"}`}>
                  {request.status === "APPROVED" ? <CheckCircle2 className="size-7 text-[#0c6b50]" /> : <XCircle className="size-7 text-[#a43229]" />}
                </div>
                <p className="mt-3 text-lg font-bold text-[#17201c]">Request {request.status.toLowerCase()}</p>
                {(request.approvedAt || request.rejectedAt) && (
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.06em] text-[#9aa39e]">
                    {new Date((request.approvedAt || request.rejectedAt)!).toLocaleDateString("en-NG")} at {new Date((request.approvedAt || request.rejectedAt)!).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
