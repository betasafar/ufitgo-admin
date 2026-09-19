"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Activity,
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"
import { PaginationBar } from "@/components/ui/pagination-bar"

type PaymentClient = { id: string; name: string; webhook_url?: string }
type PaymentTransaction = {
  id: string
  client_id?: string
  client_reference?: string
  provider_ref?: string
  amount: number
  provider?: string
  status: "success" | "pending" | "failed" | string
  created_at: string
  booking_id?: string
  payment_stage?: string
  payment_stages?: string[]
}
type GatewayStatus = { name: string; status: string; uptime: number }
type PaymentMetrics = { settled: number; pending: number; failed: number; gateways: GatewayStatus[] }

const durationOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]

const PAGE_SIZE = 10

function formatCompactNaira(amount: number) {
  const value = Number(amount || 0)
  if (value >= 1_000_000_000) return `₦${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}K`
  return `₦${value.toLocaleString("en-NG")}`
}

function statusTone(status: string) {
  if (status === "success") return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  if (status === "pending") return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
  return "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]"
}

function gatewayTone(status: string) {
  if (status === "Operational") return "bg-[#eaf9f3] text-[#0c6b50] border border-[#cfeee0]"
  if (status === "Degraded") return "bg-[#fff6dc] text-[#8a6500] border border-[#f1e0a9]"
  return "bg-[#fff0ee] text-[#a43229] border border-[#f4d0ca]"
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Request failed")
  return payload as T
}

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const [duration, setDuration] = useState("month")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", webhook_url: "" })
  const [generated, setGenerated] = useState<{ api_key: string; webhook_secret: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: clients } = useQuery({
    queryKey: ["payment-clients"],
    queryFn: () => fetchJson<PaymentClient[]>("/api/admin/payments/clients"),
  })

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["payment-transactions"],
    queryFn: () => fetchJson<PaymentTransaction[]>("/api/admin/payments/transactions"),
    refetchInterval: 15_000,
  })

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["payment-metrics", duration],
    queryFn: () => fetchJson<PaymentMetrics>(`/api/admin/payments/metrics?duration=${duration}`),
    refetchInterval: 30_000,
  })

  const createClient = useMutation({
    mutationFn: (payload: { name: string; webhook_url: string }) =>
      fetch("/api/admin/payments/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.message || "Unable to register product")
        return body
      }),
    onSuccess: (result) => {
      setGenerated({ api_key: result.api_key, webhook_secret: result.webhook_secret })
      void queryClient.invalidateQueries({ queryKey: ["payment-clients"] })
    },
  })

  const stats = useMemo(() => {
    const settled = metrics?.settled ?? 0
    const pending = metrics?.pending ?? 0
    const failed = metrics?.failed ?? 0
    const total = settled + pending + failed
    const successRate = total > 0 ? ((settled / total) * 100).toFixed(1) : "0.0"
    return { settled, pending, failed, successRate, gateways: metrics?.gateways ?? [] }
  }, [metrics])

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase()
    const sorted = [...(transactions || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return sorted.filter((tx) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false
      if (!term) return true
      return (
        tx.client_reference?.toLowerCase().includes(term) ||
        tx.provider_ref?.toLowerCase().includes(term) ||
        tx.id?.toLowerCase().includes(term) ||
        tx.booking_id?.toLowerCase().includes(term) ||
        tx.payment_stage?.toLowerCase().includes(term)
      )
    })
  }, [transactions, search, statusFilter])

  const totalPages = Math.max(Math.ceil(filteredTransactions.length / PAGE_SIZE), 1)
  const pagedTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const recentFailures = (transactions || []).filter((tx) => tx.status === "failed").slice(0, 5)

  function clientName(clientId?: string) {
    return clients?.find((client) => client.id === clientId)?.name || "Unknown product"
  }

  function copyValue(label: string, value: string) {
    void navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1500)
  }

  function submitRegistration(event: React.FormEvent) {
    event.preventDefault()
    createClient.mutate(form)
  }

  function closeForm() {
    setShowForm(false)
    setGenerated(null)
    setForm({ name: "", webhook_url: "" })
  }

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Finance</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Payment platform</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Monitor live transaction volume, gateway health, and manage the products issuing payments through UfitGo.</p>
        </div>
        <div className="flex items-center gap-3">
          <AppSelect value={duration} onValueChange={setDuration} options={durationOptions} className="w-40" />
          <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
            <Plus className="size-4" /> Register product
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Settled revenue</span><ShieldCheck className="size-4 text-[#0c6b50]" /></div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCompactNaira(stats.settled)}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Successfully processed</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Pending volume</span><RefreshCw className="size-4 text-[#8a6500]" /></div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCompactNaira(stats.pending)}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Awaiting confirmation</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Failed revenue</span><AlertCircle className="size-4 text-[#a43229]" /></div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{formatCompactNaira(stats.failed)}</p>
          <p className="mt-1 text-xs text-[#7b8580]">Lost or declined</p>
        </div>
        <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Success rate</span><Activity className="size-4 text-[#0f74c1]" /></div>
          <p className="mt-4 text-2xl font-bold text-[#17201c]">{stats.successRate}%</p>
          <p className="mt-1 text-xs text-[#7b8580]">Of total processed volume</p>
        </div>
      </div>

      {showForm && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-brand text-lg font-bold text-[#17201c]">{generated ? "Product registered" : "Register new product"}</h2>
              <p className="mt-1 text-sm text-[#68716d]">{generated ? "Save these credentials now — the secret will not be shown again." : "Issue a unique identity and secure keys for an internal or external product."}</p>
            </div>
            <button type="button" onClick={closeForm} aria-label="Close"><X className="size-5 text-[#68716d]" /></button>
          </div>

          {generated ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-[#f4d0ca] bg-[#fff0ee] px-4 py-2.5 text-xs font-bold text-[#a43229]">This secret is shown only once. Store it securely before closing this panel.</div>
              {[{ label: "API key", value: generated.api_key }, { label: "Webhook secret", value: generated.webhook_secret }].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#dbe2de] bg-[#f7faf9] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">{item.label}</p>
                    <p className="truncate font-mono text-sm text-[#17201c]">{item.value}</p>
                  </div>
                  <button type="button" onClick={() => copyValue(item.label, item.value)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#36413d] hover:bg-[#f7f9f8]">
                    {copied === item.label ? <Check className="size-3.5 text-[#0c6b50]" /> : <Copy className="size-3.5" />} {copied === item.label ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
              <button type="button" onClick={closeForm} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51]">Done</button>
            </div>
          ) : (
            <form onSubmit={submitRegistration} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Product name</label>
                <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Website checkout" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Webhook URL (optional)</label>
                <input type="url" value={form.webhook_url} onChange={(event) => setForm((current) => ({ ...current, webhook_url: event.target.value }))} placeholder="https://…" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={createClient.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                  {createClient.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Generate credentials
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#17201c]">
                <RefreshCw className="size-4 text-[#0d7d5f]" /> Live monitoring
                <button type="button" onClick={() => void refetchTransactions()} className="ml-1 text-xs font-bold text-[#0d7d5f] hover:underline">Refresh</button>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#7b8580]" />
                  <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search reference…" className="h-10 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] pl-9 pr-3 text-sm outline-none focus:border-[#0d7d5f]" />
                </div>
                <AppSelect
                  value={statusFilter}
                  onValueChange={(value) => { setStatusFilter(value); setPage(1) }}
                  className="w-40"
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "success", label: "Success" },
                    { value: "pending", label: "Pending" },
                    { value: "failed", label: "Failed" },
                  ]}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dbe2de] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-left text-sm">
                <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                  <tr>
                    <th className="px-5 py-3 font-bold">Product</th>
                    <th className="px-5 py-3 font-bold">Booking / stage</th>
                    <th className="px-5 py-3 font-bold">Reference</th>
                    <th className="px-5 py-3 font-bold">Amount</th>
                    <th className="px-5 py-3 font-bold">Provider</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {transactionsLoading ? (
                    <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading transactions…</td></tr>
                  ) : pagedTransactions.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#7b8580]">No transactions found.</td></tr>
                  ) : (
                    pagedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#f7faf9]">
                        <td className="px-5 py-4 font-semibold text-[#17201c]">{clientName(tx.client_id)}</td>
                        <td className="px-5 py-4"><span className="font-semibold text-[#17201c]">{tx.booking_id ? `BKG-${tx.booking_id}` : "—"}</span><span className="mt-1 block text-xs capitalize text-[#68716d]">{(tx.payment_stage || tx.payment_stages?.[0] || "Unclassified").replaceAll("_", " ")}</span></td>
                        <td className="px-5 py-4 font-mono text-xs text-[#68716d]">{tx.client_reference || "—"}</td>
                        <td className="px-5 py-4 font-bold text-[#17201c]">₦{Number(tx.amount).toLocaleString("en-NG")}</td>
                        <td className="px-5 py-4 text-xs font-bold uppercase tracking-[0.06em] text-[#68716d]">{tx.provider || "—"}</td>
                        <td className="px-5 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${statusTone(tx.status)}`}>{tx.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar page={page} totalPages={totalPages} total={filteredTransactions.length} limit={PAGE_SIZE} onPageChange={setPage} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
            <h2 className="font-brand flex items-center gap-2 text-lg font-bold text-[#a43229]"><AlertCircle className="size-4" /> Action alerts</h2>
            <div className="mt-4 space-y-3">
              {recentFailures.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#7b8580]">No recent failures.</p>
              ) : (
                recentFailures.map((tx) => (
                  <div key={tx.id} className="rounded-xl border border-[#f4d0ca] bg-[#fff0ee] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#a43229]">Failed payment</span>
                      <span className="text-xs text-[#9c6a63]">{new Date(tx.created_at).toLocaleTimeString("en-NG")}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-[#17201c]">₦{Number(tx.amount).toLocaleString("en-NG")}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-[#9c6a63]">Ref: {tx.client_reference || "—"}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-brand text-lg font-bold text-[#17201c]">Provider status</h2>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0d7d5f]"><RefreshCw className="size-3 animate-spin" /> Live</span>
            </div>
            <div className="mt-4 space-y-3">
              {metricsLoading ? (
                <p className="py-6 text-center text-sm text-[#7b8580]">Checking providers…</p>
              ) : stats.gateways.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#7b8580]">No gateway data available.</p>
              ) : (
                stats.gateways.map((gateway) => (
                  <div key={gateway.name} className="rounded-xl border border-[#dbe2de] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold capitalize text-[#17201c]">{gateway.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${gatewayTone(gateway.status)}`}>{gateway.status}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#edf1ef]">
                      <div className={`h-full rounded-full ${gateway.uptime > 95 ? "bg-[#0d7d5f]" : gateway.uptime > 80 ? "bg-[#8a6500]" : "bg-[#a43229]"}`} style={{ width: `${gateway.uptime}%` }} />
                    </div>
                    <p className="mt-1 text-right font-mono text-[11px] text-[#9aa39e]">{gateway.uptime}% uptime</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
