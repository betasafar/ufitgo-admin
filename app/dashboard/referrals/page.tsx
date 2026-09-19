"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Archive,
  CheckCircle2,
  FileEdit,
  Gift,
  Play,
  Plus,
  ShieldAlert,
  Trophy,
  Wallet,
  X,
  XCircle,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { RowActionsMenu } from "@/components/ui/row-actions-menu"

type Campaign = {
  id: number | string
  name: string
  campaignType: string
  rewardAmount: number
  maxRewardBudget?: number
  maxRewardsPerReferrer?: number
  startsAt?: string
  endsAt?: string
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
}

type LedgerEntry = {
  id: number | string
  userId?: string
  type?: string
  amount: number
  status: "PENDING" | "CONFIRMED" | "REVERSED"
  deviceFlagged?: boolean
  createdAt?: string
}

type CodeStat = {
  code: string
  userId?: string
  confirmedSignups?: number
  confirmedSales?: number
  totalPaid?: number
}

const campaignTypes = [
  { value: "MUTUAL_SIGNUP", label: "Mutual signup bonus", desc: "Both referrer and new user earn a bonus on signup with a code." },
  { value: "PACKAGE_SALE", label: "Package sale bonus", desc: "Referrer earns a bonus when someone they referred pays for a package." },
  { value: "LEAD_GEN", label: "Lead generation bonus", desc: "Referrer earns a bonus for a referred install/signup alone." },
]

const tabs = [
  { id: "campaigns", label: "Campaigns" },
  { id: "ledger", label: "Ledger" },
  { id: "codes", label: "Code performance" },
] as const

const campaignStatusTone: Record<string, string> = {
  DRAFT: "bg-[#f7f9f8] text-[#68716d] border border-[#dfe7e3]",
  PUBLISHED: "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]",
  ARCHIVED: "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]",
}

const ledgerStatusTone: Record<string, string> = {
  PENDING: "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]",
  CONFIRMED: "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]",
  REVERSED: "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]",
}

const emptyCampaignForm = {
  name: "",
  campaignType: "MUTUAL_SIGNUP",
  rewardAmount: "1000",
  maxRewardBudget: "",
  maxRewardsPerReferrer: "",
  startsAt: "",
  endsAt: "",
}

function formatNaira(amount?: number) {
  const numeric = Number(amount ?? 0)
  if (!Number.isFinite(numeric)) return "₦0"
  return `₦${numeric.toLocaleString("en-NG")}`
}

function formatDate(value?: string) {
  if (!value) return "Any"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Any"
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

export default function ReferralsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("campaigns")

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyCampaignForm)
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | number | null>(null)

  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerStatus, setLedgerStatus] = useState("all")
  const [reviewingId, setReviewingId] = useState<string | number | null>(null)

  const [codeStats, setCodeStats] = useState<CodeStat[]>([])
  const [codesLoading, setCodesLoading] = useState(false)

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    try {
      const response = await fetch("/api/admin/referrals/campaigns", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setCampaigns(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadLedger = async (status: string) => {
    setLedgerLoading(true)
    try {
      const params = status !== "all" ? `?status=${status}` : ""
      const response = await fetch(`/api/admin/referrals/ledger${params}`, { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setLedger(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
    } finally {
      setLedgerLoading(false)
    }
  }

  const loadCodeStats = async () => {
    setCodesLoading(true)
    try {
      const response = await fetch("/api/admin/referrals/code-stats", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setCodeStats(Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [])
    } finally {
      setCodesLoading(false)
    }
  }

  useEffect(() => { void loadCampaigns() }, [])
  useEffect(() => {
    if (activeTab === "ledger") void loadLedger(ledgerStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ledgerStatus])
  useEffect(() => {
    if (activeTab === "codes") void loadCodeStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function createCampaign(event: React.FormEvent) {
    event.preventDefault()
    setCreating(true)
    try {
      const response = await fetch("/api/admin/referrals/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          campaignType: form.campaignType,
          rewardAmount: Number(form.rewardAmount),
          maxRewardBudget: form.maxRewardBudget ? Number(form.maxRewardBudget) : undefined,
          maxRewardsPerReferrer: form.maxRewardsPerReferrer ? Number(form.maxRewardsPerReferrer) : undefined,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      })
      if (!response.ok) throw new Error()
      setShowForm(false)
      setForm(emptyCampaignForm)
      await loadCampaigns()
    } catch {
      window.alert("Failed to create campaign.")
    } finally {
      setCreating(false)
    }
  }

  async function setCampaignStatus(id: string | number, status: string) {
    setUpdatingId(id)
    try {
      const response = await fetch(`/api/admin/referrals/campaigns/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error()
      await loadCampaigns()
    } catch {
      window.alert("Failed to update campaign status.")
    } finally {
      setUpdatingId(null)
    }
  }

  async function reviewLedgerEntry(id: string | number, decision: "CONFIRMED" | "REVERSED") {
    setReviewingId(id)
    try {
      const response = await fetch(`/api/admin/referrals/ledger/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      if (!response.ok) throw new Error()
      await loadLedger(ledgerStatus)
    } catch {
      window.alert("Failed to review this ledger entry.")
    } finally {
      setReviewingId(null)
    }
  }

  const summary = useMemo(() => {
    const published = campaigns.filter((c) => c.status === "PUBLISHED").length
    const pendingLedger = ledger.filter((entry) => entry.status === "PENDING").length
    const totalPaid = ledger.filter((entry) => entry.status === "CONFIRMED" && Number(entry.amount) > 0).reduce((sum, entry) => sum + Number(entry.amount), 0)
    return { total: campaigns.length, published, pendingLedger, totalPaid }
  }, [campaigns, ledger])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Growth & marketing</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Referrals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Create refer-and-earn campaigns, review flagged credits, and see which codes perform best.</p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
          <Plus className="size-4" /> New campaign
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Campaigns</span><Gift className="size-4 text-[#07845f]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Published</span><Play className="size-4 text-[#0c6b50]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.published}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pending review</span><ShieldAlert className="size-4 text-[#8a6500]" /></div>
          <p className="mt-4 text-3xl font-bold text-[#17201c]">{summary.pendingLedger}</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Confirmed payouts</span><Wallet className="size-4 text-[#0f74c1]" /></div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatNaira(summary.totalPaid)}</p>
        </div>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">New referral campaign</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X className="size-5 text-[#68716d]" /></button>
          </div>
          <form onSubmit={createCampaign} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Campaign name</label>
              <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Ramadan Signup Bonus" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Type</label>
              <AppSelect value={form.campaignType} onValueChange={(value) => setForm((current) => ({ ...current, campaignType: value }))} options={campaignTypes.map(({ value, label }) => ({ value, label }))} className="w-full sm:w-80" />
              <p className="mt-1 text-xs text-[#9aa39e]">{campaignTypes.find((t) => t.value === form.campaignType)?.desc}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Reward amount (₦)</label>
                <input required type="number" min="0" value={form.rewardAmount} onChange={(event) => setForm((current) => ({ ...current, rewardAmount: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Max rewards / referrer</label>
                <input type="number" min="0" value={form.maxRewardsPerReferrer} onChange={(event) => setForm((current) => ({ ...current, maxRewardsPerReferrer: event.target.value }))} placeholder="Unlimited" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Total budget cap (₦)</label>
              <input type="number" min="0" value={form.maxRewardBudget} onChange={(event) => setForm((current) => ({ ...current, maxRewardBudget: event.target.value }))} placeholder="Unlimited — campaign auto-pauses once hit" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Starts at</label>
                <input type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Ends at</label>
                <input type="date" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            </div>
            <button type="submit" disabled={creating} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
              {creating ? "Creating…" : "Create as draft"}
            </button>
          </form>
        </section>
      )}

      <div className="border-b border-[#d9dfdc]">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${isActive ? "text-[#0d7d5f]" : "text-[#68716d] hover:text-[#17201c]"}`}>
                <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#0d7d5f] ${isActive ? "opacity-100" : "opacity-0"}`} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === "campaigns" && (
        <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                <tr>
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Type</th>
                  <th className="px-5 py-3 font-bold">Reward</th>
                  <th className="px-5 py-3 font-bold">Budget cap</th>
                  <th className="px-5 py-3 font-bold">Window</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {campaignsLoading ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading campaigns…</td></tr>
                ) : campaigns.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">No campaigns yet.</td></tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={String(campaign.id)} className="hover:bg-[#f7faf9]">
                      <td className="px-5 py-4 font-bold text-[#17201c]">{campaign.name}</td>
                      <td className="px-5 py-4 text-[#68716d]">{campaignTypes.find((t) => t.value === campaign.campaignType)?.label || campaign.campaignType}</td>
                      <td className="px-5 py-4 font-bold text-[#0d7d5f]">{formatNaira(campaign.rewardAmount)}</td>
                      <td className="px-5 py-4 text-[#68716d]">{campaign.maxRewardBudget ? formatNaira(campaign.maxRewardBudget) : "—"}</td>
                      <td className="px-5 py-4 text-xs text-[#68716d]">{formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}</td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${campaignStatusTone[campaign.status]}`}>{campaign.status}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <RowActionsMenu
                            actions={[
                              ...(campaign.status !== "PUBLISHED" ? [{ label: "Publish campaign", icon: <Play className="size-4" />, onClick: () => void setCampaignStatus(campaign.id, "PUBLISHED"), disabled: updatingId === campaign.id }] : []),
                              ...(campaign.status !== "DRAFT" ? [{ label: "Move to draft", icon: <FileEdit className="size-4" />, onClick: () => void setCampaignStatus(campaign.id, "DRAFT"), disabled: updatingId === campaign.id }] : []),
                              ...(campaign.status !== "ARCHIVED" ? [{ label: "Archive campaign", icon: <Archive className="size-4" />, onClick: () => void setCampaignStatus(campaign.id, "ARCHIVED"), disabled: updatingId === campaign.id, destructive: true }] : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "ledger" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#68716d]">Every earned/redeemed referral credit. Device-flagged or budget-capped entries stay pending until reviewed.</p>
            <AppSelect
              value={ledgerStatus}
              onValueChange={setLedgerStatus}
              className="w-44"
              options={[
                { value: "all", label: "All statuses" },
                { value: "PENDING", label: "Pending" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "REVERSED", label: "Reversed" },
              ]}
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                  <tr>
                    <th className="px-5 py-3 font-bold">User</th>
                    <th className="px-5 py-3 font-bold">Type</th>
                    <th className="px-5 py-3 font-bold">Amount</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Flags</th>
                    <th className="px-5 py-3 font-bold">When</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {ledgerLoading ? (
                    <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading ledger…</td></tr>
                  ) : ledger.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">No ledger entries yet.</td></tr>
                  ) : (
                    ledger.map((entry) => (
                      <tr key={String(entry.id)} className="hover:bg-[#f7faf9]">
                        <td className="px-5 py-4 font-mono text-xs text-[#68716d]">{entry.userId?.slice(0, 8) || "—"}</td>
                        <td className="px-5 py-4 text-[#68716d]">{entry.type || "—"}</td>
                        <td className={`px-5 py-4 font-bold ${Number(entry.amount) < 0 ? "text-[#a43229]" : "text-[#0c6b50]"}`}>{formatNaira(entry.amount)}</td>
                        <td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${ledgerStatusTone[entry.status]}`}>{entry.status}</span></td>
                        <td className="px-5 py-4">{entry.deviceFlagged && <span className="inline-flex items-center gap-1 text-xs font-bold text-[#a43229]"><ShieldAlert className="size-3.5" /> Device reuse</span>}</td>
                        <td className="px-5 py-4 text-xs text-[#68716d]">{entry.createdAt ? new Date(entry.createdAt).toLocaleString("en-NG") : "—"}</td>
                        <td className="px-5 py-4">
                          {entry.status === "PENDING" && (
                            <div className="flex justify-end gap-2">
                              <button type="button" disabled={reviewingId === entry.id} onClick={() => void reviewLedgerEntry(entry.id, "CONFIRMED")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-3 py-1.5 text-xs font-bold text-[#0c6b50] hover:bg-[#dcf3e9] disabled:opacity-50"><CheckCircle2 className="size-3.5" /> Confirm</button>
                              <button type="button" disabled={reviewingId === entry.id} onClick={() => void reviewLedgerEntry(entry.id, "REVERSED")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#f4d0ca] bg-[#fff0ee] px-3 py-1.5 text-xs font-bold text-[#a43229] hover:bg-[#fde1dd] disabled:opacity-50"><XCircle className="size-3.5" /> Reverse</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === "codes" && (
        <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#edf1ef] px-5 py-4">
            <Trophy className="size-4 text-[#0d7d5f]" />
            <h2 className="font-brand text-lg font-bold text-[#17201c]">Top performing referral codes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                <tr>
                  <th className="px-5 py-3 font-bold">Code</th>
                  <th className="px-5 py-3 font-bold">User</th>
                  <th className="px-5 py-3 font-bold">Confirmed signups</th>
                  <th className="px-5 py-3 font-bold">Confirmed sales</th>
                  <th className="px-5 py-3 font-bold">Total paid out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {codesLoading ? (
                  <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading code performance…</td></tr>
                ) : codeStats.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-[#7b8580]">No confirmed referral activity yet.</td></tr>
                ) : (
                  [...codeStats].sort((a, b) => Number(b.totalPaid || 0) - Number(a.totalPaid || 0)).map((stat) => (
                    <tr key={stat.code} className="hover:bg-[#f7faf9]">
                      <td className="px-5 py-4 font-mono font-bold text-[#17201c]">{stat.code}</td>
                      <td className="px-5 py-4 font-mono text-xs text-[#68716d]">{stat.userId?.slice(0, 8) || "—"}</td>
                      <td className="px-5 py-4 text-[#68716d]">{stat.confirmedSignups ?? 0}</td>
                      <td className="px-5 py-4 text-[#68716d]">{stat.confirmedSales ?? 0}</td>
                      <td className="px-5 py-4 font-bold text-[#0d7d5f]">{formatNaira(stat.totalPaid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
