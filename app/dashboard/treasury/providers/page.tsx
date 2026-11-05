"use client"

import { useEffect, useState } from "react"
import { Database, Loader2, ShieldAlert, Shuffle } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type ProviderHealthSnapshot = {
  provider: string
  state: string
  manualOverride?: boolean
  consecutiveFailures?: number
  lastSuccessAt?: string
  lastFailureAt?: string
  lastLatencyMs?: number
}

type Account = {
  id: string
  accountNumber?: string
  accountName?: string
  bankName?: string
  activeTier?: number
  status?: string
  createdAt?: string
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
  const [routingStrategy, setRoutingStrategy] = useState<string>("round_robin")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null)
  const [updatingStrategy, setUpdatingStrategy] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

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

      if (Array.isArray(healthPayload?.providers)) {
        setProviders(healthPayload.providers)
      }
      if (healthPayload?.routingStrategy) {
        setRoutingStrategy(healthPayload.routingStrategy)
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
          reason: nextState === "UNAVAILABLE" ? "Manual admin kill-switch activated" : "Manual admin restore to healthy",
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Failed to update provider state.")
      if (Array.isArray(payload?.providers)) setProviders(payload.providers)
      setNotice(`Provider ${providerName.toUpperCase()} set to ${nextState}.`)
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
      if (!response.ok) throw new Error(payload?.message || "Failed to update routing strategy.")
      if (payload?.routingStrategy) setRoutingStrategy(payload.routingStrategy)
      if (Array.isArray(payload?.providers)) setProviders(payload.providers)
      setNotice(
        `Routing strategy updated to ${
          strategy === "round_robin" ? "Round-Robin (50/50 distribution)" : "Primary + Fallback"
        }.`
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

  return (
    <div className="space-y-6">
      <TreasurySubnav
        title="BaaS Routing, Outage Kill-Switch & Account Mappings"
        subtitle="Control 50/50 Round-Robin vs. Primary+Fallback routing across Paystack-Titan, Providus, and FCMB, and inspect mapped virtual accounts."
        loading={loading}
        onRefresh={() => void load()}
      />

      {notice && (
        <div className="rounded-lg border border-[#a9e6ca] bg-[#eaf9f0] p-3 text-sm font-medium text-[#13633c]">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#f1c4bd] bg-[#fff0ee] p-3 text-sm font-medium text-[#a83b31]">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
        <div className="flex flex-col gap-4 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="size-5 text-[#07845f]" />
            <div>
              <h2 className="text-lg font-bold">BaaS Provider Health &amp; Outage Kill-Switch</h2>
              <p className="text-xs text-[#63736b]">
                Putting a bank into Maintenance immediately routes new signups and payouts to the healthy backup bank and promotes backup NUBANs in customers&apos; mobile apps.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5c6d64]">
              <Shuffle className="size-3.5" /> Routing:
            </span>
            <button
              type="button"
              disabled={updatingStrategy}
              onClick={() => void changeRoutingStrategy("round_robin")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                routingStrategy === "round_robin"
                  ? "border-[#07845f] bg-[#07845f] text-white"
                  : "border-[#c9d8d0] bg-white text-[#204236] hover:bg-[#edf5f0]"
              }`}
            >
              Round-Robin (50/50)
            </button>
            <button
              type="button"
              disabled={updatingStrategy}
              onClick={() => void changeRoutingStrategy("primary_fallback")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                routingStrategy === "primary_fallback"
                  ? "border-[#07845f] bg-[#07845f] text-white"
                  : "border-[#c9d8d0] bg-white text-[#204236] hover:bg-[#edf5f0]"
              }`}
            >
              Primary + Fallback
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(providers.length > 0
            ? providers
            : [
                { provider: "paystack", state: "HEALTHY", consecutiveFailures: 0, lastLatencyMs: 0 },
                { provider: "fcmb", state: "HEALTHY", consecutiveFailures: 0, lastLatencyMs: 0 },
                { provider: "providus", state: "HEALTHY", consecutiveFailures: 0, lastLatencyMs: 0 },
              ]
          ).map((prov) => {
            const isHealthy = prov.state === "HEALTHY" || prov.state === "RECOVERY"
            const isBusy = updatingProvider === prov.provider
            return (
              <div
                key={prov.provider}
                className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                  isHealthy ? "border-[#b8e2cc] bg-[#f6fcf9]" : "border-[#f1c4bd] bg-[#fff5f4]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold uppercase tracking-wide">
                      {prov.provider}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isHealthy ? "bg-[#dcfce7] text-[#146c38]" : "bg-[#fee2e2] text-[#991b1b]"
                      }`}
                    >
                      {prov.state}
                      {prov.manualOverride ? " (Manual)" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5c6d64]">
                    Failures: {prov.consecutiveFailures ?? 0} · Last Latency: {prov.lastLatencyMs ?? 0}ms
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isHealthy ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void toggleProviderState(prov.provider, "UNAVAILABLE")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e08b82] bg-white px-3 text-xs font-bold text-[#a83b31] hover:bg-[#fff0ee] disabled:opacity-60"
                    >
                      {isBusy && <Loader2 className="size-3.5 animate-spin" />}
                      Activate Kill-Switch (Pause)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void toggleProviderState(prov.provider, "HEALTHY")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07845f] px-3 text-xs font-bold text-white hover:bg-[#05684a] disabled:opacity-60"
                    >
                      {isBusy && <Loader2 className="size-3.5 animate-spin" />}
                      Restore to Healthy
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-[#07845f]" />
            <h2 className="text-lg font-bold">UfitGo Settlement Account Mappings</h2>
          </div>
          <button
            type="button"
            onClick={() => void backfillAccounts()}
            disabled={backfilling}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-3 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60"
          >
            {backfilling && <Loader2 className="size-4 animate-spin" />} Backfill existing accounts
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9efeb]">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#63736b]">
                    No settlement mappings yet. Use the backfill action to register existing Tier 1 accounts.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-4 py-4 font-mono font-bold text-[#087851]">
                      {account.accountNumber || "-"}
                    </td>
                    <td className="px-4 py-4">{account.accountName || "-"}</td>
                    <td className="px-4 py-4">{account.bankName || "FCMB"}</td>
                    <td className="px-4 py-4">{account.activeTier || 1}</td>
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
