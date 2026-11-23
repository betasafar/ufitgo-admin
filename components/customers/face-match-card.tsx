"use client"

import { useEffect, useState } from "react"
import { Eye, Loader2, ScanFace, ShieldCheck, ShieldAlert } from "lucide-react"

export type FaceCheckRecord = {
  purpose: string
  status: "issued" | "used" | "failed" | string
  similarity?: number | null
  reason?: string | null
  at: string
}

export type FaceConsentRecord = {
  accepted: boolean
  acceptedVersion?: string | null
  currentVersion?: string | null
  acceptedAt?: string | null
  withdrawnAt?: string | null
}

export type FaceMatchData = {
  consent?: FaceConsentRecord | null
  done?: boolean
  matchedAt?: string | null
  hasReferenceSelfie?: boolean
  provider?: string | null
  confidence?: number | null
  recentChecks?: FaceCheckRecord[]
}

const purposeLabels: Record<string, string> = {
  pin_change: "PIN change",
  secret_question_change: "Secret question change",
  card_unfreeze: "Unfreeze card",
  atm_cash_enable: "Enable ATM cash",
  card_link: "Link card",
  card_details_reveal: "Reveal card details",
  kyc_face_match: "Account face match",
}

const reasonLabels: Record<string, string> = {
  "no-match": "Face did not match",
  "live-faces": "No face, or more than one face",
  "live:frames-differ": "Action photos were not the same person",
  "live:steps-order": "Actions out of order",
  "live:step-strength": "Action not clear enough",
  "live:step-timing": "Actions too fast",
  "live:challenge-invalid": "Check expired or already used",
  "live:no-challenge": "No live check started",
  "live:simulator": "Simulator capture refused",
}

function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}

/**
 * Shows whether a customer finished the BVN/NIN face match, the recent face checks on their account,
 * and lets staff with KYC permission open the saved selfie. The selfie is fetched only on click, as a
 * link that expires in two minutes, and every view is recorded in Audit Logs.
 */
export function FaceMatchCard({ customerId, faceMatch }: { readonly customerId: string | number; readonly faceMatch?: FaceMatchData | null }) {
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!selfieUrl) return
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setSelfieUrl(null)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [selfieUrl])

  async function openSelfie() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/customers/${customerId}/face-match/selfie`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        let errorMessage = "Could not open the selfie. Please try again."
        if (response.status === 403) {
          errorMessage = "You do not have permission to view face-match selfies."
        } else if (response.status === 404) {
          errorMessage = "No selfie is saved for this customer."
        }
        setError(errorMessage)
        return
      }
      setSelfieUrl(payload.url)
      setSecondsLeft(Number(payload.expiresInSeconds) || 120)
    } catch {
      setError("Could not open the selfie. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const done = Boolean(faceMatch?.done)
  const checks = faceMatch?.recentChecks ?? []

  return (
    <div className="space-y-3 rounded-xl border border-[#edf1ef] bg-[#f9fbfa] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">
          <ScanFace className="size-4 text-[#07845f]" /> BVN face match
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            done ? "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]" : "border-[#fde7b0] bg-[#fff8e6] text-[#92600a]"
          }`}
        >
          {done ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
          {done ? "Face matched" : "Not done"}
        </span>
      </div>

      {done && (
        <div className="grid grid-cols-1 gap-2 text-sm text-[#32443d] sm:grid-cols-3">
          <div>
            <span className="font-semibold text-[#17201c]">Matched on:</span> {formatDateTime(faceMatch?.matchedAt)}
          </div>
          <div>
            <span className="font-semibold text-[#17201c]">Checked by:</span> {faceMatch?.provider ? faceMatch.provider.toUpperCase() : "—"}
          </div>
          <div>
            <span className="font-semibold text-[#17201c]">Match score:</span>{" "}
            {typeof faceMatch?.confidence === "number" ? `${faceMatch.confidence}%` : "—"}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[#e4ebe7] bg-white p-2.5 text-xs text-[#32443d]">
        <span className="font-semibold text-[#17201c]">Consent to face verification: </span>
        {faceMatch?.consent?.accepted ? (
          <>
            Agreed on {formatDateTime(faceMatch.consent.acceptedAt)} (wording {faceMatch.consent.acceptedVersion})
          </>
        ) : faceMatch?.consent?.withdrawnAt ? (
          <>Withdrawn on {formatDateTime(faceMatch.consent.withdrawnAt)}. The saved selfie was deleted.</>
        ) : faceMatch?.consent?.acceptedVersion ? (
          <>Agreed to older wording ({faceMatch.consent.acceptedVersion}); they will be asked again.</>
        ) : (
          <>Not recorded. Customers who matched before consent was added will be asked the next time a face check is needed.</>
        )}
      </div>

      {!done && <p className="text-sm text-[#5d6762]">This customer has not completed the face match to their BVN or NIN photo yet.</p>}

      {done && !faceMatch?.hasReferenceSelfie && (
        <p className="rounded-lg border border-[#fde7b0] bg-[#fff8e6] p-2.5 text-xs text-[#92600a]">
          This match was done before selfies were saved, so there is no selfie to show. They will be asked to redo the face match the first time they change their PIN or secret question.
        </p>
      )}

      {faceMatch?.hasReferenceSelfie && (
        <div className="space-y-2">
          {selfieUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfieUrl} alt="Face-match selfie" className="max-h-72 rounded-xl border border-[#dbe2de]" />
              <p className="text-[11px] text-[#7b8580]">Link expires in {secondsLeft}s. This view has been recorded in Audit Logs.</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void openSelfie()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd5d0] bg-white px-3 py-1.5 text-xs font-bold text-[#32443d] hover:bg-[#edf3f0] disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
              View selfie
            </button>
          )}
          {!selfieUrl && !error && <p className="text-[11px] text-[#7b8580]">Opening the selfie is recorded in Audit Logs.</p>}
          {error && <p className="text-xs font-semibold text-[#b42318]">{error}</p>}
        </div>
      )}

      {checks.length > 0 && (
        <div className="overflow-x-auto">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Recent face checks</div>
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="text-[#78817d]">
                <th className="py-1 pr-3 font-bold">When</th>
                <th className="py-1 pr-3 font-bold">For</th>
                <th className="py-1 pr-3 font-bold">Result</th>
                <th className="py-1 pr-3 font-bold">Score</th>
                <th className="py-1 font-bold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => {
                const failed = check.status === "failed"
                return (
                  <tr key={`${check.at}-${index}`} className="border-t border-[#edf1ef] text-[#32443d]">
                    <td className="py-1.5 pr-3">{formatDateTime(check.at)}</td>
                    <td className="py-1.5 pr-3">{purposeLabels[check.purpose] || check.purpose}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${failed ? "bg-[#fdecea] text-[#b42318]" : "bg-[#eaf9f3] text-[#0c6b50]"}`}>
                        {failed ? "Failed" : "Passed"}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">{typeof check.similarity === "number" ? `${Math.round(check.similarity * 100)}%` : "—"}</td>
                    <td className="py-1.5">{check.reason ? reasonLabels[check.reason] || check.reason : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
