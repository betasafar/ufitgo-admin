"use client"

import { useEffect, useState } from "react"
import { Building2, CheckCircle2, Database, Loader2, PauseCircle, PlayCircle, Shuffle } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type ProviderHealthSnapshot = {
  provider: string
  displayName?: string
  state: string
  manualOverride?: boolean
  isPrimary?: boolean
  isFallback?: boolean
  consecutiveFailures?: number
  lastLatencyMs?: number
}

type Account = {
  id: string
  accountNumber?: string
  accountName?: string
  provider?: string
  bankName?: string
  activeTier?: number
  status?: string
  createdAt?: string
}

const BANK_DESCRIPTIONS: Record<string, { title: string; subtitle: string; prefix: string }> = {
  providus: {
    title: "Providus Bank (Xpress Wallet)",
    subtitle: "Direct Providus NUBAN virtual accounts · Recommended primary bank",
    prefix: "96xxxxxxxx",
  },
  paystack: {
    title: "Paystack-Titan",
    subtitle: "Paystack Dedicated Virtual Accounts (Titan Trust Bank)",
    prefix: "98xxxxxxxx",
  },
  fcmb: {
    title: "FCMB MFB",
    subtitle: "FCMB Microfinance Bank Tiered Wallet Accounts",
    prefix: "99xxxxxxxx",
  },
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

export default function TreasuryProvidersPage() {
  const [providers, setProviders] = useState<ProviderHealthSnapshot[]>([])
  const [routingStrategy, setRoutingStrategy] = useState<"primary_fallback" | "round_robin">("primary_fallback")
  const [primaryProvider, setPrimaryProvider] = useState<string>("providus")
  const [fallbackProvider, setFallbackProvider] = useState<string>("paystack")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null)
  const [updatingPrimary, setUpdatingPrimary] = useState<string | null>(null)
  const [updatingStrategy, setUpdatingStrategy] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const applyHealthPayload = (healthPayload: any) => {
    if (!healthPayload) return
    if (Array.isArray(healthPayload.providers)) {
      setProviders(healthPayload.providers)
    }
    if (healthPayload.routingStrategy) {
      setRoutingStrategy(
        healthPayload.routingStrategy === "round_robin" ? "round_robin" : "primary_fallback"
      )
    }
    if (healthPayload.primaryProvider) {
      setPrimaryProvider(String(healthPayload.primaryProvider).toLowerCase())
    }
    if (healthPayload.fallbackProvider) {
      setFallbackProvider(String(healthPayload.fallbackProvider).toLowerCase())
    }
  }

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [healthResponse, accountsResponse] = await Promise.all([
        fetch("/api/admin/fcmb-diagnostics/providers/health", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/accounts", { cache: "no-store" }).catch(() => null),
      ])
      const healthPayload = healthResponse ? await healthResponse.json().catch(() => null) : null
      const accountsPayload = accountsResponse ? await accountsResponse.json().catch(() => null) : null

      if (healthResponse && !healthResponse.ok) {
        setError(healthPayload?.message || "Unable to load bank provider settings.")
      } else {
        applyHealthPayload(healthPayload)
      }

      if (Array.isArray(accountsPayload?.accounts)) {
        setAccounts(accountsPayload.accounts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load provider health & account mappings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const selectPrimaryBank = async (providerName: string) => {
    const clean = providerName.toLowerCase()
    setUpdatingPrimary(clean)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/providers/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy: "primary_fallback",
          primaryProvider: clean,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Failed to switch primary bank.")
      applyHealthPayload(payload)
      const label = BANK_DESCRIPTIONS[clean]?.title || clean.toUpperCase()
      setNotice(`${label} is now set as the Primary Bank for all new customer accounts.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to switch primary bank.")
    } finally {
      setUpdatingPrimary(null)
    }
  }

  const toggleProviderState = async (providerName: string, nextState: "HEALTHY" | "UNAVAILABLE") => {
    setUpdatingProvider(providerName)
    setError("")
    setNotice("")
    try {
      const response = await fetch(`/api/admin/fcmb-diagnostics/providers/${encodeURIComponent(providerName)}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: nextState,
          reason: nextState === "UNAVAILABLE" ? "Manual admin pause" : "Manual admin restore to active",
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Failed to update provider state.")
      applyHealthPayload(payload)
      setNotice(
        nextState === "UNAVAILABLE"
          ? `${providerName.toUpperCase()} has been paused. New accounts will automatically route to your active bank.`
          : `${providerName.toUpperCase()} is now active again.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update provider state.")
    } finally {
      setUpdatingProvider(null)
    }
  }

  const changeRoutingStrategy = async (strategy: "round_robin" | "primary_fallback") => {
    setUpdatingStrategy(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/providers/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Failed to update routing mode.")
      applyHealthPayload(payload)
      setNotice(
        strategy === "primary_fallback"
          ? `Switched to Single Primary Bank mode (${primaryProvider.toUpperCase()}).`
          : "Switched to 50/50 Split mode across all active banks."
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update routing strategy.")
    } finally {
      setUpdatingStrategy(false)
    }
  }

  const backfillAccounts = async () => {
    setBackfilling(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/backfill-accounts", { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Account backfill failed.")
      setNotice(`Backfill complete: ${payload?.mapped ?? 0} of ${payload?.scanned ?? 0} accounts mapped.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account backfill failed.")
    } finally {
      setBackfilling(false)
    }
  }

  const providerList: ProviderHealthSnapshot[] =
    providers.length > 0
      ? providers
      : [
          { provider: "providus", state: "HEALTHY", isPrimary: primaryProvider === "providus" },
          { provider: "paystack", state: "HEALTHY", isPrimary: primaryProvider === "paystack" },
          { provider: "fcmb", state: "HEALTHY", isPrimary: primaryProvider === "fcmb" },
        ]

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <TreasurySubnav
        title="Partner Bank Switcher & Virtual Accounts"
        subtitle="Choose which partner bank issues new customer virtual accounts (Providus Bank, Paystack-Titan, or FCMB) and pause any bank during downtime."
        loading={loading}
        onRefresh={() => void load()}
      />

      {notice && (
        <div className="rounded-lg border border-[#a9e6ca] bg-[#eaf9f0] p-3.5 text-sm font-semibold text-[#13633c]">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#f1c4bd] bg-[#fff0ee] p-3.5 text-sm font-semibold text-[#a83b31]">
          {error}
        </div>
      )}

      {/* Step 1: Clear Primary Bank Selector */}
      <section className="rounded-2xl border border-[#d7e2dc] bg-white p-6 shadow-[0_10px_30px_rgba(20,55,40,0.05)]">
        <div className="flex flex-col gap-4 border-b border-[#e5ede8] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f6ef] text-[#07845f]">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#17201c]">
                1. Active Bank for New Customer Accounts
              </h2>
              <p className="mt-0.5 text-sm text-[#63736b]">
                Click <strong>&ldquo;Make Primary Bank&rdquo;</strong> on any card below to route all new KYC account openings to that bank.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f4f8f6] p-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-[#5c6d64]">
              <Shuffle className="size-3.5" /> Mode:
            </span>
            <button
              type="button"
              disabled={updatingStrategy}
              onClick={() => void changeRoutingStrategy("primary_fallback")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                routingStrategy === "primary_fallback"
                  ? "bg-[#07845f] text-white shadow-sm"
                  : "text-[#204236] hover:bg-white"
              }`}
            >
              Single Primary Bank (Recommended)
            </button>
            <button
              type="button"
              disabled={updatingStrategy}
              onClick={() => void changeRoutingStrategy("round_robin")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                routingStrategy === "round_robin"
                  ? "bg-[#07845f] text-white shadow-sm"
                  : "text-[#204236] hover:bg-white"
              }`}
            >
              Split 50/50 Across Active Banks
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {providerList.map((prov) => {
            const key = prov.provider.toLowerCase()
            const meta = BANK_DESCRIPTIONS[key] || {
              title: prov.displayName || prov.provider.toUpperCase(),
              subtitle: "Partner Virtual Account Provider",
              prefix: "NUBAN",
            }
            const isHealthy = prov.state === "HEALTHY" || prov.state === "RECOVERY"
            const isPrimary = primaryProvider === key && routingStrategy === "primary_fallback"
            const isFallback = fallbackProvider === key && routingStrategy === "primary_fallback" && !isPrimary
            const isBusyState = updatingProvider === prov.provider
            const isBusyPrimary = updatingPrimary === key

            return (
              <div
                key={prov.provider}
                className={`flex flex-col justify-between rounded-2xl border-2 p-5 transition ${
                  isPrimary
                    ? "border-[#07845f] bg-[#f3fbf7] shadow-[0_8px_24px_rgba(7,132,95,0.08)]"
                    : isHealthy
                      ? "border-[#e1eae5] bg-white"
                      : "border-[#f3c6c0] bg-[#fff8f7]"
                }`}
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isPrimary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#07845f] px-3 py-1 text-xs font-extrabold text-white">
                          <CheckCircle2 className="size-3.5" /> PRIMARY BANK
                        </span>
                      ) : isFallback ? (
                        <span className="inline-flex items-center rounded-full bg-[#e6eeea] px-2.5 py-0.5 text-[11px] font-bold text-[#355245]">
                          BACKUP FALLBACK
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[#f0f4f2] px-2.5 py-0.5 text-[11px] font-bold text-[#63736b]">
                          STANDBY
                        </span>
                      )}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isHealthy ? "bg-[#dcfce7] text-[#146c38]" : "bg-[#fee2e2] text-[#991b1b]"
                      }`}
                    >
                      {isHealthy ? "ONLINE" : "PAUSED"}
                    </span>
                  </div>

                  {/* Bank Title & Description */}
                  <h3 className="mt-3 text-base font-extrabold text-[#17201c]">
                    {meta.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5c6d64]">
                    {meta.subtitle}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-col gap-2 border-t border-[#e5ede8] pt-4">
                  {!isPrimary && (
                    <button
                      type="button"
                      disabled={isBusyPrimary}
                      onClick={() => void selectPrimaryBank(key)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#07845f] px-4 text-xs font-bold text-white transition hover:bg-[#05684a] disabled:opacity-60"
                    >
                      {isBusyPrimary ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Use { key === "providus" ? "Providus" : key === "paystack" ? "Paystack-Titan" : "FCMB" } as Primary Bank
                    </button>
                  )}

                  {isHealthy ? (
                    <button
                      type="button"
                      disabled={isBusyState}
                      onClick={() => void toggleProviderState(prov.provider, "UNAVAILABLE")}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2b5af] bg-white px-3 text-xs font-bold text-[#a83b31] transition hover:bg-[#fff0ee] disabled:opacity-60"
                    >
                      {isBusyState ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <PauseCircle className="size-3.5" />
                      )}
                      Pause Bank (Outage Kill-Switch)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusyState}
                      onClick={() => void toggleProviderState(prov.provider, "HEALTHY")}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#07845f] bg-white px-3 text-xs font-bold text-[#07845f] transition hover:bg-[#eaf9f0] disabled:opacity-60"
                    >
                      {isBusyState ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="size-3.5" />
                      )}
                      Resume Bank (Set Online)
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Step 2: Generated Customer Virtual Accounts Table */}
      <section className="rounded-2xl border border-[#d7e2dc] bg-white p-6 shadow-[0_10px_30px_rgba(20,55,40,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="size-5 text-[#07845f]" />
            <div>
              <h2 className="text-lg font-bold text-[#17201c]">
                2. Customer Virtual Bank Accounts ({accounts.length})
              </h2>
              <p className="text-xs text-[#63736b]">
                All virtual NUBAN accounts generated across Providus Bank, Paystack-Titan, and FCMB.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void backfillAccounts()}
            disabled={backfilling}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-3 text-xs font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60"
          >
            {backfilling && <Loader2 className="size-4 animate-spin" />} Sync existing accounts
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]">
              <tr>
                <th className="px-4 py-3">Account Number</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Bank / Provider</th>
                <th className="px-4 py-3">KYC Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9efeb]">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#63736b]">
                    No customer virtual accounts generated yet.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-4 font-mono font-bold text-[#087851]">
                      {account.accountNumber || "-"}
                    </td>
                    <td className="px-4 py-4 font-medium text-[#17201c]">{account.accountName || "-"}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-md bg-[#f0f5f2] px-2.5 py-1 text-xs font-bold text-[#204236]">
                        {account.bankName || account.provider || "Providus Bank"}
                      </span>
                    </td>
                    <td className="px-4 py-4">Tier {account.activeTier || 1}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#eaf9f0] px-2.5 py-1 text-xs font-bold text-[#17633d]">
                        {account.status || "active"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#63736b]">{formatDate(account.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
