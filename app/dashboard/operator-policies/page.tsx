"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, FileText, Plus, Send } from "lucide-react"

type Policy = {
  id: string
  title: string
  version: number
  content: string
  status: "draft" | "published" | "archived"
  operatorId?: number | null
  ownerType: "platform" | "operator"
  publishedAt?: string
}

const DEFAULT_TEMPLATE = `Operator Cancellation and Refund Policy

1. Operator and package
This package is sold and fulfilled by the named operator. The operator is responsible for delivering the listed services and for refunds required by this policy.

2. Customer cancellation
State the notice periods, deductions, and refund timetable that apply when a customer cancels.

3. Operator cancellation or material change
State how the operator will notify customers, provide alternatives, or issue refunds.

4. Visa and travel documents
State the operator's assistance scope. Visa decisions remain with the relevant authority and cannot be guaranteed.

5. Support and escalation
State the operator's support contact. Customers may also contact UfitGo for marketplace support and escalation.`

export default function OperatorPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({ title: "", operatorId: "", content: DEFAULT_TEMPLATE })

  async function loadPolicies() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/operator-policies", { cache: "no-store" })
      const payload = await response.json()
      setPolicies(Array.isArray(payload?.data) ? payload.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPolicies() }, [])

  async function createPolicy(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/operator-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          operatorId: form.operatorId ? Number(form.operatorId) : null,
          ownerType: form.operatorId ? "operator" : "platform",
        }),
      })
      if (!response.ok) throw new Error("Unable to save policy")
      setForm({ title: "", operatorId: "", content: DEFAULT_TEMPLATE })
      setMessage("Draft policy created. Review it, then publish the version when approved.")
      await loadPolicies()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save policy")
    } finally {
      setSaving(false)
    }
  }

  async function publishPolicy(id: string) {
    const response = await fetch(`/api/admin/operator-policies/${id}/publish`, { method: "PATCH" })
    if (response.ok) await loadPolicies()
  }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Administration</p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Operator policies</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68716d]">Create immutable, versioned cancellation and refund policies for Hajj, Umrah, and future Tour packages. A policy must be published before it can be assigned to a package.</p>
      </header>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Plus className="size-5 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">New policy version</h2></div>
        <form onSubmit={createPolicy} className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-[#52605a]">Policy title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="2027 Hajj Cancellation & Refund Policy" className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]" /></label><label className="text-sm font-semibold text-[#52605a]">Operator ID <span className="font-normal text-[#78817d]">(leave blank for UfitGo template)</span><input inputMode="numeric" value={form.operatorId} onChange={(event) => setForm({ ...form, operatorId: event.target.value })} placeholder="e.g. 42" className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]" /></label></div>
          <label className="text-sm font-semibold text-[#52605a]">Policy text<textarea required rows={16} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-mono text-xs font-normal leading-5 outline-none focus:border-[#0d7d5f]" /></label>
          <div className="flex flex-wrap items-center gap-3"><button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"><FileText className="size-4" />{saving ? "Saving..." : "Save draft"}</button>{message && <p className="text-sm text-[#52605a]">{message}</p>}</div>
        </form>
      </section>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-6 shadow-sm"><h2 className="font-brand text-lg font-bold text-[#17201c]">Policy versions</h2><div className="mt-5 space-y-3">{loading ? <p className="text-sm text-[#68716d]">Loading policies...</p> : policies.map((policy) => <article key={policy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dbe2de] bg-[#f8faf9] p-4"><div><p className="font-bold text-[#17201c]">{policy.title} <span className="text-sm text-[#68716d]">v{policy.version}</span></p><p className="mt-1 text-xs text-[#68716d]">{policy.ownerType === "platform" ? "UfitGo template" : `Operator ${policy.operatorId}`} · {policy.status}</p></div>{policy.status === "draft" ? <button type="button" onClick={() => void publishPolicy(policy.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#0d7d5f] px-3 text-sm font-bold text-[#0d7d5f] hover:bg-[#eaf9f3]"><Send className="size-4" />Publish</button> : <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0d7d5f]"><CheckCircle2 className="size-4" />Published</span>}</article>)}</div></section>
    </main>
  )
}
