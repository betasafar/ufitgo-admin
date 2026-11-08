"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MessageSquarePlus,
  Reply,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react"

interface PilgrimReviewRecord {
  id: number
  pilgrimName: string
  packageId: number
  operatorId?: number
  packageTitle?: string | null
  rating: number
  review: string
  tags: string[]
  isVerifiedBooking: boolean
  operatorReply?: string | null
  status?: "APPROVED" | "HIDDEN" | "PENDING"
  visibleToOperator?: boolean
  createdAt: string
}

interface ReviewSummaryPayload {
  averageRating: number
  totalReviews: number
  verifiedCount: number
  recommendPercent: number
  topTags: Array<{ tag: string; count: number }>
  reviews: PilgrimReviewRecord[]
}

const PRESET_TAGS = [
  "🕋 Hotel close to Haram",
  "🛂 Fast Visa & Nusuk",
  "🤝 Honest & transparent",
  "🚌 Smooth transport",
  "📖 Great Mutawwif / Scholar",
  "🍽️ Good Nigerian meals",
]

interface OperatorReviewsAdminPanelProps {
  operatorId: string | number
  operatorName: string
  packages?: Array<{ id?: string | number; title?: string }>
}

export function OperatorReviewsAdminPanel({
  operatorId,
  operatorName,
  packages = [],
}: OperatorReviewsAdminPanelProps) {
  const [summary, setSummary] = useState<ReviewSummaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [replyingId, setReplyingId] = useState<number | null>(null)
  const [replyDraft, setReplyDraft] = useState("")

  // New concierge-logged testimonial state
  const [pilgrimName, setPilgrimName] = useState("")
  const [selectedPkgId, setSelectedPkgId] = useState("")
  const [rating, setRating] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "🕋 Hotel close to Haram",
    "🤝 Honest & transparent",
  ])
  const [reviewText, setReviewText] = useState("")
  const [operatorReplyText, setOperatorReplyText] = useState("")
  const [savingNew, setSavingNew] = useState(false)

  const loadReviews = useCallback(async () => {
    setLoading(true)
    try {
      const pkgIds = packages
        .map((p) => Number(p.id))
        .filter((n) => Number.isFinite(n) && n > 0)
        .join(",")
      const qs = pkgIds ? `?packageIds=${encodeURIComponent(pkgIds)}` : ""
      const res = await fetch(
        `/api/admin/customers/operators/${encodeURIComponent(String(operatorId))}/reviews${qs}`,
        { cache: "no-store" },
      )
      const payload = await res.json().catch(() => null)
      const data = payload?.data ?? payload
      if (data && typeof data === "object") {
        setSummary(data as ReviewSummaryPayload)
      }
    } finally {
      setLoading(false)
    }
  }, [operatorId, packages])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const handleCreateTestimonial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pilgrimName.trim()) return
    setSavingNew(true)
    try {
      const chosenPkg = packages.find(
        (p) => String(p.id) === String(selectedPkgId),
      )
      const res = await fetch(
        `/api/admin/customers/operators/${encodeURIComponent(String(operatorId))}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pilgrimName: pilgrimName.trim(),
            packageId: chosenPkg?.id ? Number(chosenPkg.id) : 0,
            packageTitle: chosenPkg?.title || undefined,
            rating,
            tags: selectedTags,
            review: reviewText.trim(),
            operatorReply: operatorReplyText.trim() || undefined,
            isVerifiedBooking: true,
          }),
        },
      )
      if (res.ok) {
        setPilgrimName("")
        setReviewText("")
        setOperatorReplyText("")
        await loadReviews()
      }
    } finally {
      setSavingNew(false)
    }
  }

  const handleModerate = async (
    reviewId: number,
    patch: {
      status?: "APPROVED" | "HIDDEN" | "PENDING"
      isVerifiedBooking?: boolean
      visibleToOperator?: boolean
      operatorReply?: string
    },
  ) => {
    setActingId(reviewId)
    try {
      const res = await fetch(
        `/api/admin/customers/reviews/${encodeURIComponent(String(reviewId))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      )
      if (res.ok) {
        setReplyingId(null)
        await loadReviews()
      }
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!window.confirm("Permanently delete this pilgrim review?")) return
    setActingId(reviewId)
    try {
      const res = await fetch(
        `/api/admin/customers/reviews/${encodeURIComponent(String(reviewId))}`,
        { method: "DELETE" },
      )
      if (res.ok) {
        await loadReviews()
      }
    } finally {
      setActingId(null)
    }
  }

  const reviews = summary?.reviews || []

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      {/* Left Column: Moderation Queue & Live Testimonials */}
      <section className="space-y-4 rounded-2xl border border-[#dbe2de] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf2ef] pb-4">
          <div>
            <h3 className="font-brand text-xl font-bold text-[#17201c]">
              Pilgrim Feedback &amp; Testimonials ({reviews.length})
            </h3>
            <p className="mt-1 text-xs text-[#68716d]">
              Review, verify, reply to, or hide Jiji-style pilgrim comments shown on{" "}
              <strong>{operatorName}</strong>&apos;s mobile profile and packages.
            </p>
          </div>
          {summary && summary.totalReviews > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-[#cfeee0] bg-[#f3fbf7] px-3.5 py-2">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-bold text-[#0c6b50]">
                  <Star className="size-4 fill-[#eab308] text-[#eab308]" />
                  {summary.averageRating.toFixed(1)} / 5.0
                </div>
                <p className="text-[11px] font-semibold text-[#5d6b65]">
                  {summary.recommendPercent}% Recommend
                </p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#68716d]">
            <Loader2 className="mr-2 size-4 animate-spin text-[#0d7d5f]" />
            Loading pilgrim feedback…
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cbd5d0] bg-[#f9fbfa] p-8 text-center text-sm text-[#68716d]">
            No pilgrim reviews recorded for {operatorName} yet. Use the form on the
            right to log a verified pilgrim testimonial from a concierge call or
            completed trip.
          </div>
        ) : (
          <div className="space-y-3.5">
            {reviews.map((item) => {
              const isHidden = item.status === "HIDDEN"
              const isPending = item.status === "PENDING"
              const isApproved = item.status === "APPROVED"
              const isReplying = replyingId === item.id
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    isPending
                      ? "border-[#f59e0b]/60 bg-[#fffdf7]"
                      : isHidden
                        ? "border-[#f4d0ca] bg-[#fff9f8] opacity-80"
                        : "border-[#dbe2de] bg-[#f9fbfa]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#17201c]">
                          {item.pilgrimName}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#b45309]">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="size-3.5 fill-[#eab308] text-[#eab308]"
                            />
                          ))}
                        </span>
                        {item.isVerifiedBooking && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                            <CheckCircle2 className="size-3" /> Verified Pilgrim
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isPending
                              ? "border border-[#fde68a] bg-[#fffbeb] text-[#b45309]"
                              : isHidden
                                ? "bg-[#fee2e2] text-[#b91c1c]"
                                : "bg-[#eaf9f3] text-[#0c6b50]"
                          }`}
                        >
                          {isPending
                            ? "PENDING ADMIN APPROVAL (PRIVATE TO USER)"
                            : isHidden
                              ? "HIDDEN FROM PUBLIC APP"
                              : "APPROVED · LIVE ON APP"}
                        </span>
                        {item.visibleToOperator && (
                          <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1d4ed8]">
                            SHARED WITH OPERATOR FOR ACTION
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#68716d]">
                        {new Date(item.createdAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {item.packageTitle ? ` · ${item.packageTitle}` : ""}
                      </p>
                    </div>

                    {/* Admin Moderation Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!isApproved && (
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() =>
                            void handleModerate(item.id, {
                              status: "APPROVED",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0d7d5f] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#0a694f]"
                        >
                          <Eye className="size-3.5" /> Approve for Public App
                        </button>
                      )}

                      {!isHidden && (
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() =>
                            void handleModerate(item.id, {
                              status: "HIDDEN",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#f4d0ca] bg-white px-2.5 py-1.5 text-xs font-bold text-[#a43229] hover:bg-[#fff0ee]"
                        >
                          <EyeOff className="size-3.5" /> Hide from App
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() =>
                          void handleModerate(item.id, {
                            visibleToOperator: !item.visibleToOperator,
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                          item.visibleToOperator
                            ? "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]"
                            : "border-[#d3dad7] bg-white text-[#35443e] hover:bg-[#edf3f0]"
                        }`}
                        title="Allow the operator to view this feedback (even when hidden from public app) so they can address the issue"
                      >
                        {item.visibleToOperator
                          ? "Visible to Operator ✓"
                          : "Share with Operator"}
                      </button>

                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() =>
                          void handleModerate(item.id, {
                            isVerifiedBooking: !item.isVerifiedBooking,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d3dad7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#35443e] hover:bg-[#edf3f0]"
                      >
                        <ShieldCheck className="size-3.5 text-[#0d7d5f]" />
                        {item.isVerifiedBooking ? "Unmark Verified" : "Mark Verified"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(isReplying ? null : item.id)
                          setReplyDraft(item.operatorReply || "")
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#d3dad7] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0d7d5f] hover:bg-[#eaf9f3]"
                      >
                        <Reply className="size-3.5" /> Reply
                      </button>

                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => void handleDelete(item.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-[#f4d0ca] bg-[#fff0ee] p-1.5 text-[#a43229] hover:bg-[#fde2de]"
                        title="Delete review"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#047857]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.review && (
                    <p className="mt-2.5 text-sm leading-relaxed text-[#253630]">
                      {item.review}
                    </p>
                  )}

                  {item.operatorReply && !isReplying && (
                    <div className="mt-2.5 rounded-lg border border-[#dbeee4] bg-white p-2.5 text-xs">
                      <span className="font-bold text-[#0d7d5f]">
                        Official Response:{" "}
                      </span>
                      <span className="text-[#35443e]">{item.operatorReply}</span>
                    </div>
                  )}

                  {isReplying && (
                    <div className="mt-3 space-y-2 border-t border-[#e3e9e6] pt-3">
                      <textarea
                        rows={2}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={`Write an official response on behalf of ${operatorName} or UfitGo Concierge...`}
                        className="w-full rounded-lg border border-[#cbd5d0] bg-white p-2.5 text-xs text-[#17201c] outline-none focus:border-[#0d7d5f]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#5d6b65]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() =>
                            void handleModerate(item.id, {
                              operatorReply: replyDraft,
                            })
                          }
                          className="rounded-lg bg-[#0d7d5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0a694f]"
                        >
                          Save Official Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Right Column: Add Verified Pilgrim Testimonial (From Concierge Call or Past Trip) */}
      <section className="h-fit rounded-2xl border border-[#dbe2de] bg-white p-6">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="size-5 text-[#0d7d5f]" />
          <h3 className="font-brand text-lg font-bold text-[#17201c]">
            Log Verified Pilgrim Testimonial
          </h3>
        </div>
        <p className="mt-1 text-xs text-[#68716d]">
          Record feedback shared by a pilgrim during a Concierge follow-up call or
          post-trip interview so other travelers can see it in the app.
        </p>

        <form onSubmit={(e) => void handleCreateTestimonial(e)} className="mt-4 space-y-3.5">
          <label className="block text-xs font-bold text-[#32443d]">
            Pilgrim Display Name
            <input
              type="text"
              required
              value={pilgrimName}
              onChange={(e) => setPilgrimName(e.target.value)}
              placeholder="e.g. Alhaji Musa A. or Hajiya Zainab K."
              className="mt-1 h-9 w-full rounded-lg border border-[#cbd5d0] bg-white px-3 text-xs text-[#17201c] outline-none focus:border-[#0d7d5f]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-[#32443d]">
              Star Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-lg border border-[#cbd5d0] bg-white px-2.5 text-xs font-bold text-[#17201c] outline-none focus:border-[#0d7d5f]"
              >
                <option value={5}>★★★★★ (5 Stars)</option>
                <option value={4}>★★★★☆ (4 Stars)</option>
                <option value={3}>★★★☆☆ (3 Stars)</option>
                <option value={2}>★★☆☆☆ (2 Stars)</option>
                <option value={1}>★☆☆☆☆ (1 Star)</option>
              </select>
            </label>

            <label className="block text-xs font-bold text-[#32443d]">
              Package (Optional)
              <select
                value={selectedPkgId}
                onChange={(e) => setSelectedPkgId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#cbd5d0] bg-white px-2.5 text-xs text-[#17201c] outline-none focus:border-[#0d7d5f]"
              >
                <option value="">General Operator Review</option>
                {packages.map((pkg) => (
                  <option key={String(pkg.id)} value={String(pkg.id)}>
                    {pkg.title || `Package #${pkg.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="block text-xs font-bold text-[#32443d]">
              Sentiment Tags
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => {
                const active = selectedTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      active
                        ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]"
                        : "border-[#d3dad7] bg-white text-[#5d6b65]"
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block text-xs font-bold text-[#32443d]">
            Pilgrim Comment / Testimonial
            <textarea
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="e.g. Alhamdulillah, our Makkah hotel was a 5-minute walk to the Haram clock tower and visa came out 2 weeks early..."
              className="mt-1 w-full rounded-lg border border-[#cbd5d0] bg-white p-2.5 text-xs text-[#17201c] outline-none focus:border-[#0d7d5f]"
            />
          </label>

          <label className="block text-xs font-bold text-[#32443d]">
            Official Operator / Concierge Reply (Optional)
            <input
              type="text"
              value={operatorReplyText}
              onChange={(e) => setOperatorReplyText(e.target.value)}
              placeholder="e.g. JazakAllahu Khayran for travelling with us!"
              className="mt-1 h-9 w-full rounded-lg border border-[#cbd5d0] bg-white px-3 text-xs text-[#17201c] outline-none focus:border-[#0d7d5f]"
            />
          </label>

          <button
            type="submit"
            disabled={savingNew || !pilgrimName.trim()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-xs font-bold text-white hover:bg-[#0a694f] disabled:opacity-60"
          >
            {savingNew ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Publish Verified Testimonial
          </button>
        </form>
      </section>
    </div>
  )
}
