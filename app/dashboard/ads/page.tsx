"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  Eye,
  Loader2,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Power,
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
  redirectUrl: string
  placement: string
  isSponsored: boolean
  businessName: string
  businessLogo?: string
  cta?: string
  priority: number
  startDate: string
  endDate: string
  active: boolean
  impressions?: number
  clicks?: number
  targetBudgetMin?: number
  targetBudgetMax?: number
  targetTravelType?: string
  targetLocation?: string
}

type AdMetrics = { impressions: number; clicks: number; ctr: number; daily: Array<{ date: string; impressions: number; clicks: number }> }

const placementOptions = [
  { value: "all", label: "All placements" },
  { value: "homepage_hero", label: "Homepage hero" },
  { value: "homepage_sidebar", label: "Homepage sidebar" },
  { value: "explore_banner", label: "Explore banner" },
  { value: "package_detail", label: "Package detail" },
  { value: "default_placement", label: "Default" },
]

const emptyForm = {
  title: "", description: "", imageUrl: "", redirectUrl: "", placement: "homepage_hero",
  isSponsored: true, businessName: "", businessLogo: "", cta: "Learn more", priority: "0",
  startDate: "", endDate: "", active: true, targetBudgetMin: "", targetBudgetMax: "",
  targetTravelType: "", targetLocation: "",
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

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/ads", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setAds(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
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
      title: ad.title || "", description: ad.description || "", imageUrl: ad.imageUrl || "", redirectUrl: ad.redirectUrl || "",
      placement: ad.placement || "homepage_hero", isSponsored: ad.isSponsored ?? true, businessName: ad.businessName || "",
      businessLogo: ad.businessLogo || "", cta: ad.cta || "Learn more", priority: String(ad.priority ?? 0),
      startDate: toLocalInput(ad.startDate), endDate: toLocalInput(ad.endDate), active: ad.active ?? true,
      targetBudgetMin: ad.targetBudgetMin != null ? String(ad.targetBudgetMin) : "", targetBudgetMax: ad.targetBudgetMax != null ? String(ad.targetBudgetMax) : "",
      targetTravelType: ad.targetTravelType || "", targetLocation: ad.targetLocation || "",
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
        redirectUrl: form.redirectUrl,
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

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Growth & marketing</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Sponsored ads</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Manage mobile placements, schedules, targeting, and engagement for sponsored placements.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
          <Plus className="size-4" /> Create ad
        </button>
      </header>

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
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Destination URL</label>
              <input required type="url" value={form.redirectUrl} onChange={(event) => setForm((current) => ({ ...current, redirectUrl: event.target.value }))} placeholder="https://…" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
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
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} className="size-4 rounded border-[#d3dad7]" /> Active when schedule begins
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
