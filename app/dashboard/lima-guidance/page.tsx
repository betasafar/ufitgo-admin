"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Archive, BookOpenCheck, CheckCircle2, FilePlus2, Loader2, Pencil, RefreshCw, X } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

type GuidanceStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
type GuidanceCategory = "RESPONSE_RULE" | "PRODUCT_KNOWLEDGE" | "TONE" | "POLICY"

type Guidance = {
  id: number
  title: string
  category: GuidanceCategory
  instruction: string
  scope?: { intent?: string; destination?: string }
  priority: number
  rationale?: string
  sourceFeedbackId?: number
  status: GuidanceStatus
  version: number
  familyId: string
  createdByEmail: string
  reviewedByEmail?: string
  publishedAt?: string
  updatedAt: string
}

type GuidanceForm = {
  id?: number
  version?: number
  title: string
  category: GuidanceCategory
  intent: string
  destination: string
  priority: string
  instruction: string
  rationale: string
  sourceFeedbackId: string
}

const EMPTY_FORM: GuidanceForm = {
  title: "",
  category: "RESPONSE_RULE",
  intent: "",
  destination: "",
  priority: "50",
  instruction: "",
  rationale: "",
  sourceFeedbackId: "",
}

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
]

const categoryOptions = [
  { value: "RESPONSE_RULE", label: "Response rule" },
  { value: "PRODUCT_KNOWLEDGE", label: "Product knowledge" },
  { value: "TONE", label: "Tone" },
  { value: "POLICY", label: "Policy" },
]

const intentOptions = [
  { value: "", label: "All intents" },
  { value: "pricing", label: "Pricing" },
  { value: "availability", label: "Availability" },
  { value: "payment_plan", label: "Payment plan" },
  { value: "custom_request", label: "Custom request" },
  { value: "package_search", label: "Package search" },
  { value: "trip_planning", label: "Trip planning" },
]

const destinationOptions = [
  { value: "", label: "All destinations" },
  { value: "umrah", label: "Umrah" },
  { value: "hajj", label: "Hajj" },
]

const statusTone: Record<GuidanceStatus, string> = {
  DRAFT: "border-[#f1e0a9] bg-[#fff6dc] text-[#8a6500]",
  PUBLISHED: "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]",
  ARCHIVED: "border-[#dbe2de] bg-[#f3f5f4] text-[#68716d]",
}

async function readResponse(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || fallback)
  return payload
}

async function fetchGuidance(status: string): Promise<Guidance[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ""
  const response = await fetch(`/api/admin/advisor-guidance${query}`, { cache: "no-store" })
  const payload = await readResponse(response, "Unable to load Lima guidance")
  return Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
}

function toForm(item: Guidance): GuidanceForm {
  return {
    id: item.id,
    version: item.version,
    title: item.title,
    category: item.category,
    intent: item.scope?.intent || "",
    destination: item.scope?.destination || "",
    priority: String(item.priority),
    instruction: item.instruction,
    rationale: item.rationale || "",
    sourceFeedbackId: item.sourceFeedbackId ? String(item.sourceFeedbackId) : "",
  }
}

function buildPayload(form: GuidanceForm) {
  const scope = form.intent || form.destination ? {
    ...(form.intent ? { intent: form.intent } : {}),
    ...(form.destination ? { destination: form.destination } : {}),
  } : undefined

  return {
    title: form.title.trim(),
    category: form.category,
    instruction: form.instruction.trim(),
    scope,
    priority: Number(form.priority),
    rationale: form.rationale.trim() || undefined,
    sourceFeedbackId: form.sourceFeedbackId ? Number(form.sourceFeedbackId) : undefined,
  }
}

export default function LimaGuidancePage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("")
  const [form, setForm] = useState<GuidanceForm | null>(null)

  const guidanceQuery = useQuery({
    queryKey: ["lima-guidance", status],
    queryFn: () => fetchGuidance(status),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: async ({ method, path, body }: { method: "POST" | "PATCH"; path: string; body?: unknown }) => {
      const response = await fetch(`/api/admin/advisor-guidance${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      return readResponse(response, "Could not update Lima guidance")
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lima-guidance"] })
      setForm(null)
    },
  })

  const items = guidanceQuery.data || []
  const isSaving = mutation.isPending
  const updateForm = (changes: Partial<GuidanceForm>) => setForm((current) => current ? { ...current, ...changes } : current)

  const saveDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return
    mutation.mutate({
      method: form.id ? "PATCH" : "POST",
      path: form.id ? `/${form.id}` : "",
      body: buildPayload(form),
    })
  }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Administration</p>
          <h1 className="mt-2 flex items-center gap-3 font-brand text-3xl font-bold text-[#17201c]"><BookOpenCheck className="size-7 text-[#0d7d5f]" /> Lima learning</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Review the guidance that shapes Lima&apos;s answers. Turn verified feedback, policy, and demand evidence into controlled, versioned instructions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AppSelect value={status} onValueChange={setStatus} options={statusOptions} className="w-44" />
          <button type="button" onClick={() => setForm({ ...EMPTY_FORM })} className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]"><FilePlus2 className="size-4" /> New guidance</button>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-[#f1e0a9] bg-[#fffaf0] px-4 py-3 text-sm text-[#725b16]">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <p>Published guidance affects Lima&apos;s responses. Verify it against current policy and package data before publishing. Published versions cannot be edited directly.</p>
      </div>

      {form && (
        <form onSubmit={saveDraft} className="rounded-2xl border border-[#cfeee0] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#07845f]">{form.id ? `Draft revision v${form.version}` : "New draft"}</p><h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">Write Lima guidance</h2></div>
            <button type="button" aria-label="Close editor" onClick={() => setForm(null)} className="rounded-lg p-2 text-[#68716d] hover:bg-[#edf3f0]"><X className="size-5" /></button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#52605a]">Title<input required maxLength={140} value={form.title} onChange={(event) => updateForm({ title: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label>
            <label className="text-sm font-semibold text-[#52605a]">Category<AppSelect value={form.category} onValueChange={(value) => updateForm({ category: value as GuidanceCategory })} options={categoryOptions} className="mt-1.5 w-full" /></label>
            <label className="text-sm font-semibold text-[#52605a]">Intent scope<AppSelect value={form.intent} onValueChange={(value) => updateForm({ intent: value })} options={intentOptions} className="mt-1.5 w-full" /></label>
            <label className="text-sm font-semibold text-[#52605a]">Destination scope<AppSelect value={form.destination} onValueChange={(value) => updateForm({ destination: value })} options={destinationOptions} className="mt-1.5 w-full" /></label>
            <label className="text-sm font-semibold text-[#52605a]">Priority (1-100)<input required type="number" min={1} max={100} value={form.priority} onChange={(event) => updateForm({ priority: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label>
            <label className="text-sm font-semibold text-[#52605a]">Source feedback ID<input type="number" min={1} value={form.sourceFeedbackId} onChange={(event) => updateForm({ sourceFeedbackId: event.target.value })} placeholder="Optional" className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label>
          </div>
          <label className="mt-4 block text-sm font-semibold text-[#52605a]">Instruction<textarea required minLength={10} maxLength={1200} rows={5} value={form.instruction} onChange={(event) => updateForm({ instruction: event.target.value })} placeholder="State the exact behavior Lima should follow. Do not include secrets or unverified prices." className="mt-1.5 w-full resize-y rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal leading-6 text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label>
          <label className="mt-4 block text-sm font-semibold text-[#52605a]">Evidence and rationale<textarea maxLength={1000} rows={3} value={form.rationale} onChange={(event) => updateForm({ rationale: event.target.value })} placeholder="Summarize supporting demand data, feedback, or policy." className="mt-1.5 w-full resize-y rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal leading-6 text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label>
          {mutation.isError && <p className="mt-3 text-sm font-semibold text-[#a43229]">{mutation.error instanceof Error ? mutation.error.message : "Could not save guidance"}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-[#d9dfdc] bg-white px-4 py-2.5 text-sm font-bold text-[#36413d] hover:bg-[#f7f9f8]">Cancel</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{isSaving && <Loader2 className="size-4 animate-spin" />} {isSaving ? "Saving..." : "Save draft"}</button></div>
        </form>
      )}

      {guidanceQuery.isLoading ? <div className="grid place-items-center rounded-xl border border-[#dbe2de] bg-white p-16"><Loader2 className="size-7 animate-spin text-[#0d7d5f]" /></div> : guidanceQuery.error ? <div className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-6 text-sm font-semibold text-[#a43229]">{guidanceQuery.error instanceof Error ? guidanceQuery.error.message : "Unable to load Lima guidance"}</div> : items.length === 0 ? <div className="rounded-xl border border-[#dbe2de] bg-white p-16 text-center text-sm text-[#7b8580]">No guidance in this view.</div> : <div className="space-y-4">{items.map((item) => <GuidanceCard key={item.id} item={item} onEdit={() => setForm(toForm(item))} onAction={(path) => mutation.mutate({ method: "POST", path })} isSaving={isSaving} />)}</div>}
    </main>
  )
}

function GuidanceCard({ item, onEdit, onAction, isSaving }: { item: Guidance; onEdit: () => void; onAction: (path: string) => void; isSaving: boolean }) {
  return <article className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-brand text-lg font-bold text-[#17201c]">{item.title}</h2><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${statusTone[item.status]}`}>{item.status}</span><span className="text-xs font-semibold text-[#9aa39e]">v{item.version} · priority {item.priority}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#36413d]">{item.instruction}</p><div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#68716d]"><span className="rounded-full bg-[#f3f5f4] px-2.5 py-1">{item.category.replaceAll("_", " ")}</span>{item.scope?.intent && <span className="rounded-full bg-[#f3f5f4] px-2.5 py-1">Intent: {item.scope.intent}</span>}{item.scope?.destination && <span className="rounded-full bg-[#f3f5f4] px-2.5 py-1">Destination: {item.scope.destination}</span>}</div>{item.rationale && <p className="mt-4 border-l-2 border-[#0d7d5f] pl-3 text-sm leading-6 text-[#68716d]">{item.rationale}</p>}<p className="mt-4 text-xs text-[#9aa39e]">Created by {item.createdByEmail}{item.reviewedByEmail ? ` · reviewed by ${item.reviewedByEmail}` : ""} · {new Date(item.updatedAt).toLocaleString()}</p></div><div className="flex shrink-0 flex-wrap gap-2">{item.status === "DRAFT" && <><button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-3 py-2 text-xs font-bold text-[#32443d] hover:bg-[#edf3f0]"><Pencil className="size-3.5" /> Edit</button><button type="button" onClick={() => onAction(`/${item.id}/publish`)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-[#0d7d5f] px-3 py-2 text-xs font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"><CheckCircle2 className="size-3.5" /> Publish</button></>}{item.status === "PUBLISHED" && <button type="button" onClick={() => onAction(`/${item.id}/revisions`)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-3 py-2 text-xs font-bold text-[#32443d] hover:bg-[#edf3f0] disabled:opacity-50"><RefreshCw className="size-3.5" /> Create revision</button>}{item.status !== "ARCHIVED" && <button type="button" onClick={() => onAction(`/${item.id}/archive`)} disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg border border-[#f4d0ca] bg-white px-3 py-2 text-xs font-bold text-[#a43229] hover:bg-[#fff0ee] disabled:opacity-50"><Archive className="size-3.5" /> Archive</button>}</div></div></article>
}
