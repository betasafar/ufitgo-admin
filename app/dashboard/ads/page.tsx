"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  BadgeDollarSign,
  CheckCircle2,
  CalendarDays,
  Eye,
  Loader2,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Power,
  ReceiptText,
  Settings2,
  Trash2,
  X,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"

type Ad = {
  id: string
  title: string
  description?: string
  imageUrl?: string
  redirectUrl?: string
  destinationType?: "external_url" | "package" | "operator" | "landing_page"
  destinationId?: string
  placement: string
  isSponsored: boolean
  businessName: string
  businessLogo?: string
  cta?: string
  priority: number
  startDate: string
  endDate: string
  active: boolean
  pricingMode?: "plan" | "custom"
  planId?: string
  planName?: string
  chargeAmount?: number
  approvalStatus?: "draft" | "pending_review" | "approved" | "rejected"
  impressions?: number
  clicks?: number
  targetBudgetMin?: number
  targetBudgetMax?: number
  targetTravelType?: string
  targetLocation?: string
}

type AdMetrics = { impressions: number; clicks: number; ctr: number; daily: Array<{ date: string; impressions: number; clicks: number }> }

type AdPlan = {
  id: string
  name: string
  placement: string
  durationDays: number
  price: number
  active: boolean
}

type SystemConfig = {
  features?: { enableHomeAds?: boolean }
  savingsConfig?: { ads?: { plans?: AdPlan[] } }
}

type AdForm = {
  title: string; description: string; imageUrl: string; redirectUrl: string; destinationType: "external_url" | "package" | "operator" | "landing_page"; destinationId: string; placement: string
  isSponsored: boolean; businessName: string; businessLogo: string; cta: string; priority: string
  startDate: string; endDate: string; active: boolean; targetBudgetMin: string; targetBudgetMax: string
  targetTravelType: string; targetLocation: string; pricingMode: "plan" | "custom"; planId: string
  planName: string; chargeAmount: string; approvalStatus: "draft" | "pending_review" | "approved" | "rejected"
}

const placementOptions = [
  { value: "all", label: "All placements" },
  { value: "homepage_hero", label: "Homepage hero" },
  { value: "homepage_sidebar", label: "Homepage sidebar" },
  { value: "explore_banner", label: "Explore banner" },
  { value: "package_detail", label: "Package detail" },
  { value: "default_placement", label: "Default" },
]

const emptyForm: AdForm = {
  title: "", description: "", imageUrl: "", redirectUrl: "", destinationType: "external_url", destinationId: "", placement: "homepage_hero",
  isSponsored: true, businessName: "", businessLogo: "", cta: "Learn more", priority: "0",
  startDate: "", endDate: "", active: true, targetBudgetMin: "", targetBudgetMax: "",
  targetTravelType: "", targetLocation: "", pricingMode: "custom", planId: "", planName: "",
  chargeAmount: "", approvalStatus: "pending_review",
}

function toLocalInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : ""
}

function scheduleState(ad: Ad) {
  const now = Date.now()
  const start = new Date(ad.startDate).getTime()
  const end = new Date(ad.endDate).getTime()
  if (!ad.active) return { label: "Paused", tone: "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]" }
  if (Number.isFinite(start) && now < start) return { label: "Scheduled", tone: "bg-[#e8fbff] text-[#0f7f9a] border border-[#cdeef5]" }
  if (Number.isFinite(end) && now > end) return { label: "Expired", tone: "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]" }
  return { label: "Live", tone: "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]" }
}

function AdMetricsPanel({ adId }: { adId: string }) {
  const [metrics, setMetrics] = useState<AdMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/admin/ads/${adId}/metrics?days=30`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => { if (active) setMetrics(payload) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [adId])

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-[#0d7d5f]" /></div>

  const max = Math.max(...(metrics?.daily || []).map((item) => item.impressions), 1)

  return (
    <div className="border-t border-[#edf1ef] px-5 py-4">
      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div><span className="text-xs text-[#9aa39e]">Impressions</span><p className="text-lg font-bold text-[#17201c]">{metrics?.impressions ?? 0}</p></div>
        <div><span className="text-xs text-[#9aa39e]">Clicks</span><p className="text-lg font-bold text-[#17201c]">{metrics?.clicks ?? 0}</p></div>
        <div><span className="text-xs text-[#9aa39e]">CTR</span><p className="text-lg font-bold text-[#17201c]">{metrics?.ctr ?? 0}%</p></div>
      </div>
      <div className="flex h-20 items-end gap-1" aria-label="30-day impression trend">
        {(metrics?.daily || []).length === 0 ? (
          <p className="w-full self-center text-center text-xs text-[#9aa39e]">No engagement recorded in the last 30 days.</p>
        ) : (
          metrics!.daily.map((item) => (
            <div key={item.date} title={`${item.date}: ${item.impressions} impressions, ${item.clicks} clicks`} className="min-w-1 flex-1 rounded-t-sm bg-[#0d7d5f]/70" style={{ height: `${Math.max((item.impressions / max) * 100, 4)}%` }} />
          ))
        )}
      </div>
    </div>
  )
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [placement, setPlacement] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [config, setConfig] = useState<SystemConfig>({})
  const [plans, setPlans] = useState<AdPlan[]>([])
  const [savingCatalogue, setSavingCatalogue] = useState(false)
  const [savingDelivery, setSavingDelivery] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [response, configResponse] = await Promise.all([
        fetch("/api/admin/ads", { cache: "no-store" }),
        fetch("/api/admin/customers/system/config", { cache: "no-store" }),
      ])
      const [payload, configPayload] = await Promise.all([
        response.json().catch(() => null),
        configResponse.json().catch(() => null),
      ])
      setAds(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
      const nextConfig = configPayload?.data || configPayload || {}
      setConfig(nextConfig)
      setPlans(Array.isArray(nextConfig?.savingsConfig?.ads?.plans) ? nextConfig.savingsConfig.ads.plans : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function startCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function startEdit(ad: Ad) {
    setEditingId(ad.id)
    setForm({
      title: ad.title || "", description: ad.description || "", imageUrl: ad.imageUrl || "", redirectUrl: ad.redirectUrl || "", destinationType: ad.destinationType || "external_url", destinationId: ad.destinationId || "",
      placement: ad.placement || "homepage_hero", isSponsored: ad.isSponsored ?? true, businessName: ad.businessName || "",
      businessLogo: ad.businessLogo || "", cta: ad.cta || "Learn more", priority: String(ad.priority ?? 0),
      startDate: toLocalInput(ad.startDate), endDate: toLocalInput(ad.endDate), active: ad.active ?? true,
      targetBudgetMin: ad.targetBudgetMin != null ? String(ad.targetBudgetMin) : "", targetBudgetMax: ad.targetBudgetMax != null ? String(ad.targetBudgetMax) : "",
      targetTravelType: ad.targetTravelType || "", targetLocation: ad.targetLocation || "",
      pricingMode: ad.pricingMode || "custom", planId: ad.planId || "", planName: ad.planName || "",
      chargeAmount: ad.chargeAmount != null ? String(ad.chargeAmount) : "",
      approvalStatus: ad.approvalStatus || "approved",
    })
    setShowForm(true)
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        redirectUrl: form.redirectUrl || undefined,
        destinationType: form.destinationType,
        destinationId: form.destinationId || undefined,
        placement: form.placement,
        isSponsored: form.isSponsored,
        businessName: form.businessName,
        businessLogo: form.businessLogo || undefined,
        cta: form.cta || undefined,
        priority: Number(form.priority),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        active: form.active,
        targetBudgetMin: form.targetBudgetMin === "" ? undefined : Number(form.targetBudgetMin),
        targetBudgetMax: form.targetBudgetMax === "" ? undefined : Number(form.targetBudgetMax),
        targetTravelType: form.targetTravelType || undefined,
        targetLocation: form.targetLocation || undefined,
        pricingMode: form.pricingMode,
        planId: form.planId || undefined,
        planName: form.planName || undefined,
        chargeAmount: form.chargeAmount === "" ? undefined : Number(form.chargeAmount),
        approvalStatus: form.approvalStatus,
        isPushCampaign: false,
      }
      const response = await fetch(editingId ? `/api/admin/ads/${editingId}` : "/api/admin/ads", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error()
      setShowForm(false)
      await load()
    } catch {
      window.alert("Could not save this sponsored ad.")
    } finally {
      setSaving(false)
    }
  }

  function applyPlan(planId: string) {
    const plan = plans.find((item) => item.id === planId)
    if (!plan) return
    const start = form.startDate ? new Date(form.startDate) : new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + Math.max(1, Number(plan.durationDays) || 1))
    setForm((current) => ({
      ...current,
      pricingMode: "plan",
      planId: plan.id,
      planName: plan.name,
      chargeAmount: String(plan.price),
      placement: plan.placement,
      startDate: current.startDate || toLocalInput(start.toISOString()),
      endDate: toLocalInput(end.toISOString()),
    }))
  }

  function updatePlan(id: string, field: keyof AdPlan, value: string | boolean) {
    setPlans((current) => current.map((plan) => plan.id === id ? {
      ...plan,
      [field]: field === "durationDays" || field === "price" ? Number(value) : value,
    } : plan))
  }

  function addPlan() {
    setPlans((current) => [...current, {
      id: `plan-${Date.now()}`,
      name: "New campaign plan",
      placement: "homepage_hero",
      durationDays: 7,
      price: 0,
      active: true,
    }])
  }

  async function saveCatalogue() {
    setSavingCatalogue(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsConfig: { ads: { plans } } }),
      })
      if (!response.ok) throw new Error()
      const payload = await response.json().catch(() => null)
      setConfig(payload?.data || payload || config)
    } catch {
      window.alert("Could not save the ad catalogue.")
    } finally {
      setSavingCatalogue(false)
    }
  }

  async function toggleDelivery() {
    setSavingDelivery(true)
    const enableHomeAds = !config.features?.enableHomeAds
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: { enableHomeAds } }),
      })
      if (!response.ok) throw new Error()
      setConfig((current) => ({ ...current, features: { ...current.features, enableHomeAds } }))
    } catch {
      window.alert("Could not update ad delivery.")
    } finally {
      setSavingDelivery(false)
    }
  }

  async function toggleAd(id: string) {
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/ads/${id}/toggle`, { method: "PATCH" })
      if (!response.ok) throw new Error()
      await load()
    } catch {
      window.alert("Could not toggle this ad.")
    } finally {
      setBusyId(null)
    }
  }

  async function deleteAd(id: string) {
    if (!window.confirm("Delete this sponsored ad? This cannot be undone.")) return
    setBusyId(id)
    try {
      const response = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error()
      await load()
    } catch {
      window.alert("Could not delete this ad.")
    } finally {
      setBusyId(null)
    }
  }

  const placementCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ads.length }
    for (const option of placementOptions.slice(1)) {
      counts[option.value] = ads.filter((ad) => ad.placement === option.value).length
    }
    return counts
  }, [ads])

  const filteredAds = placement === "all" ? ads : ads.filter((ad) => ad.placement === placement)

  const summary = useMemo(() => ({
    total: ads.length,
    active: ads.filter((ad) => ad.active).length,
    impressions: ads.reduce((sum, ad) => sum + Number(ad.impressions || 0), 0),
    clicks: ads.reduce((sum, ad) => sum + Number(ad.clicks || 0), 0),
  }), [ads])
  const deliveryEnabled = config.features?.enableHomeAds ?? true
  const activePlans = plans.filter((plan) => plan.active)

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Growth & marketing</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Sponsored ads</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Control inventory, campaign approval, rates, schedules, and engagement in one place.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
          <Plus className="size-4" /> Create ad
        </button>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className={`border p-5 ${deliveryEnabled ? "border-[#bce5d4] bg-[#f2fbf6]" : "border-[#e4d8a2] bg-[#fffcf1]"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><Power className={`size-4 ${deliveryEnabled ? "text-[#0c6b50]" : "text-[#8a6500]"}`} /><h2 className="text-sm font-bold text-[#17201c]">Home ad delivery</h2></div>
              <p className="mt-2 text-sm leading-5 text-[#5d6964]">{deliveryEnabled ? "Approved campaigns can appear in the mobile Home feed." : "All Home ad placements are hidden from customers."}</p>
            </div>
            <button type="button" onClick={() => void toggleDelivery()} disabled={savingDelivery} className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-bold disabled:opacity-50 ${deliveryEnabled ? "bg-[#0d7d5f] text-white" : "border border-[#c8b66b] bg-white text-[#785b00]"}`}>
              {savingDelivery ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}{deliveryEnabled ? "On" : "Off"}
            </button>
          </div>
        </div>

        <div className="border border-[#dbe2de] bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><ReceiptText className="size-4 text-[#0f74c1]" /><h2 className="text-sm font-bold text-[#17201c]">Ad rate card</h2></div><p className="mt-1 text-xs text-[#78817d]">Fixed plans for regular sales. Custom quotes stay available per campaign.</p></div>
            <div className="flex gap-2"><button type="button" onClick={addPlan} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cddbd5] bg-white px-3 text-xs font-bold text-[#0d7d5f] hover:bg-[#eef7f3]"><Plus className="size-3.5" /> Add plan</button><button type="button" onClick={() => void saveCatalogue()} disabled={savingCatalogue} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#17201c] px-3 text-xs font-bold text-white disabled:opacity-50">{savingCatalogue ? <Loader2 className="size-3.5 animate-spin" /> : <Settings2 className="size-3.5" />} Save rates</button></div>
          </div>
          {plans.length === 0 ? <p className="border border-dashed border-[#dbe2de] px-4 py-5 text-sm text-[#78817d]">No fixed plans yet. Add one when you are ready to publish public rates.</p> : (
            <div className="space-y-2">
              {plans.map((plan) => <div key={plan.id} className="grid gap-2 border border-[#edf1ef] p-3 sm:grid-cols-[minmax(140px,1fr)_150px_92px_110px_auto] sm:items-center">
                <input value={plan.name} onChange={(event) => updatePlan(plan.id, "name", event.target.value)} aria-label="Plan name" className="h-9 min-w-0 border border-[#d3dad7] bg-[#f8faf9] px-2 text-sm" />
                <AppSelect value={plan.placement} onValueChange={(value) => updatePlan(plan.id, "placement", value)} options={placementOptions.slice(1)} />
                <input type="number" min="1" value={plan.durationDays} onChange={(event) => updatePlan(plan.id, "durationDays", event.target.value)} aria-label="Duration in days" className="h-9 border border-[#d3dad7] bg-[#f8faf9] px-2 text-sm" />
                <input type="number" min="0" value={plan.price} onChange={(event) => updatePlan(plan.id, "price", event.target.value)} aria-label="Price in naira" className="h-9 border border-[#d3dad7] bg-[#f8faf9] px-2 text-sm" />
                <div className="flex items-center justify-end gap-2"><label className="text-xs font-semibold text-[#52605a]"><input type="checkbox" checked={plan.active} onChange={(event) => updatePlan(plan.id, "active", event.target.checked)} className="mr-1.5" />Live</label><button type="button" onClick={() => setPlans((current) => current.filter((item) => item.id !== plan.id))} aria-label={`Remove ${plan.name}`} className="p-1 text-[#a43229] hover:bg-[#fff0ee]"><Trash2 className="size-3.5" /></button></div>
              </div>)}
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Total ads</span><Megaphone className="size-4 text-[#07845f]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active</span><Power className="size-4 text-[#0c6b50]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.active}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Impressions</span><Eye className="size-4 text-[#0f74c1]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.impressions.toLocaleString("en-NG")}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Clicks</span><MousePointerClick className="size-4 text-[#8a6500]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.clicks.toLocaleString("en-NG")}</p>
        </div>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">{editingId ? "Edit sponsored ad" : "Create sponsored ad"}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X className="size-5 text-[#68716d]" /></button>
          </div>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Title</label>
              <input required maxLength={140} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Business name</label>
              <input required value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Image URL</label>
              <input type="url" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://…" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Destination</label>
              <AppSelect value={form.destinationType} onValueChange={(value) => setForm((current) => ({ ...current, destinationType: value as AdForm["destinationType"], destinationId: "", redirectUrl: "" }))} options={[{ value: "external_url", label: "External website or WhatsApp" }, { value: "package", label: "UfitGo package" }, { value: "operator", label: "UfitGo operator" }, { value: "landing_page", label: "Hosted sponsored page" }]} />
            </div>
            {form.destinationType === "external_url" ? (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">External URL</label>
                <input required type="url" value={form.redirectUrl} onChange={(event) => setForm((current) => ({ ...current, redirectUrl: event.target.value }))} placeholder="https://…" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            ) : form.destinationType === "landing_page" ? (
              <div className="space-y-2">
                <div className="border border-[#cdeef5] bg-[#f4fcfe] px-3 py-2.5 text-xs leading-5 text-[#276172]">UfitGo hosts this campaign at a shareable sponsored page using the campaign content below.</div>
                <input type="url" value={form.redirectUrl} onChange={(event) => setForm((current) => ({ ...current, redirectUrl: event.target.value }))} placeholder="Optional action URL for the hosted page" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">{form.destinationType === "package" ? "Package ID" : "Operator ID"}</label>
                <input required value={form.destinationId} onChange={(event) => setForm((current) => ({ ...current, destinationId: event.target.value }))} placeholder="Paste the UfitGo record ID" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Placement</label>
              <AppSelect value={form.placement} onValueChange={(value) => setForm((current) => ({ ...current, placement: value }))} options={placementOptions.slice(1)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">CTA label</label>
              <input value={form.cta} onChange={(event) => setForm((current) => ({ ...current, cta: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Starts</label>
              <input required type="datetime-local" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Ends</label>
              <input required type="datetime-local" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Pricing</label>
              <AppSelect value={form.pricingMode === "plan" && form.planId ? form.planId : "custom"} onValueChange={(value) => {
                if (value === "custom") setForm((current) => ({ ...current, pricingMode: "custom", planId: "", planName: "" }))
                else applyPlan(value)
              }} options={[{ value: "custom", label: "Custom quote" }, ...activePlans.map((plan) => ({ value: plan.id, label: `${plan.name} · ₦${Number(plan.price).toLocaleString("en-NG")} / ${plan.durationDays}d` }))]} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Campaign charge (₦)</label>
              <input type="number" min="0" value={form.chargeAmount} onChange={(event) => setForm((current) => ({ ...current, chargeAmount: event.target.value }))} placeholder="Negotiated amount" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Approval</label>
              <AppSelect value={form.approvalStatus} onValueChange={(value) => setForm((current) => ({ ...current, approvalStatus: value as AdForm["approvalStatus"] }))} options={[{ value: "draft", label: "Draft" }, { value: "pending_review", label: "Pending review" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Travel type</label>
              <AppSelect value={form.targetTravelType || "all"} onValueChange={(value) => setForm((current) => ({ ...current, targetTravelType: value === "all" ? "" : value }))} options={[{ value: "all", label: "All" }, { value: "umrah", label: "Umrah" }, { value: "hajj", label: "Hajj" }]} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Customer location target</label>
              <input value={form.targetLocation} onChange={(event) => setForm((current) => ({ ...current, targetLocation: event.target.value }))} placeholder="Leave blank for nationwide" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              <span className="mt-1 block text-xs text-[#9aa39e]">Matches the customer's state or city, e.g. Lagos.</span>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Minimum budget</label>
              <input type="number" min="0" value={form.targetBudgetMin} onChange={(event) => setForm((current) => ({ ...current, targetBudgetMin: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Maximum budget</label>
              <input type="number" min="0" value={form.targetBudgetMax} onChange={(event) => setForm((current) => ({ ...current, targetBudgetMax: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Priority</label>
              <input required type="number" min="0" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <label className="flex items-center gap-2 self-end pb-1 text-sm font-semibold text-[#36413d]">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="size-4 rounded border-[#d3dad7]" /> Eligible when scheduled
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingId ? "Save changes" : "Create ad"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {placementOptions.map((option) => {
            const isActive = placement === option.value
            return (
              <button key={option.value} type="button" onClick={() => setPlacement(option.value)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${isActive ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d9dfdc] bg-white text-[#44544e] hover:bg-[#eef4f1]"}`}>
                <span>{option.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white text-[#0d7d5f]" : "bg-[#edf3f0] text-[#4f5d58]"}`}>{placementCounts[option.value] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading ads…</div>
        ) : filteredAds.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-[#7b8580]">No sponsored ads for this placement.</div>
        ) : (
          <div className="divide-y divide-[#edf1ef]">
            {filteredAds.map((ad) => {
              const schedule = scheduleState(ad)
              const isExpanded = expandedId === ad.id
              return (
                <div key={ad.id}>
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#eaf9f3] text-[#0d7d5f]"><Megaphone className="size-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17201c]">{ad.title}</p>
                        <p className="mt-0.5 text-xs text-[#7b8580]">{ad.businessName} · {placementOptions.find((p) => p.value === ad.placement)?.label || ad.placement} · Priority {ad.priority}</p>
                        <p className="mt-0.5 text-xs text-[#9aa39e]">{new Date(ad.startDate).toLocaleDateString("en-NG")} → {new Date(ad.endDate).toLocaleDateString("en-NG")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${schedule.tone}`}>{schedule.label}</span>
                      <span className="text-xs text-[#7b8580]">{ad.impressions ?? 0} views · {ad.clicks ?? 0} clicks</span>
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : ad.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#0f74c1] hover:bg-[#e8f2ff]">
                        <BarChart3 className="size-3.5" /> {isExpanded ? "Hide metrics" : "View metrics"}
                      </button>
                      <RowActionsMenu
                        actions={[
                          { label: "Edit ad", icon: <Pencil className="size-4" />, onClick: () => startEdit(ad) },
                          { label: ad.active ? "Pause ad" : "Activate ad", icon: <Power className="size-4" />, onClick: () => void toggleAd(ad.id), disabled: busyId === ad.id },
                          { label: "Delete ad", icon: <Trash2 className="size-4" />, onClick: () => void deleteAd(ad.id), disabled: busyId === ad.id, destructive: true },
                        ]}
                      />
                    </div>
                  </div>
                  {isExpanded && <AdMetricsPanel adId={ad.id} />}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
