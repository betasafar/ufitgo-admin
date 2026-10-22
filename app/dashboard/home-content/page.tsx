"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCan } from "@/components/auth/permission-gate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  campaignEnd, fromLocalDateTime, homeContentRequest, toLocalDateTime, validateHomeContent,
  type Campaign, type HomeContent, type HomePackage, type HomePreview, type PackageResult, type SectionConfig,
} from "@/lib/home-content"

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm"
const cardClass = "space-y-4 rounded-xl border bg-card p-5"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium"><span>{label}</span>{children}</label>
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />{label}</label>
}

function move<T>(items: T[], index: number, direction: number) {
  const next = [...items]
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function PackageDetails({ item }: { item: HomePackage }) {
  const operator = typeof item.operator === "string" ? item.operator : item.operator?.businessName || item.operator?.name
  return <span className="text-xs text-muted-foreground">
    #{item.id} · {item.type}{item.season ? ` / ${item.season}` : ""} · season {item.seasonYear ?? "unclassified"} · {item.status} / {item.salesStatus}
    {operator ? ` · ${operator}` : ""}{item.remainingSlots !== undefined ? ` · ${item.remainingSlots} slots` : ""}
    {item.departureDate ? ` · departs ${new Date(item.departureDate).toLocaleDateString()}` : ""}
  </span>
}

function PackagePicker({ ids, onChange, label }: { ids: number[]; onChange: (ids: number[]) => void; label: string }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [known, setKnown] = useState<Record<number, HomePackage>>({})
  const query = useQuery({
    queryKey: ["home-content-packages", search, page],
    queryFn: ({ signal }) => homeContentRequest<PackageResult>(`/packages?${new URLSearchParams({ search, page: String(page), limit: "10" })}`, { signal }),
  })
  useEffect(() => {
    if (query.data) setKnown((current) => ({ ...current, ...Object.fromEntries(query.data.data.map((item) => [item.id, item])) }))
  }, [query.data])

  return <div className="space-y-3 rounded-lg border p-3">
    <h4 className="text-sm font-semibold">{label} — ordered selection</h4>
    <p className="text-xs text-muted-foreground">Only eligible packages are shown in the effective feed. Saved IDs stay visible here even when unavailable; use Preview to check exclusions.</p>
    <ol className="space-y-2">
      {ids.map((id, index) => <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
        <span>{index + 1}. {known[id]?.title ?? `Package #${id}`} <span className="text-muted-foreground">(#{id})</span></span>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" aria-label={`Move package ${id} up`} disabled={index === 0} onClick={() => onChange(move(ids, index, -1))}>↑</Button>
          <Button type="button" variant="outline" size="sm" aria-label={`Move package ${id} down`} disabled={index === ids.length - 1} onClick={() => onChange(move(ids, index, 1))}>↓</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(ids.filter((selected) => selected !== id))}>Remove #{id}</Button>
        </div>
      </li>)}
    </ol>
    {!ids.length && <p className="text-sm text-muted-foreground">No manually selected packages.</p>}
    <Field label={`Search packages for ${label}`}><Input value={search} placeholder="Search by title or operator" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></Field>
    {query.isPending && <p role="status" className="text-sm">Loading packages…</p>}
    {query.error && <p role="alert" className="text-sm text-red-700">{query.error.message} <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button></p>}
    <ul className="space-y-2">
      {query.data?.data.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 border-b pb-2">
        <div className="flex flex-col"><span className="text-sm">{item.title}</span><PackageDetails item={item} /></div>
        <Button type="button" variant="outline" size="sm" disabled={ids.includes(item.id)} onClick={() => onChange([...ids, item.id])}>{ids.includes(item.id) ? "Selected" : "Add"}</Button>
      </li>)}
    </ul>
    {query.data && !query.data.data.length && <p className="text-sm">No packages match this search.</p>}
    {query.data && <div className="flex items-center gap-3 text-sm">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
      <span>Page {page} of {Math.max(1, query.data.meta.totalPages)} · {query.data.meta.total} packages</span>
      <Button type="button" variant="outline" size="sm" disabled={page >= query.data.meta.totalPages || query.isFetching} onClick={() => setPage(page + 1)}>Next</Button>
    </div>}
  </div>
}

function Preview({ preview }: { preview: HomePreview }) {
  return <section className={cardClass} aria-label="Effective Home preview">
    <h3 className="text-lg font-semibold">Effective Home preview · config {preview.configVersion}</h3>
    <p className="text-sm text-muted-foreground">Resolved by the Operator API from this unsaved draft using current eligibility and availability. Saving is a separate action.</p>
    <div role="status" className="space-y-2">
      {preview.warnings.length ? preview.warnings.map((warning, index) => <p key={index} className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        {typeof warning === "string" ? warning : warning && typeof warning === "object" && "message" in warning ? String(warning.message) : JSON.stringify(warning)}
      </p>) : <p className="text-sm">No warnings.</p>}
    </div>
    {preview.sections.map((section, index) => <div key={`${section.id}-${index}`} className="space-y-2 border-t pt-3">
      <h4 className="font-medium">{index + 1}. {section.title || section.id}</h4>
      <ul className="space-y-2">{section.packages?.map((item) => {
        const source = section.selection?.find((selection) => selection.packageId === item.id)?.source
        return <li key={item.id} className="flex flex-col text-sm">
          <span>{item.title}{source && <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs">{source === "manual" ? "Pinned · manual" : source === "promoted" ? "Promoted · campaign" : "Automatic · API selected"}</span>}</span>
          <PackageDetails item={item} />
        </li>
      })}</ul>
      {!section.packages?.length && <p className="text-sm text-muted-foreground">{section.packageIds?.length ? `Effective package IDs: ${section.packageIds.join(", ")}` : "No effective packages."}</p>}
    </div>)}
    {!preview.sections.length && <p>No visible sections.</p>}
  </section>
}

export default function HomeContentPage() {
  const can = useCan()
  const allowed = can(["marketing.manage"])
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<HomeContent | null>(null)
  const [preview, setPreview] = useState<HomePreview | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const query = useQuery({
    queryKey: ["home-content-config"],
    queryFn: ({ signal }) => homeContentRequest<HomeContent>("", { signal }),
    enabled: allowed,
    refetchOnWindowFocus: false,
  })
  const review = useQuery({
    queryKey: ["home-content-classification-review"],
    queryFn: ({ signal }) => homeContentRequest<{ data: HomePackage[] }>("/classification-review", { signal }),
    enabled: allowed,
  })
  useEffect(() => { if (query.data && !dirty) setDraft(query.data) }, [query.data, dirty])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function change(next: HomeContent) {
    setDraft(next)
    setDirty(true)
    setPreview(null)
    setNotice("")
    setError("")
  }
  function updateSection(index: number, patch: Partial<SectionConfig>) {
    if (draft) change({ ...draft, sections: draft.sections.map((section, i) => i === index ? { ...section, ...patch } : section) })
  }
  function updateCampaign(index: number, patch: Partial<Campaign>) {
    if (draft) change({ ...draft, campaigns: draft.campaigns.map((campaign, i) => i === index ? { ...campaign, ...patch } : campaign) })
  }
  async function reload() {
    if (dirty && !window.confirm("Discard your unsaved draft and load the latest saved configuration?")) return
    setBusy(true)
    setError("")
    try {
      const result = await query.refetch()
      if (result.error) throw result.error
      if (result.data) { setDraft(result.data); setDirty(false); setPreview(null); setNotice("Latest saved configuration loaded.") }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to reload configuration.") }
    finally { setBusy(false) }
  }
  async function run(action: "save" | "preview") {
    if (!draft) return
    setError("")
    setNotice("")
    const validation = validateHomeContent(draft)
    if (validation) { setError(validation); return }
    setBusy(true)
    try {
      const { updatedAt: _updatedAt, updatedBy: _updatedBy, ...config } = draft
      if (action === "save") {
        const saved = await homeContentRequest<HomeContent>("", { method: "PUT", body: JSON.stringify(config) })
        queryClient.setQueryData(["home-content-config"], saved)
        setDraft(saved)
        setDirty(false)
        setPreview(null)
        setNotice(`Home content saved at revision ${saved.revision}.`)
      } else {
        setPreview(await homeContentRequest<HomePreview>("/preview", { method: "POST", body: JSON.stringify(config) }))
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to manage Home content.") }
    finally { setBusy(false) }
  }
  function addCampaign() {
    if (!draft) return
    const startsAt = new Date().toISOString()
    change({ ...draft, campaigns: [...draft.campaigns, {
      id: crypto.randomUUID(), title: "New campaign", enabled: false, startsAt,
      endsAt: campaignEnd(startsAt, 1), packageIds: [], fallbackEnabled: false,
    }] })
  }

  if (!allowed) return <p role="alert">You do not have permission to manage Home content.</p>
  if (!draft) return <div className={cardClass}>{query.error
    ? <><p role="alert">{query.error.message}</p><Button onClick={() => query.refetch()}>Retry</Button></>
    : <p role="status">Loading Home content…</p>}</div>

  return <div className="space-y-6">
    <header className={cardClass}>
      <h2 className="text-2xl font-bold">Home content</h2>
      <p className="text-sm text-muted-foreground">API-first merchandising for the public Home feed. Automatic seasonal defaults remain in effect until you explicitly change them.</p>
      <p className="text-sm">Revision {draft.revision}{dirty ? " · Unsaved changes" : " · Saved"}{draft.updatedBy ? ` · ${draft.updatedBy}` : ""}{draft.updatedAt ? ` · ${new Date(draft.updatedAt).toLocaleString()}` : ""}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => run("save")}>{busy ? "Working…" : "Save configuration"}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => run("preview")}>Preview unsaved draft</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={reload}>Reload saved configuration</Button>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    </header>
    <fieldset disabled={busy} className="space-y-6">
      <section className={cardClass}>
        <h3 className="text-lg font-semibold">1. Selling seasons</h3>
        <p className="text-sm text-muted-foreground">Set Hajj and Ramadan independently. Automatic mode lets the API choose the selling year. A manual year stays fixed unless you explicitly enable automatic fallback.</p>
        <div className="grid gap-5 md:grid-cols-2">{(["hajj", "ramadan"] as const).map((name) => {
          const rule = draft.seasons[name]
          const update = (patch: Partial<typeof rule>) => change({ ...draft, seasons: { ...draft.seasons, [name]: { ...rule, ...patch } } })
          return <div key={name} className="space-y-3 rounded-lg border p-4">
            <h4 className="font-semibold capitalize">{name}</h4>
            <Field label={`${name} selling-year mode`}><select className={selectClass} value={rule.mode} onChange={(event) => update({ mode: event.target.value as typeof rule.mode })}>
              <option value="automatic">Automatic selling year</option><option value="manual">Manual selling year</option>
            </select></Field>
            <Field label={`${name} selling year`}><Input type="number" min={2000} max={2200} step={1} disabled={rule.mode === "automatic"} value={rule.year ?? ""} onChange={(event) => update({ year: event.target.value ? Number(event.target.value) : null })} /></Field>
            <Toggle label="Allow automatic year fallback when the selected year has no eligible packages" checked={rule.automaticFallbackEnabled} disabled={rule.mode === "automatic"} onChange={(automaticFallbackEnabled) => update({ automaticFallbackEnabled })} />
          </div>
        })}</div>
      </section>
      <section className={cardClass}>
        <h3 className="text-lg font-semibold">2. Home sections</h3>
        <p className="text-sm text-muted-foreground">Order below is Home order. Disabled sections stay hidden. Manual mode never silently fills missing or ineligible selections.</p>
        {draft.sections.map((section, index) => <article key={section.id} className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-semibold">{index + 1}. {section.id}</h4>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${section.id} section up`} onClick={() => change({ ...draft, sections: move(draft.sections, index, -1) })}>↑ Up</Button>
              <Button type="button" variant="outline" size="sm" disabled={index === draft.sections.length - 1} aria-label={`Move ${section.id} section down`} onClick={() => change({ ...draft, sections: move(draft.sections, index, 1) })}>↓ Down</Button>
            </div>
          </div>
          <Toggle label={`Show ${section.id} on Home`} checked={section.enabled} onChange={(enabled) => updateSection(index, { enabled })} />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Section title"><Input value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} /></Field>
            <Field label="Selection mode"><select className={selectClass} value={section.mode} onChange={(event) => {
              const mode = event.target.value as SectionConfig["mode"]
              updateSection(index, { mode, ...(mode === "manual" ? { fallbackEnabled: false } : {}) })
            }}><option value="manual">Manual — selected packages only</option><option value="automatic">Automatic</option><option value="manual_with_fill">Manual with automatic fill</option></select></Field>
            <Field label="Package limit"><Input type="number" min={1} max={50} step={1} value={section.limit} onChange={(event) => updateSection(index, { limit: Number(event.target.value) })} /></Field>
          </div>
          {section.id === "recommendations" && <div className="space-y-3 rounded-lg border p-3">
            <h5 className="text-sm font-semibold">Recommendation candidate constraints</h5>
            <p className="text-xs text-muted-foreground">Apply to both manually selected packages and automatic fill. Hajj and Ramadan Home sections continue to use their central selling-season settings.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Recommendation package candidates"><select className={selectClass}
                value={section.season === "ramadan" ? "ramadan" : section.type ?? ""}
                onChange={(event) => {
                  const value = event.target.value
                  updateSection(index, {
                    type: value === "ramadan" || value === "umrah" ? "umrah" : value === "hajj" ? "hajj" : undefined,
                    season: value === "ramadan" ? "ramadan" : undefined,
                    seasonYear: value === "hajj" || value === "ramadan" ? section.seasonYear : undefined,
                  })
                }}>
                <option value="">All packages</option><option value="hajj">Hajj</option><option value="umrah">Umrah (all seasons)</option><option value="ramadan">Ramadan Umrah</option>
              </select></Field>
              <Field label="Recommendation season year (optional)"><Input type="number" min={2000} max={2200} step={1}
                disabled={section.type !== "hajj" && section.season !== "ramadan"}
                value={section.seasonYear ?? ""}
                onChange={(event) => updateSection(index, { seasonYear: event.target.value ? Number(event.target.value) : undefined })} /></Field>
            </div>
          </div>}
          <Toggle label="Allow eligible automatic fallback" checked={section.mode !== "manual" && section.fallbackEnabled} disabled={section.mode === "manual"} onChange={(fallbackEnabled) => updateSection(index, { fallbackEnabled })} />
          {section.mode === "manual" && <p className="text-xs text-muted-foreground">Manual-only: empty selections remain empty. No automatic fill.</p>}
          {section.mode === "automatic"
            ? <p className="text-sm text-muted-foreground">The API selects eligible packages automatically. Any saved manual IDs are retained for a future mode change but are not used in automatic mode.</p>
            : <PackagePicker label={section.title || section.id} ids={section.packageIds} onChange={(packageIds) => updateSection(index, { packageIds })} />}
        </article>)}
      </section>
      <section className={cardClass}>
        <h3 className="text-lg font-semibold">3. Scheduled campaigns</h3>
        <p className="text-sm text-muted-foreground">Use custom dates or 1, 3, or 4 calendar-month presets. Times are entered in your local timezone and stored as UTC. Enabled campaigns cannot overlap. No artificial countdowns or discounts are added.</p>
        <Button type="button" variant="outline" onClick={addCampaign}>Add campaign</Button>
        {!draft.campaigns.length && <p className="text-sm">No campaigns configured.</p>}
        {draft.campaigns.map((campaign, index) => <article className={cardClass} key={campaign.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-semibold">{campaign.title || "Untitled campaign"}</h4>
            <Button type="button" variant="outline" onClick={() => change({ ...draft, campaigns: draft.campaigns.filter((_, i) => i !== index) })}>Remove campaign</Button>
          </div>
          <Toggle label={campaign.enabled ? "Campaign enabled (uncheck to pause)" : "Campaign paused (check to enable)"} checked={campaign.enabled} onChange={(enabled) => updateCampaign(index, { enabled })} />
          <Field label="Campaign title"><Input value={campaign.title} onChange={(event) => updateCampaign(index, { title: event.target.value })} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Starts at (local time)"><Input type="datetime-local" value={toLocalDateTime(campaign.startsAt)} onChange={(event) => updateCampaign(index, { startsAt: fromLocalDateTime(event.target.value) })} /></Field>
            <Field label="Ends at (local time)"><Input type="datetime-local" value={toLocalDateTime(campaign.endsAt)} onChange={(event) => updateCampaign(index, { endsAt: fromLocalDateTime(event.target.value) })} /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm"><span>End-date presets from start:</span>{[1, 3, 4].map((months) => <Button key={months} type="button" variant="outline" size="sm" disabled={!campaign.startsAt} onClick={() => updateCampaign(index, { endsAt: campaignEnd(campaign.startsAt, months) })}>{months} month{months > 1 ? "s" : ""}</Button>)}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Package type filter"><select className={selectClass} value={campaign.type ?? ""} onChange={(event) => {
              const type = (event.target.value || undefined) as Campaign["type"]
              updateCampaign(index, { type, season: type === "umrah" ? campaign.season : undefined, seasonYear: type === "hajj" || (type === "umrah" && campaign.season === "ramadan") ? campaign.seasonYear : undefined })
            }}><option value="">Any type</option><option value="hajj">Hajj</option><option value="umrah">Umrah</option></select></Field>
            <Field label="Season filter"><select className={selectClass} value={campaign.season ?? ""} onChange={(event) => {
              const season = (event.target.value || undefined) as Campaign["season"]
              updateCampaign(index, { season, ...(season ? { type: "umrah" } : {}), seasonYear: season || campaign.type === "hajj" ? campaign.seasonYear : undefined })
            }}><option value="">Any season</option><option value="ramadan">Ramadan</option></select></Field>
            <Field label="Season year filter (optional)"><Input type="number" min={2000} max={2200} step={1} disabled={campaign.type !== "hajj" && campaign.season !== "ramadan"} value={campaign.seasonYear ?? ""} onChange={(event) => updateCampaign(index, { seasonYear: event.target.value ? Number(event.target.value) : undefined })} /></Field>
          </div>
          <Toggle label="Allow eligible automatic fallback when campaign selections are unavailable" checked={campaign.fallbackEnabled} onChange={(fallbackEnabled) => updateCampaign(index, { fallbackEnabled })} />
          <PackagePicker label={campaign.title || "Campaign"} ids={campaign.packageIds} onChange={(packageIds) => updateCampaign(index, { packageIds })} />
        </article>)}
        <p className="text-sm font-medium">Campaign edits, pauses, and removals take effect only after Save configuration.</p>
      </section>
    </fieldset>
    {preview && <Preview preview={preview} />}
    <section className={cardClass}>
      <h3 className="text-lg font-semibold">Package classification review</h3>
      <p className="text-sm text-muted-foreground">Packages flagged by the API for a missing season year or possible Ramadan classification. Review the actual itinerary before editing; no bulk reclassification is performed.</p>
      <Button variant="outline" disabled={review.isFetching} onClick={() => review.refetch()}>Refresh review queue</Button>
      {review.isPending && <p role="status">Loading classification review…</p>}
      {review.error && <p role="alert" className="text-sm text-red-700">{review.error.message}</p>}
      {review.data?.data.length === 0 && <p className="text-sm">No packages currently need review.</p>}
      <ul className="space-y-3">{review.data?.data.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-col"><span className="text-sm">{item.title}</span><PackageDetails item={item} /></div>
        {can(["packages.manage"])
          ? <Link href={`/dashboard/packages/${item.id}/edit`} className="text-sm underline">Review package #{item.id}</Link>
          : <span className="text-xs text-muted-foreground">Ask a package manager to review #{item.id}.</span>}
      </li>)}</ul>
    </section>
  </div>
}
