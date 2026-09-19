"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Banknote,
  History,
  ListTree,
  Loader2,
  Percent,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

type CommissionConfig = {
  id: number
  name?: string
  type: "PERCENTAGE" | "FIXED_AMOUNT"
  value: number
  targetLevel: "PLATFORM" | "OPERATOR" | "PACKAGE" | "ADDON"
  targetId?: string
  collectionStage: string
  pspFeeBearer: "PLATFORM" | "OPERATOR"
  isActive: boolean
}

type CommissionTransaction = {
  id: number
  bookingId: number
  paymentReference: string
  paymentStage: string
  commissionCollected: number
  ufitgoSettlement: number
  operatorSettlement: number
  pspFeeAmount: number
  createdAt: string
}

const tabs = [
  { id: "agreements", label: "Active agreements", icon: ListTree },
  { id: "audit", label: "Audit trail", icon: History },
] as const

const targetLevelOptions = [
  { value: "PLATFORM", label: "Platform default" },
  { value: "OPERATOR", label: "Specific operator" },
  { value: "PACKAGE", label: "Specific package" },
  { value: "ADDON", label: "Specific add-on" },
]

const commissionTypeOptions = [
  { value: "PERCENTAGE", label: "Percentage (%)" },
  { value: "FIXED_AMOUNT", label: "Fixed amount (₦)" },
]

const collectionStageOptions = [
  { value: "SPLIT_ACROSS_STAGES", label: "Split across stages (50% initial, 50% final)" },
  { value: "INITIAL_PAYMENT", label: "100% on initial payment" },
  { value: "FINAL_PAYMENT", label: "100% on final payment" },
  { value: "REGISTRATION", label: "On registration" },
]

const pspFeeBearerOptions = [
  { value: "PLATFORM", label: "Platform (UfitGo absorbs fee)" },
  { value: "OPERATOR", label: "Operator (deducted from settlement)" },
]

const emptyForm = {
  name: "",
  type: "PERCENTAGE" as CommissionConfig["type"],
  value: "10",
  targetLevel: "PLATFORM" as CommissionConfig["targetLevel"],
  targetId: "",
  collectionStage: "SPLIT_ACROSS_STAGES",
  pspFeeBearer: "PLATFORM" as CommissionConfig["pspFeeBearer"],
}

function formatNaira(amount?: number) {
  const numeric = Number(amount ?? 0)
  return `₦${numeric.toLocaleString("en-NG")}`
}

function formatValue(config: CommissionConfig) {
  return config.type === "PERCENTAGE" ? `${config.value}%` : formatNaira(config.value)
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Request failed")
  return payload as T
}

export default function CommissionsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("agreements")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ["commissions"],
    queryFn: () => fetchJson<CommissionConfig[]>("/api/admin/commissions"),
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["commission-transactions"],
    queryFn: () => fetchJson<CommissionTransaction[]>("/api/admin/commissions/transactions"),
    enabled: activeTab === "audit",
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { id: number | null; data: typeof emptyForm }) => {
      const body = { ...payload.data, value: Number(payload.data.value) }
      const url = payload.id ? `/api/admin/commissions/${payload.id}` : "/api/admin/commissions"
      return fetch(url, {
        method: payload.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (response) => {
        const result = await response.json().catch(() => null)
        if (!response.ok) throw new Error(result?.message || "Unable to save agreement")
        return result
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["commissions"] })
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
    },
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function openEdit(config: CommissionConfig) {
    setEditingId(config.id)
    setForm({
      name: config.name || "",
      type: config.type,
      value: String(config.value),
      targetLevel: config.targetLevel,
      targetId: config.targetId || "",
      collectionStage: config.collectionStage,
      pspFeeBearer: config.pspFeeBearer,
    })
    setShowForm(true)
  }

  function submitForm(event: React.FormEvent) {
    event.preventDefault()
    saveMutation.mutate({ id: editingId, data: form })
  }

  const summary = useMemo(() => {
    const umrahRule = configs?.find((c) => c.name?.toLowerCase().includes("umrah"))
    const hajjRule = configs?.find((c) => c.name?.toLowerCase().includes("hajj"))
    const defaultModel = umrahRule || hajjRule || configs?.[0]
    return {
      umrahValue: umrahRule ? formatValue(umrahRule) : "Not set",
      hajjValue: hajjRule ? formatValue(hajjRule) : "Not set",
      pspBearer: defaultModel?.pspFeeBearer || "PLATFORM",
      overrides: configs?.filter((c) => c.targetLevel !== "PLATFORM").length || 0,
    }
  }, [configs])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Finance</p>
          <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Commissions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Configure global, operator-specific, and package-specific commission splits, and audit every settled transaction.</p>
        </div>
        {activeTab === "agreements" && (
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b6b51]">
            <Plus className="size-4" /> New agreement
          </button>
        )}
      </header>

      {showForm && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-brand text-lg font-bold text-[#17201c]">{editingId ? "Edit commercial agreement" : "New commercial agreement"}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Close"><X className="size-5 text-[#68716d]" /></button>
          </div>
          <form onSubmit={submitForm} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Rule name / tag</label>
              <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Standard Umrah Flat" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Target level</label>
              <AppSelect value={form.targetLevel} onValueChange={(value) => setForm((current) => ({ ...current, targetLevel: value as CommissionConfig["targetLevel"] }))} options={targetLevelOptions} />
            </div>
            {form.targetLevel !== "PLATFORM" && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">
                  {form.targetLevel === "OPERATOR" ? "Operator ID" : form.targetLevel === "PACKAGE" ? "Package ID" : "Add-on ID"}
                </label>
                <input required value={form.targetId} onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Commission type</label>
              <AppSelect value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as CommissionConfig["type"] }))} options={commissionTypeOptions} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Value</label>
              <input required type="number" min="0" step={form.type === "PERCENTAGE" ? "0.1" : "1"} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">Collection stage</label>
              <AppSelect value={form.collectionStage} onValueChange={(value) => setForm((current) => ({ ...current, collectionStage: value }))} options={collectionStageOptions} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.06em] text-[#78817d]">PSP fee bearer</label>
              <AppSelect value={form.pspFeeBearer} onValueChange={(value) => setForm((current) => ({ ...current, pspFeeBearer: value as CommissionConfig["pspFeeBearer"] }))} options={pspFeeBearerOptions} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white px-5 text-sm font-bold text-[#36413d] hover:bg-[#f7f9f8]">Cancel</button>
              <button type="submit" disabled={saveMutation.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {editingId ? "Update agreement" : "Save agreement"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="border-b border-[#d9dfdc]">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${isActive ? "text-[#0d7d5f]" : "text-[#68716d] hover:text-[#17201c]"}`}>
                <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#0d7d5f] ${isActive ? "opacity-100" : "opacity-0"}`} />
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === "agreements" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center gap-2"><Percent className="size-4 text-[#0f74c1]" /><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Default package models</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#f7faf9] p-3"><p className="text-xs text-[#7b8580]">Umrah fallback</p><p className="mt-1 text-base font-bold text-[#17201c]">{summary.umrahValue}</p></div>
                <div className="rounded-lg bg-[#f7faf9] p-3"><p className="text-xs text-[#7b8580]">Hajj fallback</p><p className="mt-1 text-base font-bold text-[#17201c]">{summary.hajjValue}</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center gap-2"><Banknote className="size-4 text-[#0c6b50]" /><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">PSP fee bearer</span></div>
              <p className="mt-3 text-xl font-bold capitalize text-[#17201c]">{summary.pspBearer.toLowerCase()}</p>
              <p className="mt-1 text-xs text-[#7b8580]">{summary.pspBearer === "PLATFORM" ? "UfitGo absorbs Paystack fees" : "Operator absorbs Paystack fees"}</p>
            </div>
            <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#5b3fb0]" /><span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#78817d]">Active overrides</span></div>
              <p className="mt-3 text-2xl font-bold text-[#17201c]">{summary.overrides}</p>
              <p className="mt-1 text-xs text-[#7b8580]">Custom negotiated rates</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                  <tr>
                    <th className="px-5 py-3 font-bold">Rule name</th>
                    <th className="px-5 py-3 font-bold">Target level</th>
                    <th className="px-5 py-3 font-bold">Value</th>
                    <th className="px-5 py-3 font-bold">Collection stage</th>
                    <th className="px-5 py-3 font-bold">PSP bearer</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {configsLoading ? (
                    <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading configurations…</td></tr>
                  ) : (configs || []).length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">No custom commissions configured.</td></tr>
                  ) : (
                    configs!.map((config) => (
                      <tr key={config.id} className="hover:bg-[#f7faf9]">
                        <td className="px-5 py-4 font-bold text-[#17201c]">{config.name || "Unnamed rule"}</td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-[#36413d]">{config.targetLevel}</span>
                          {config.targetId && <span className="mt-0.5 block text-xs text-[#9aa39e]">ID: {config.targetId}</span>}
                        </td>
                        <td className="px-5 py-4 font-bold text-[#0d7d5f]">{formatValue(config)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f7f9f8] px-2.5 py-1 text-xs font-bold text-[#36413d]"><Settings2 className="size-3.5" /> {config.collectionStage.replaceAll("_", " ")}</span>
                        </td>
                        <td className="px-5 py-4 text-[#68716d]">{config.pspFeeBearer}</td>
                        <td className="px-5 py-4">
                          {config.isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0c6b50]"><ShieldCheck className="size-3.5" /> Active</span>
                          ) : (
                            <span className="text-xs font-bold text-[#9aa39e]">Inactive</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" onClick={() => openEdit(config)} className="rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#0d7d5f] hover:bg-[#eaf9f3]">Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[#f7f9f8] text-[10px] uppercase tracking-[0.12em] text-[#7b8580]">
                <tr>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Booking ref</th>
                  <th className="px-5 py-3 font-bold">Stage</th>
                  <th className="px-5 py-3 font-bold">Collected</th>
                  <th className="px-5 py-3 font-bold">UfitGo split</th>
                  <th className="px-5 py-3 font-bold">Operator split</th>
                  <th className="px-5 py-3 font-bold">PSP fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ef]">
                {transactionsLoading ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">Loading audit trail…</td></tr>
                ) : (transactions || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-[#7b8580]">No commission transactions found.</td></tr>
                ) : (
                  transactions!.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#f7faf9]">
                      <td className="px-5 py-4 text-xs text-[#68716d]">{new Date(tx.createdAt).toLocaleString("en-NG", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#17201c]">BKG-{tx.bookingId}</span>
                        <span className="mt-0.5 block truncate text-xs font-mono text-[#9aa39e]">{tx.paymentReference}</span>
                      </td>
                      <td className="px-5 py-4 text-[#68716d]">{tx.paymentStage.replaceAll("_", " ")}</td>
                      <td className="px-5 py-4 font-bold text-[#17201c]">{formatNaira(tx.commissionCollected)}</td>
                      <td className="px-5 py-4 font-semibold text-[#0c6b50]">{formatNaira(tx.ufitgoSettlement)}</td>
                      <td className="px-5 py-4 text-[#36413d]">{formatNaira(tx.operatorSettlement)}</td>
                      <td className="px-5 py-4 text-xs text-[#9aa39e]">{formatNaira(tx.pspFeeAmount)}</td>
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
