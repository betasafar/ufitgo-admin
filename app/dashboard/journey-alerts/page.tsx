"use client"

import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellRing, CalendarClock, Loader2, Mail, RefreshCw, Search, Send, ShieldAlert, Users, X } from "lucide-react"
import { useCan } from "@/components/auth/permission-gate"
import { AppSelect } from "@/components/ui/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginationBar } from "@/components/ui/pagination-bar"

interface JourneyAlertEntry {
  id: string
  purpose: AlertPurpose
  active: boolean
  notifiedAt: string | null
  createdAt: string
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}

interface JourneyAlertResult {
  entries: JourneyAlertEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type AlertPurpose = "HAJJ_OPENING" | "TARGET_SAVINGS"
type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PARTIALLY_FAILED" | "CANCELLED"

interface Campaign {
  id: string
  purpose: AlertPurpose
  status: CampaignStatus
  title: string
  message: string
  emailSubject: string
  emailBody: string
  actionUrl: string | null
  audienceCount: number
  inAppDeliveredCount: number
  pushRequestedCount: number
  emailAcceptedCount: number
  failedCount: number
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
}

type CampaignDraft = {
  purpose: AlertPurpose
  title: string
  message: string
  emailSubject: string
  emailBody: string
  actionUrl: string
  scheduledAt: string
}

const PAGE_SIZE = 20

async function request<T>(path: string, options: RequestInit & { body?: string } = {}): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    cache: "no-store",
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
    ...options,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = typeof data?.message === "string" ? data.message : `Request failed (${response.status}). Please try again.`
    throw new Error(message)
  }
  return response.json()
}

async function fetchJourneyAlerts(page: number, search: string, status: string, purpose: string, signal: AbortSignal): Promise<JourneyAlertResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status, purpose })
  if (search) params.set("search", search)
  return request<JourneyAlertResult>(`journey-alerts?${params}`, { signal })
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function purposeLabel(purpose: AlertPurpose) {
  return purpose === "HAJJ_OPENING" ? "Hajj opening" : "Target Savings"
}

function createDraft(purpose: AlertPurpose): CampaignDraft {
  const isHajj = purpose === "HAJJ_OPENING"
  return {
    purpose,
    title: isHajj ? "Hajj packages are now available" : "Target Savings is now available",
    message: isHajj
      ? "Verified Hajj packages are now available. View current options and compare departures from your city."
      : "Target Savings is now available. Start planning and building towards your journey today.",
    emailSubject: isHajj ? "Hajj packages are now available on UfitGo" : "Target Savings is now available on UfitGo",
    emailBody: isHajj
      ? "Verified Hajj packages are now available on UfitGo. View current options and compare departures from your city."
      : "Target Savings is now available on UfitGo. Start planning and building towards your journey today.",
    actionUrl: isHajj ? "ufitgo://intelligence?type=hajj" : "ufitgo://wallet/target-savings",
    scheduledAt: "",
  }
}

function statusStyle(status: CampaignStatus) {
  if (status === "SENT") return "bg-[#eaf9f3] text-[#0c6b50]"
  if (status === "PARTIALLY_FAILED") return "bg-[#fff4df] text-[#986500]"
  if (status === "SCHEDULED") return "bg-[#e8f3fb] text-[#1e5d8a]"
  if (status === "CANCELLED") return "bg-[#f1f3f2] text-[#68716d]"
  if (status === "SENDING") return "bg-[#f4ebff] text-[#7044a3]"
  return "bg-[#f7f2df] text-[#806000]"
}

export default function JourneyAlertsPage() {
  const can = useCan()
  const allowed = can(["marketing.manage"])
  const canPublish = can(["marketing.manage", "communications.publish"])
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [purpose, setPurpose] = useState("all")
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState<CampaignDraft>(createDraft("HAJJ_OPENING"))
  const [testRecipientEmail, setTestRecipientEmail] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const alertsQuery = useQuery({
    queryKey: ["journey-alerts", page, search, status, purpose],
    queryFn: ({ signal }) => fetchJourneyAlerts(page, search, status, purpose, signal),
    enabled: allowed,
  })
  const campaignsQuery = useQuery({
    queryKey: ["journey-alert-campaigns"],
    queryFn: ({ signal }) => request<Campaign[]>("journey-alerts/campaigns", { signal }),
    enabled: allowed,
  })
  const refreshCampaignData = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["journey-alert-campaigns"] }),
    queryClient.invalidateQueries({ queryKey: ["journey-alerts"] }),
  ])
  const createCampaign = useMutation({
    mutationFn: (body: CampaignDraft) => request<Campaign>("journey-alerts/campaigns", {
      method: "POST",
      body: JSON.stringify({ ...body, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt).toISOString() : undefined }),
    }),
    onSuccess: async (campaign) => {
      setNotice(campaign.status === "SCHEDULED" ? "Campaign scheduled. It will send automatically at the selected time." : "Draft saved. Review it below, then send a test or publish it.")
      setComposerOpen(false)
      await refreshCampaignData()
    },
  })
  const sendCampaign = useMutation({
    mutationFn: (campaignId: string) => request<Campaign>(`journey-alerts/campaigns/${campaignId}/send`, { method: "POST" }),
    onSuccess: async () => {
      setNotice("Campaign sent. Delivery outcomes are shown in campaign history.")
      await refreshCampaignData()
    },
  })
  const cancelCampaign = useMutation({
    mutationFn: (campaignId: string) => request<Campaign>(`journey-alerts/campaigns/${campaignId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setNotice("Campaign cancelled.")
      await refreshCampaignData()
    },
  })
  const testCampaign = useMutation({
    mutationFn: ({ campaignId, recipientEmail }: { campaignId: string; recipientEmail: string }) => request<{ recipientEmail: string }>(`journey-alerts/campaigns/${campaignId}/test`, {
      method: "POST",
      body: JSON.stringify({ recipientEmail }),
    }),
    onSuccess: (result) => setNotice(`Test sent to ${result.recipientEmail}. Check the UfitGo app, push notification, and inbox for that customer account.`),
  })

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  function openComposer(nextPurpose: AlertPurpose) {
    setDraft(createDraft(nextPurpose))
    setComposerOpen(true)
    setNotice(null)
  }

  if (!allowed) return <p role="alert" className="text-sm text-[#a43229]">You do not have permission to view journey alerts.</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#07845f] to-[#0c6b7e] p-6 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><BellRing className="size-6 text-[#ffcf4d]" /><h2 className="font-brand text-xl font-bold">Journey alerts</h2></div>
          <p className="mt-1 text-sm text-white/80">Manage release announcements for Hajj-opening and Target Savings subscribers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => Promise.all([alertsQuery.refetch(), campaignsQuery.refetch()])} disabled={alertsQuery.isFetching || campaignsQuery.isFetching} className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <RefreshCw className={`size-4 ${alertsQuery.isFetching || campaignsQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {canPublish && <Button onClick={() => openComposer("HAJJ_OPENING")} className="bg-[#ffcf4d] text-[#24423a] hover:bg-[#f5bb2a]"><Send className="size-4" /> Announce availability</Button>}
        </div>
      </div>

      {notice && <div role="status" className="flex items-start gap-3 rounded-xl border border-[#b7e3cb] bg-[#edfaf2] px-4 py-3 text-sm text-[#0c6b50]"><BellRing className="mt-0.5 size-4 shrink-0" /><p className="flex-1">{notice}</p><button aria-label="Dismiss message" onClick={() => setNotice(null)} className="rounded p-0.5 hover:bg-[#d6f1e2]"><X className="size-4" /></button></div>}

      {!canPublish && <div role="alert" className="flex gap-3 rounded-xl border border-[#f1dc99] bg-[#fff9e8] px-4 py-3 text-sm text-[#735b10]"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><p>You can view alert activity, but publishing campaigns requires the <strong>communications.publish</strong> permission.</p></div>}

      {composerOpen && (
        <form onSubmit={(event) => { event.preventDefault(); createCampaign.mutate(draft) }} className="space-y-5 rounded-2xl border border-[#b7e3cb] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-base font-bold text-[#36413d]">Availability announcement</h3><p className="mt-1 text-sm text-[#68716d]">Save a draft, schedule a release, send a test to a real UfitGo account, then publish to active subscribers.</p></div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close campaign composer" onClick={() => setComposerOpen(false)}><X className="size-4" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-[#36413d]">Audience
              <AppSelect value={draft.purpose} onValueChange={(value) => setDraft(createDraft(value as AlertPurpose))} options={[{ value: "HAJJ_OPENING", label: "Active Hajj-opening subscribers" }, { value: "TARGET_SAVINGS", label: "Active Target Savings subscribers" }]} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-[#36413d]">Schedule for later <span className="font-normal text-[#68716d]">(optional)</span>
              <Input type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} />
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-[#36413d]">In-app and push title<Input required maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="block space-y-1.5 text-sm font-medium text-[#36413d]">In-app and push message<textarea required maxLength={2000} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} className="min-h-24 w-full rounded-md border border-[#d9dfdc] bg-white px-3 py-2 text-sm outline-none focus:border-[#07845f] focus:ring-2 focus:ring-[#07845f]/20" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-[#36413d]">Email subject<Input required maxLength={200} value={draft.emailSubject} onChange={(event) => setDraft({ ...draft, emailSubject: event.target.value })} /></label>
            <label className="block space-y-1.5 text-sm font-medium text-[#36413d]">App destination URL <span className="font-normal text-[#68716d]">(optional)</span><Input maxLength={512} value={draft.actionUrl} onChange={(event) => setDraft({ ...draft, actionUrl: event.target.value })} /></label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-[#36413d]">Email message<textarea required maxLength={10000} value={draft.emailBody} onChange={(event) => setDraft({ ...draft, emailBody: event.target.value })} className="min-h-32 w-full rounded-md border border-[#d9dfdc] bg-white px-3 py-2 text-sm outline-none focus:border-[#07845f] focus:ring-2 focus:ring-[#07845f]/20" /></label>
          {createCampaign.isError && <p role="alert" className="text-sm text-[#a43229]">{createCampaign.error.message}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>Cancel</Button><Button type="submit" disabled={createCampaign.isPending} className="bg-[#07845f] text-white hover:bg-[#0c6b50]">{createCampaign.isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}{draft.scheduledAt ? "Schedule campaign" : "Save draft"}</Button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-[#d9dfdc] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ef] px-5 py-4"><div><h3 className="text-sm font-bold text-[#36413d]">Campaign history</h3><p className="mt-1 text-xs text-[#68716d]">Test before sending. Publishing delivers a persistent in-app notice, requests push where available, and sends email through Notification Service.</p></div>{canPublish && <Button size="sm" variant="outline" onClick={() => openComposer("TARGET_SAVINGS")}><Mail className="size-4" /> New Target Savings campaign</Button>}</div>
        {campaignsQuery.isPending ? <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-[#68716d]"><Loader2 className="size-5 animate-spin" /> Loading campaigns...</div> : campaignsQuery.isError ? <p role="alert" className="px-5 py-6 text-sm text-[#a43229]">{campaignsQuery.error.message}</p> : campaignsQuery.data?.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[#68716d]">No campaigns have been created yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f7faf9] text-xs text-[#68716d]"><tr>{["Campaign", "Audience", "Delivery", "Status", "Actions"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{campaignsQuery.data?.map((campaign) => <tr key={campaign.id}><td className="min-w-72 px-5 py-4"><p className="font-medium text-[#36413d]">{campaign.title}</p><p className="mt-0.5 text-xs text-[#68716d]">{purposeLabel(campaign.purpose)} · {campaign.scheduledAt ? `Scheduled ${formatDate(campaign.scheduledAt)}` : `Created ${formatDate(campaign.createdAt)}`}</p></td><td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{campaign.audienceCount.toLocaleString()} active subscribers</td><td className="whitespace-nowrap px-5 py-4 text-xs text-[#68716d]"><p>In-app: {campaign.inAppDeliveredCount}</p><p>Push requested: {campaign.pushRequestedCount}</p><p>Email accepted: {campaign.emailAcceptedCount}</p>{campaign.failedCount > 0 && <p className="text-[#a43229]">Failures: {campaign.failedCount}</p>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(campaign.status)}`}>{campaign.status.replace("_", " ")}</span></td><td className="min-w-56 px-5 py-4">{canPublish && (campaign.status === "DRAFT" || campaign.status === "SCHEDULED") ? <div className="space-y-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { const email = testRecipientEmail.trim(); if (email) testCampaign.mutate({ campaignId: campaign.id, recipientEmail: email }) }} disabled={testCampaign.isPending || !testRecipientEmail.trim()}><Mail className="size-3.5" /> Test</Button><Button size="sm" onClick={() => sendCampaign.mutate(campaign.id)} disabled={sendCampaign.isPending} className="bg-[#07845f] text-white hover:bg-[#0c6b50]"><Send className="size-3.5" /> Send now</Button><Button size="sm" variant="ghost" onClick={() => cancelCampaign.mutate(campaign.id)} disabled={cancelCampaign.isPending}>Cancel</Button></div><Input aria-label="Test recipient email" type="email" placeholder="Test customer email" value={testRecipientEmail} onChange={(event) => setTestRecipientEmail(event.target.value)} /></div> : <span className="text-xs text-[#68716d]">{campaign.sentAt ? `Sent ${formatDate(campaign.sentAt)}` : "No actions available"}</span>}</td></tr>)}</tbody></table></div>
        )}
        {(sendCampaign.isError || cancelCampaign.isError || testCampaign.isError) && <p role="alert" className="border-t border-[#f4c7c3] bg-[#fff4f2] px-5 py-3 text-sm text-[#a43229]">{sendCampaign.error?.message || cancelCampaign.error?.message || testCampaign.error?.message}</p>}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 lg:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2"><Input aria-label="Search alerts by customer name or email" type="search" maxLength={254} placeholder="Search name or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><Button type="submit" className="bg-[#07845f] text-white hover:bg-[#0c6b50]"><Search className="size-4" /> Search</Button></form>
          <div className="flex items-center gap-2 sm:w-56"><span className="text-sm text-[#68716d]">Alert</span><AppSelect value={purpose} onValueChange={(value) => { setPurpose(value); setPage(1) }} options={[{ value: "all", label: "All alerts" }, { value: "HAJJ_OPENING", label: "Hajj opening" }, { value: "TARGET_SAVINGS", label: "Target Savings" }]} /></div>
          <div className="flex items-center gap-2 sm:w-52"><span className="text-sm text-[#68716d]">Status</span><AppSelect value={status} onValueChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: "all", label: "All subscribers" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} /></div>
        </div>
        {alertsQuery.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]"><p>{alertsQuery.error.message}</p><Button variant="outline" onClick={() => alertsQuery.refetch()} disabled={alertsQuery.isFetching}>Retry</Button></div>}
        {alertsQuery.isPending ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[#68716d]"><Loader2 className="size-5 animate-spin" /> Loading alert subscribers...</div> : !alertsQuery.isError && alertsQuery.data && <div className="overflow-hidden rounded-xl border border-[#d9dfdc] bg-white shadow-sm"><div className="border-b border-[#edf1ef] px-5 py-4"><h3 className="flex items-center gap-2 text-sm font-bold text-[#36413d]"><Users className="size-4 text-[#07845f]" /> Alert subscribers</h3><p className="mt-1 text-xs text-[#68716d]">{alertsQuery.data.total.toLocaleString()} {alertsQuery.data.total === 1 ? "subscription" : "subscriptions"} · newest activations first.</p></div>{alertsQuery.data.entries.length === 0 ? <p role="status" className="px-5 py-12 text-center text-sm text-[#68716d]">No alert subscriptions match your filters.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f7faf9] text-xs text-[#68716d]"><tr>{["Customer", "Alert", "Phone", "Status", "Activated", "Customer notified"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1ef]">{alertsQuery.data.entries.map((entry) => { const customerName = [entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unnamed customer"; return <tr key={entry.id}><td className="px-5 py-4"><p className="font-medium text-[#36413d]">{customerName}</p><p className="mt-0.5 text-xs text-[#68716d]">{entry.email}</p></td><td className="px-5 py-4 font-medium text-[#36413d]">{purposeLabel(entry.purpose)}</td><td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{entry.phone || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.active ? "bg-[#eaf9f3] text-[#0c6b50]" : "bg-[#f1f3f2] text-[#68716d]"}`}>{entry.active ? "Active" : "Inactive"}</span></td><td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{formatDate(entry.createdAt)}</td><td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{entry.notifiedAt ? formatDate(entry.notifiedAt) : "Not yet notified"}</td></tr> } )}</tbody></table></div>}<PaginationBar page={page} totalPages={alertsQuery.data.totalPages} total={alertsQuery.data.total} limit={PAGE_SIZE} onPageChange={setPage} isFetching={alertsQuery.isFetching} /></div>}
      </section>
    </div>
  )
}
