"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, Database, ListChecks, Loader2, Play, RefreshCw, Radio, ShieldAlert, Shuffle, XCircle } from "lucide-react"

type ProviderHealthSnapshot = {
  provider: string
  state: string
  manualOverride?: boolean
  consecutiveFailures?: number
  lastSuccessAt?: string
  lastFailureAt?: string
  lastLatencyMs?: number
}

type WebhookEvent = {
  id: string
  providerEventId?: string
  eventType?: string
  status?: string
  processingError?: string
  receivedAt?: string
  processedAt?: string
  payloadHash?: string
  accountNumber?: string
  amount?: string
  reference?: string
  scope?: string
  eventTime?: string
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

type LedgerEntry = {
  id: string
  internalReference?: string
  providerTransactionRef?: string
  amount?: number
  currency?: string
  transactionType?: string
  direction?: string
  status?: string
  reconciliationStatus?: string
  failureReason?: string
  webhookReceivedAt?: string
  settledAt?: string
  createdAt?: string
}

type PaystackDvaTransfer = {
  reference: string
  amount: number
  paystackStatus: string
  accountNumber: string
  bankName: string
  customerEmail: string
  customerName: string
  paidAt: string
  reconciliationStatus: "SETTLED" | "MISSED_OR_PENDING" | "UNMAPPED_ACCOUNT"
  settledTransactionId: string | null
  settledDescription: string | null
  mappedUserId: string | null
}

type TreasuryReconciliation = {
  generatedAt: string
  platformFeePolicy: { percent: number; cap: number }
  customerLiability: {
    totalCustomerLiability: number
    ufitFlex: { balance: number; fundedWalletsCount: number }
    ufitSave: { balance: number; activeGoalsCount: number }
    wefitSave: { balance: number; activeMembersCount: number }
  }
  ufitgoRevenue: {
    totalUfitgoEarnedRevenue: number
    totalFintechFeeRevenue: number
    ufitSaveBreakFeeRevenue: number
    wefitSaveBreakFeeRevenue: number
    ufitFlexExcessWithdrawalFeeRevenue: number
    packageCommissionRevenue: number
    intelligencePassRevenue: number
  }
  operatorEscrow: {
    totalOperatorPayable: number
  }
  paystackSettlement: {
    paystackTransferBalanceNgn: number | null
    revenueSubaccountCode: string | null
    settlementBankNote: string
  }
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function statusStyle(status?: string) {
  if (status === "PROCESSED") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (status === "QUARANTINED") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

function dvaStatusBadgeStyle(reconciliationStatus: PaystackDvaTransfer["reconciliationStatus"]) {
  if (reconciliationStatus === "SETTLED") return "border-[#a9e6ca] bg-[#eaf9f0] text-[#13633c]"
  if (reconciliationStatus === "UNMAPPED_ACCOUNT") return "border-[#f1c4bd] bg-[#fff0ee] text-[#a83b31]"
  return "border-[#ecd68a] bg-[#fff8de] text-[#806000]"
}

function dvaStatusLabel(reconciliationStatus: PaystackDvaTransfer["reconciliationStatus"]) {
  if (reconciliationStatus === "SETTLED") return "SETTLED"
  if (reconciliationStatus === "UNMAPPED_ACCOUNT") return "UNMAPPED ACCOUNT"
  return "MISSED / PENDING"
}

export default function FcmbWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [paystackDvaTransfers, setPaystackDvaTransfers] = useState<PaystackDvaTransfer[]>([])
  const [treasury, setTreasury] = useState<TreasuryReconciliation | null>(null)
  const [subaccountBankCode, setSubaccountBankCode] = useState("101")
  const [subaccountAccountNumber, setSubaccountAccountNumber] = useState("")
  const [subaccountBusinessName, setSubaccountBusinessName] = useState("UfitGo Corporate Revenue")
  const [creatingSubaccount, setCreatingSubaccount] = useState(false)
  const [createdSubaccountCode, setCreatedSubaccountCode] = useState<string | null>(null)
  const [retriggeringRef, setRetriggeringRef] = useState<string | null>(null)
  const [retriggeringAll, setRetriggeringAll] = useState(false)
  const [manualReference, setManualReference] = useState("")
  const [manualAccountNumber, setManualAccountNumber] = useState("")
  const [providers, setProviders] = useState<ProviderHealthSnapshot[]>([])
  const [routingStrategy, setRoutingStrategy] = useState<string>("round_robin")
  const [updatingProvider, setUpdatingProvider] = useState<string | null>(null)
  const [updatingStrategy, setUpdatingStrategy] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [accountNumber, setAccountNumber] = useState("4000138405")
  const [amount, setAmount] = useState("1200")
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [webhooksResponse, accountsResponse, ledgerResponse, healthResponse, paystackDvaResponse, treasuryResponse] = await Promise.all([
        fetch("/api/admin/fcmb-diagnostics/webhooks", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/accounts", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/ledger?limit=50", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/providers/health", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/paystack-dva/transfers?limit=30", { cache: "no-store" }).catch(() => null),
        fetch("/api/admin/fcmb-diagnostics/treasury-reconciliation", { cache: "no-store" }).catch(() => null),
      ])
      const webhooksPayload = webhooksResponse ? await webhooksResponse.json().catch(() => null) : null
      const accountsPayload = accountsResponse ? await accountsResponse.json().catch(() => null) : null
      const ledgerPayload = ledgerResponse ? await ledgerResponse.json().catch(() => null) : null
      const healthPayload = healthResponse ? await healthResponse.json().catch(() => null) : null
      const paystackDvaPayload = paystackDvaResponse ? await paystackDvaResponse.json().catch(() => null) : null
      const treasuryPayload = treasuryResponse ? await treasuryResponse.json().catch(() => null) : null

      if (Array.isArray(webhooksPayload?.events)) setEvents(webhooksPayload.events)
      if (Array.isArray(accountsPayload?.accounts)) setAccounts(accountsPayload.accounts)
      if (Array.isArray(ledgerPayload?.entries)) setLedgerEntries(ledgerPayload.entries)
      if (Array.isArray(paystackDvaPayload?.transfers)) {
        setPaystackDvaTransfers(paystackDvaPayload.transfers)
      }
      if (treasuryPayload?.customerLiability) {
        setTreasury(treasuryPayload)
      }
      if (Array.isArray(healthPayload?.providers)) {
        setProviders(healthPayload.providers)
      }
      if (healthPayload?.routingStrategy) {
        setRoutingStrategy(healthPayload.routingStrategy)
      }
      setSelectedEvent((current) => current ?? webhooksPayload?.events?.[0] ?? null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load diagnostics.")
    } finally {
      setLoading(false)
    }
  }

  const retriggerPaystackDva = async (reference?: string, overrideAccountNumber?: string) => {
    if (reference) {
      setRetriggeringRef(reference)
    } else {
      setRetriggeringAll(true)
    }
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/paystack-dva/retrigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference?.trim() || undefined,
          accountNumber: overrideAccountNumber?.trim() || undefined,
          forceNotify: true,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to re-trigger Paystack DVA transfer.")
      }
      if (reference) {
        setNotice(`Re-settled Paystack transfer ${reference} and dispatched push/in-app notification to customer.`)
        setManualReference("")
        setManualAccountNumber("")
      } else {
        setNotice(`Reconciled ${payload?.settledCount ?? 0} missed Paystack DVA transfer(s) and notified customer(s).`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-trigger Paystack DVA settlement.")
    } finally {
      setRetriggeringRef(null)
      setRetriggeringAll(false)
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
      setNotice(`Routing strategy updated to ${strategy === "round_robin" ? "Round-Robin (50/50 distribution)" : "Primary + Fallback"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update routing strategy.")
    } finally {
      setUpdatingStrategy(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 15000)
    return () => window.clearInterval(interval)
  }, [])

  const triggerPayment = async () => {
    setTriggering(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/sandbox-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber, amount: Number(amount) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Sandbox payment was rejected.")
      setNotice(`Sandbox payment accepted${payload?.resourceId ? `: resource ${payload.resourceId}` : "."} Waiting for the FCMB webhook.`)
      window.setTimeout(() => void load(), 2500)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sandbox payment failed.")
    } finally {
      setTriggering(false)
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
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Account backfill failed.")
    } finally {
      setBackfilling(false)
    }
  }

  const createRevenueSubaccount = async () => {
    if (!subaccountAccountNumber.trim() || subaccountAccountNumber.trim().length !== 10) {
      setError("Please enter a valid 10-digit NUBAN account number for your UfitGo Corporate Revenue Account.")
      return
    }
    setCreatingSubaccount(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/fcmb-diagnostics/paystack-subaccount/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: subaccountBusinessName.trim() || "UfitGo Corporate Revenue",
          bankCode: subaccountBankCode.trim(),
          accountNumber: subaccountAccountNumber.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to create Paystack revenue subaccount.")
      }
      setCreatedSubaccountCode(payload?.subaccountCode || null)
      setNotice(
        `Created Paystack Corporate Revenue Subaccount (${payload?.subaccountCode}). Set PAYSTACK_REVENUE_SUBACCOUNT_CODE=${payload?.subaccountCode} in ufitgo-user-api .env to auto-split direct UfitGo revenue!`
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Paystack revenue subaccount.")
    } finally {
      setCreatingSubaccount(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f5] px-5 py-8 text-[#18241f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1480px]">
        <header className="flex flex-col gap-5 border-b border-[#d7e2dc] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]"><Radio className="size-4" /> Multi-Provider BaaS Control & Diagnostics</div>
            <h1 className="mt-2 text-3xl font-bold">BaaS Providers, Failover & Webhooks</h1>
            <p className="mt-2 text-sm text-[#5c6d64]">Callbacks: /api/internal/baas/webhooks/fcmb · /api/internal/baas/webhooks/providus</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-4 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </header>

        {/* Treasury & Revenue vs. Customer Float Reconciliation Panel */}
        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
                <Database className="size-4" /> Providus Settlement & Paystack Treasury Separation
              </div>
              <h2 className="mt-1 text-lg font-bold">
                Customer Custodial Float vs. UfitGo Earned Revenue
              </h2>
              <p className="mt-0.5 text-xs text-[#63736b]">
                Paystack sweeps DVA & checkout collections (T+1) into your Providus Settlement Account. Keep{" "}
                <strong>Bucket A (Customer Liability)</strong> untouched as float; only{" "}
                <strong>Bucket B (UfitGo Earned Revenue)</strong> belongs to UfitGo.
              </p>
            </div>
            {treasury?.paystackSettlement?.paystackTransferBalanceNgn != null && (
              <div className="rounded-xl border border-[#c9d8d0] bg-[#f6fcf9] px-4 py-2.5 text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#5c6d64]">
                  Live Paystack Transfer Balance
                </div>
                <div className="text-lg font-extrabold text-[#07845f]">
                  ₦{Number(treasury.paystackSettlement.paystackTransferBalanceNgn).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Bucket A: Customer Custodial Liability */}
            <div className="rounded-xl border border-[#f5d0a9] bg-[#fffaf3] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#b45309]">
                  Bucket A · Customer Float (Do Not Spend)
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-[#78350f]">
                ₦{Number(treasury?.customerLiability?.totalCustomerLiability ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-xs text-[#92400e]">
                100% customer-owned funds sitting in your Providus/Paystack settlement pool:
              </p>
              <div className="mt-3 space-y-1.5 border-t border-[#fde68a] pt-2.5 text-xs text-[#78350f]">
                <div className="flex justify-between">
                  <span>UfitFlex Wallets ({treasury?.customerLiability?.ufitFlex?.fundedWalletsCount ?? 0} active):</span>
                  <strong>₦{Number(treasury?.customerLiability?.ufitFlex?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>UfitSave Personal Goals ({treasury?.customerLiability?.ufitSave?.activeGoalsCount ?? 0} active):</span>
                  <strong>₦{Number(treasury?.customerLiability?.ufitSave?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>WefitSave Group Pools ({treasury?.customerLiability?.wefitSave?.activeMembersCount ?? 0} savers):</span>
                  <strong>₦{Number(treasury?.customerLiability?.wefitSave?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* Bucket B: UfitGo Earned Revenue */}
            <div className="rounded-xl border border-[#a9e6ca] bg-[#f4fbf7] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#15803d]">
                  Bucket B · UfitGo Earned Revenue (Safe to Sweep)
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-[#065f46]">
                ₦{Number(treasury?.ufitgoRevenue?.totalUfitgoEarnedRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </div>
              <p className="mt-1 text-xs text-[#166534]">
                Unlocked UfitGo revenue earned from fees, commissions & passes:
              </p>
              <div className="mt-3 space-y-1.5 border-t border-[#bbf7d0] pt-2.5 text-xs text-[#065f46]">
                <div className="flex justify-between">
                  <span>UfitSave Break/Cash-Out Fees ({treasury?.platformFeePolicy?.percent ?? 0.9}%):</span>
                  <strong>₦{Number(treasury?.ufitgoRevenue?.ufitSaveBreakFeeRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>WefitSave Individual Break Fees ({treasury?.platformFeePolicy?.percent ?? 0.9}%):</span>
                  <strong>₦{Number(treasury?.ufitgoRevenue?.wefitSaveBreakFeeRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>UfitFlex 5th+ Monthly Withdrawal Fees (₦100):</span>
                  <strong>₦{Number(treasury?.ufitgoRevenue?.ufitFlexExcessWithdrawalFeeRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Package Booking Commissions:</span>
                  <strong>₦{Number(treasury?.ufitgoRevenue?.packageCommissionRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Open Slot Pass & Intelligence Sales:</span>
                  <strong>₦{Number(treasury?.ufitgoRevenue?.intelligencePassRevenue ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            </div>

            {/* Bucket C: Automated Paystack Corporate Revenue Subaccount */}
            <div className="rounded-xl border border-[#d7e2dc] bg-[#f9fbfa] p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#e5ede8] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#204236]">
                  Auto-Split Revenue Subaccount
                </span>
                {(treasury?.paystackSettlement?.revenueSubaccountCode || createdSubaccountCode) && (
                  <span className="rounded-md bg-[#07845f] px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                    {createdSubaccountCode || treasury?.paystackSettlement?.revenueSubaccountCode}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#5c6d64]">
                Link a second corporate bank account (OPEX/Revenue Account) on Paystack so direct UfitGo revenue auto-settles separately from your Providus Customer Float Account:
              </p>
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    aria-label="Revenue bank"
                    value={subaccountBankCode}
                    onChange={(e) => setSubaccountBankCode(e.target.value)}
                    className="h-9 rounded-lg border border-[#c9d8d0] bg-white px-2 text-xs font-semibold"
                  >
                    <option value="101">Providus (101)</option>
                    <option value="214">FCMB (214)</option>
                    <option value="058">GTBank (058)</option>
                    <option value="044">Access (044)</option>
                    <option value="057">Zenith (057)</option>
                    <option value="033">UBA (033)</option>
                  </select>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-digit NUBAN"
                    value={subaccountAccountNumber}
                    onChange={(e) => setSubaccountAccountNumber(e.target.value)}
                    className="col-span-2 h-9 rounded-lg border border-[#c9d8d0] bg-white px-3 text-xs font-semibold"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Account Name (e.g. UfitGo Corporate Revenue)"
                    value={subaccountBusinessName}
                    onChange={(e) => setSubaccountBusinessName(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-[#c9d8d0] bg-white px-3 text-xs"
                  />
                  <button
                    type="button"
                    disabled={creatingSubaccount}
                    onClick={() => void createRevenueSubaccount()}
                    className="h-9 rounded-lg bg-[#07845f] px-3 text-xs font-bold text-white hover:bg-[#05684b] disabled:opacity-50"
                  >
                    {creatingSubaccount ? "Creating..." : "Create Subaccount"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="size-5 text-[#07845f]" />
              <div>
                <h2 className="text-lg font-bold">BaaS Provider Health & Outage Kill-Switch</h2>
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
                          isHealthy
                            ? "bg-[#dcfce7] text-[#146c38]"
                            : "bg-[#fee2e2] text-[#991b1b]"
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

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
          <div className="flex flex-col gap-4 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListChecks className="size-5 text-[#07845f]" />
                <h2 className="text-lg font-bold">Paystack-Titan DVA Inward Transfers & SRE Re-Trigger</h2>
              </div>
              <p className="mt-1 text-xs text-[#63736b]">
                Live view of Dedicated Virtual Account (`dedicated_nuban`) transfers on Paystack compared against UfitGo&apos;s ledger. Re-trigger any missed transfer or re-send the customer&apos;s push notification in one click.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={retriggeringAll}
                onClick={() => void retriggerPaystackDva()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#07845f] px-3.5 text-xs font-bold text-white hover:bg-[#05684a] disabled:opacity-60"
              >
                {retriggeringAll ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Sync & Settle All Missed Transfers
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#e2eae5] bg-[#f8fbf9] p-3.5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="dva-ref-input" className="block text-xs font-bold text-[#204236]">
                Paystack Reference
              </label>
              <input
                id="dva-ref-input"
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                placeholder="e.g. 1793389959942hz27bmvve2tc6"
                className="mt-1 h-9 w-full rounded-lg border border-[#c9d8d0] bg-white px-3 font-mono text-xs outline-none focus:border-[#07845f]"
              />
            </div>
            <div className="sm:w-56">
              <label htmlFor="dva-nuban-input" className="block text-xs font-bold text-[#204236]">
                Target NUBAN (Optional override)
              </label>
              <input
                id="dva-nuban-input"
                value={manualAccountNumber}
                onChange={(e) => setManualAccountNumber(e.target.value)}
                placeholder="e.g. 1238571129"
                className="mt-1 h-9 w-full rounded-lg border border-[#c9d8d0] bg-white px-3 font-mono text-xs outline-none focus:border-[#07845f]"
              />
            </div>
            <button
              type="button"
              disabled={!manualReference.trim() || retriggeringRef === manualReference.trim()}
              onClick={() => void retriggerPaystackDva(manualReference, manualAccountNumber)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#07845f] bg-white px-4 text-xs font-bold text-[#07845f] hover:bg-[#ecf8f2] disabled:opacity-50"
            >
              {retriggeringRef === manualReference.trim() ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              Verify & Re-Trigger Reference
            </button>
          </div>

          {notice && (
            <div className="mt-4 rounded-lg border border-[#a9e6ca] bg-[#eaf9f0] p-3 text-sm font-medium text-[#13633c]">
              {notice}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-[#f1c4bd] bg-[#fff0ee] p-3 text-sm font-medium text-[#a83b31]">
              {error}
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">DVA Account</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">UfitGo Status</th>
                  <th className="px-4 py-3">Paid At</th>
                  <th className="px-4 py-3 text-right">SRE Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9efeb]">
                {paystackDvaTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#63736b]">
                      No Paystack Dedicated Virtual Account (`dedicated_nuban`) transfers found yet.
                    </td>
                  </tr>
                ) : (
                  paystackDvaTransfers.map((tx) => {
                    const isSettled = tx.reconciliationStatus === "SETTLED"
                    const isBusy = retriggeringRef === tx.reference
                    return (
                      <tr key={tx.reference}>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#18241f]">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-[#087851]">
                            {tx.accountNumber || "-"}
                          </span>
                          <span className="ml-2 text-xs text-[#63736b]">{tx.bankName}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          <div className="font-semibold text-[#18241f]">{tx.customerName || "-"}</div>
                          <div className="text-[#63736b]">{tx.customerEmail || "-"}</div>
                        </td>
                        <td className="px-4 py-3.5 font-bold">
                          ₦{Number(tx.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${dvaStatusBadgeStyle(tx.reconciliationStatus)}`}
                          >
                            {dvaStatusLabel(tx.reconciliationStatus)}
                          </span>
                          {tx.settledDescription && (
                            <div className="mt-1 text-[11px] text-[#63736b]">{tx.settledDescription}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#63736b]">{formatDate(tx.paidAt)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void retriggerPaystackDva(tx.reference, tx.accountNumber)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-50 ${
                              isSettled
                                ? "border-[#c9d8d0] bg-white text-[#204236] hover:bg-[#edf5f0]"
                                : "border-[#07845f] bg-[#07845f] text-white hover:bg-[#05684a]"
                            }`}
                          >
                            {isBusy && <Loader2 className="size-3 animate-spin" />}
                            {isSettled ? "Re-send Notification" : "Settle & Notify"}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Delivered events</h2><span className="text-xs font-semibold text-[#63736b]">Refreshes every 15 seconds</span></div>
            {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-6 animate-spin text-[#07845f]" /></div> : error ? <div className="mt-5 rounded-lg bg-[#fff0ee] p-4 text-sm text-[#a83b31]">{error}</div> : events.length === 0 ? <div className="mt-5 rounded-lg border border-dashed border-[#c9d8d0] p-8 text-center text-sm text-[#63736b]">No authenticated FCMB events have reached UfitGo yet.</div> : <div className="mt-5 space-y-2">{events.map((event) => <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className={`flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition ${selectedEvent?.id === event.id ? "border-[#07845f] bg-[#ecf8f2]" : "border-[#e0e8e3] hover:bg-[#f7faf8]"}`}><div className="flex min-w-0 items-center gap-3">{event.status === "PROCESSED" ? <CheckCircle2 className="size-5 shrink-0 text-[#19824e]" /> : event.status === "QUARANTINED" ? <XCircle className="size-5 shrink-0 text-[#b44035]" /> : <CircleAlert className="size-5 shrink-0 text-[#b48100]" />}<div><p className="font-bold">{event.eventType || "Unknown event"}</p><p className="mt-1 text-xs text-[#63736b]">{formatDate(event.receivedAt)}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(event.status)}`}>{event.status || "RECEIVED"}</span></button>)}</div>}
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><h2 className="text-lg font-bold">Selected event</h2>{selectedEvent ? <dl className="mt-5 grid gap-4 text-sm"><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Event</dt><dd className="mt-1 font-bold">{selectedEvent.eventType || "Unknown"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">FCMB event ID</dt><dd className="mt-1 break-all font-mono text-xs">{selectedEvent.providerEventId || "-"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Wallet credit</dt><dd className="mt-1">{selectedEvent.accountNumber || "-"} · NGN {selectedEvent.amount || "-"}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Reference / scope</dt><dd className="mt-1 break-all text-xs">{selectedEvent.reference || "-"}<span className="ml-2 text-[#63736b]">{selectedEvent.scope || ""}</span></dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Received</dt><dd className="mt-1">{formatDate(selectedEvent.receivedAt)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#718079]">Payload checksum</dt><dd className="mt-1 break-all font-mono text-xs text-[#52625a]">{selectedEvent.payloadHash || "-"}</dd></div>{selectedEvent.processingError && <div className="rounded-lg bg-[#fff0ee] p-3 text-sm text-[#a83b31]">{selectedEvent.processingError}</div>}</dl> : <p className="mt-5 text-sm text-[#63736b]">Select an event to inspect it.</p>}</section>

            <section className="rounded-xl border border-[#e5d49c] bg-[#fffcef] p-5"><div className="flex items-center gap-2"><Play className="size-4 text-[#9a7000]" /><h2 className="text-lg font-bold">Sandbox payment</h2></div><div className="mt-4 grid gap-3"><label className="text-sm font-semibold">Wallet account<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 font-mono text-sm outline-none focus:border-[#967000]" /></label><label className="text-sm font-semibold">Amount (NGN)<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7c27a] bg-white px-3 text-sm outline-none focus:border-[#967000]" /></label></div>{notice && <p className="mt-4 rounded-lg bg-[#edf8f1] p-3 text-sm text-[#17633d]">{notice}</p>}<button type="button" onClick={() => void triggerPayment()} disabled={triggering || !accountNumber || Number(amount) <= 0} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#a67900] text-sm font-bold text-white hover:bg-[#8d6600] disabled:opacity-60">{triggering ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Trigger sandbox credit</button></section>
          </aside>
        </section>

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Database className="size-5 text-[#07845f]" /><h2 className="text-lg font-bold">UfitGo settlement account mappings</h2></div><button type="button" onClick={() => void backfillAccounts()} disabled={backfilling} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-3 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60">{backfilling && <Loader2 className="size-4 animate-spin" />} Backfill existing accounts</button></div><div className="mt-5 overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Bank</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th></tr></thead><tbody className="divide-y divide-[#e9efeb]">{accounts.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#63736b]">No settlement mappings yet. Use the backfill action to register existing Tier 1 accounts.</td></tr> : accounts.map((account) => <tr key={account.id}><td className="px-4 py-4 font-mono font-bold text-[#087851]">{account.accountNumber || "-"}</td><td className="px-4 py-4">{account.accountName || "-"}</td><td className="px-4 py-4">{account.bankName || "FCMB"}</td><td className="px-4 py-4">{account.activeTier || 1}</td><td className="px-4 py-4"><span className="rounded-full bg-[#eaf9f0] px-2.5 py-1 text-xs font-bold text-[#17633d]">{account.status || "active"}</span></td><td className="px-4 py-4 text-[#63736b]">{formatDate(account.createdAt)}</td></tr>)}</tbody></table></div></section>

        <section className="mt-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]"><div className="flex items-center gap-2"><ListChecks className="size-5 text-[#07845f]" /><div><h2 className="text-lg font-bold">Reconciliation ledger</h2><p className="mt-1 text-sm text-[#63736b]">Pending entries are rechecked automatically after 10 minutes. References let support trace a customer report without opening raw provider payloads.</p></div></div><div className="mt-5 overflow-x-auto"><table className="min-w-[960px] w-full text-left text-sm"><thead className="border-y border-[#e2eae5] bg-[#f7faf8] text-xs uppercase tracking-[0.08em] text-[#718079]"><tr><th className="px-4 py-3">Created</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3">Issue</th></tr></thead><tbody className="divide-y divide-[#e9efeb]">{ledgerEntries.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#63736b]">No FCMB ledger entries have been recorded yet.</td></tr> : ledgerEntries.map((entry) => <tr key={entry.id}><td className="px-4 py-4 text-[#63736b]">{formatDate(entry.createdAt)}</td><td className="max-w-[220px] px-4 py-4 font-mono text-xs text-[#087851]"><div className="truncate">{entry.providerTransactionRef || entry.internalReference || "-"}</div></td><td className="px-4 py-4 capitalize">{(entry.transactionType || "transaction").replace(/_/g, " ")}<span className="ml-2 text-xs text-[#63736b]">{entry.direction}</span></td><td className="px-4 py-4 font-bold">{entry.currency || "NGN"} {Number(entry.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle(entry.status)}`}>{entry.status || "INITIATED"}</span></td><td className="px-4 py-4 text-xs text-[#63736b]">{entry.reconciliationStatus || "none"}{entry.settledAt ? ` · settled ${formatDate(entry.settledAt)}` : ""}</td><td className="max-w-[240px] px-4 py-4 text-xs text-[#a83b31]">{entry.failureReason || "-"}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  )
}