"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Play,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react"
import { PermissionGate } from "@/components/auth/permission-gate"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type BaasAccountItem = {
  id?: string
  provider?: string
  bankName?: string
  accountName?: string
  nubanAccountNumber?: string
  accountId?: string
  activeTier?: number
  status?: string
}

type CustomerOption = {
  id: string
  firstName?: string
  lastName?: string
  verifiedName?: string
  email: string
  phone?: string
  kycStatus?: string
  walletBalance: number
  baasAccounts: BaasAccountItem[]
}

type SandboxCreditRecord = {
  id: string
  userId?: string | null
  customerName?: string
  customerEmail?: string | null
  amount: number
  description?: string
  reference?: string
  createdAt?: string
}

type SandboxStatusPayload = {
  sandboxAllowed: boolean
  demoMode: boolean
  providers?: {
    providus?: string
    paystack?: string
    fcmb?: string
  }
  lockReason?: string | null
  recentCredits?: SandboxCreditRecord[]
}

const AMOUNT_PRESETS = [50000, 100000, 250000, 500000, 1000000, 5000000]

function formatCurrency(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function formatProviderBadge(provider?: string) {
  const upper = String(provider || "PROVIDUS").toUpperCase()
  if (upper === "PAYSTACK") return "Paystack-Titan"
  if (upper === "FCMB") return "FCMB MFB"
  return "Providus Bank (Xpress Wallet)"
}

export default function SandboxWalletFunderPage() {
  const [statusData, setStatusData] = useState<SandboxStatusPayload | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0)
  const [amountInput, setAmountInput] = useState<string>("100000")
  const [narration, setNarration] = useState<string>("Sandbox QA Test Wallet Deposit")
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [notice, setNotice] = useState<string>("")
  const [error, setError] = useState<string>("")

  const loadData = useCallback(async (search = "") => {
    setLoading(true)
    setError("")
    try {
      const query = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(search.trim() ? { search: search.trim() } : {}),
      })
      const [statusRes, customersRes] = await Promise.all([
        fetch("/api/admin/fcmb-diagnostics/sandbox-wallet-funder/status", {
          cache: "no-store",
        }),
        fetch(`/api/admin/customers?${query.toString()}`, {
          cache: "no-store",
        }),
      ])

      const statusPayload = await statusRes.json().catch(() => null)
      if (!statusRes.ok) {
        throw new Error(
          statusPayload?.message || "Unable to verify Sandbox Wallet Funder status."
        )
      }
      setStatusData(statusPayload)

      const custPayload = await customersRes.json().catch(() => null)
      const rawUsers: any[] = Array.isArray(custPayload?.data)
        ? custPayload.data
        : Array.isArray(custPayload?.users)
          ? custPayload.users
          : Array.isArray(custPayload)
            ? custPayload
            : []

      const normalized: CustomerOption[] = rawUsers.map((u: any) => ({
        id: String(u.id),
        firstName: u.firstName,
        lastName: u.lastName,
        verifiedName: u.verifiedName,
        email: String(u.email || ""),
        phone: u.phone,
        kycStatus: u.kycStatus,
        walletBalance: Number(u.walletBalance ?? u.balance ?? 0),
        baasAccounts: Array.isArray(u.baasAccounts) ? u.baasAccounts : [],
      }))

      // Sort verified customers with issued accounts to the top
      normalized.sort((a, b) => {
        const aHasAcc = a.baasAccounts.length > 0 ? 1 : 0
        const bHasAcc = b.baasAccounts.length > 0 ? 1 : 0
        if (bHasAcc !== aHasAcc) return bHasAcc - aHasAcc
        return b.walletBalance - a.walletBalance
      })

      setCustomers(normalized)
      setSelectedUserId((prev) => {
        if (prev && normalized.some((c) => c.id === prev)) return prev
        return normalized[0]?.id || ""
      })
      setSelectedAccountIndex(0)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Sandbox Wallet Funder."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const fullName = [c.verifiedName, c.firstName, c.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const nubans = c.baasAccounts
        .map((a) => `${a.nubanAccountNumber || ""} ${a.accountId || ""}`)
        .join(" ")
        .toLowerCase()
      return (
        fullName.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        nubans.includes(q)
      )
    })
  }, [customers, searchQuery])

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedUserId) || null,
    [customers, selectedUserId]
  )

  const selectedAccount = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.baasAccounts.length === 0) return null
    return (
      selectedCustomer.baasAccounts[selectedAccountIndex] ||
      selectedCustomer.baasAccounts[0]
    )
  }, [selectedCustomer, selectedAccountIndex])

  const autoFilledProvider = useMemo(() => {
    if (selectedAccount?.provider) {
      return String(selectedAccount.provider).toUpperCase()
    }
    return "PROVIDUS"
  }, [selectedAccount])

  const autoFilledBankName = useMemo(() => {
    if (selectedAccount?.bankName) return selectedAccount.bankName
    return formatProviderBadge(autoFilledProvider)
  }, [selectedAccount, autoFilledProvider])

  const autoFilledNuban = useMemo(() => {
    if (selectedAccount?.nubanAccountNumber) return selectedAccount.nubanAccountNumber
    if (selectedAccount?.accountId) return selectedAccount.accountId
    return "Virtual NUBAN (Auto-assigned on credit)"
  }, [selectedAccount])

  const handleFundWallet = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer first.")
      return
    }
    const numericAmount = Number(String(amountInput).replace(/,/g, ""))
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid funding amount greater than ₦0.")
      return
    }

    setSubmitting(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch(
        "/api/admin/fcmb-diagnostics/sandbox-wallet-funder/fund",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedCustomer.id,
            accountNumber:
              selectedAccount?.nubanAccountNumber ||
              selectedAccount?.accountId ||
              undefined,
            provider: autoFilledProvider,
            amount: numericAmount,
            narration: narration.trim() || undefined,
          }),
        }
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          payload?.details?.message ||
            payload?.message ||
            "Sandbox wallet funding failed."
        )
      }

      setNotice(
        `Credited ${formatCurrency(numericAmount)} to ${
          payload?.customerName || selectedCustomer.email
        } (${payload?.bankName || autoFilledBankName} · ${
          payload?.accountNumber || autoFilledNuban
        }). New UfitFlex balance: ${formatCurrency(
          Number(payload?.newWalletBalance || 0)
        )} · Ref: ${payload?.reference || "-"}`
      )

      // Update local customer balance immediately
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                walletBalance: Number(
                  payload?.newWalletBalance ?? c.walletBalance + numericAmount
                ),
              }
            : c
        )
      )
      await loadData(searchQuery)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fund sandbox wallet."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const isLocked = statusData !== null && !statusData.sandboxAllowed

  return (
    <PermissionGate
      permissions={["sandbox.wallet.fund"]}
      fallback={
        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-xl rounded-2xl border border-[#f1c4bd] bg-[#fff0ee] p-6 text-center shadow-sm">
            <Lock className="mx-auto size-10 text-[#b44035]" />
            <h2 className="mt-3 text-lg font-bold text-[#6e1f18]">
              Restricted Sandbox Tool
            </h2>
            <p className="mt-1.5 text-sm text-[#8c2f26]">
              You need the <code className="font-mono font-bold">sandbox.wallet.fund</code>{" "}
              (&ldquo;Fund Sandbox Customer Wallets&rdquo;) RBAC permission to access this
              page. Ask a Super Admin to grant it in{" "}
              <strong>Settings &rarr; Team &amp; Access Control</strong>.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-6 p-5 sm:p-8">
        <TreasurySubnav
          title="Sandbox Customer Wallet Funder"
          subtitle="Select a customer, auto-detect their issuing BaaS provider (Providus / Paystack-Titan / FCMB), and credit their UfitFlex wallet for QA testing. Automatically locked in Live mode."
          loading={loading}
          onRefresh={() => void loadData(searchQuery)}
        />

        {/* Environment Safety Banner */}
        {isLocked ? (
          <div className="flex items-start gap-3.5 rounded-xl border border-[#f1c4bd] bg-[#fff0ee] p-4 text-[#8c2f26]">
            <Lock className="mt-0.5 size-5 shrink-0 text-[#b44035]" />
            <div>
              <p className="text-sm font-bold">
                Live Mode Safety Lock Active — Sandbox Funding Disabled
              </p>
              <p className="mt-1 text-xs leading-5">
                {statusData?.lockReason ||
                  "Live BaaS API keys are active and Demo/Sandbox Mode is turned OFF. Simulated wallet credits are blocked so production ledgers can never be polluted."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#a9e6ca] bg-[#eaf9f0] px-4 py-3.5 text-[#13633c]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0 text-[#07845f]" />
              <div>
                <p className="text-sm font-bold">
                  Sandbox / Test Mode Active &middot; RBAC Authorized (
                  <code className="font-mono text-xs">sandbox.wallet.fund</code>)
                </p>
                <p className="text-xs text-[#1f6f48]">
                  Credits settle into the customer&apos;s UfitFlex wallet and trigger an
                  instant push notification on their mobile app. Automatically locks when
                  switched to Live mode.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-full border border-[#8fd9b6] bg-white px-3 py-1 text-[#07845f]">
                Providus: {statusData?.providers?.providus || "SANDBOX"}
              </span>
              <span className="rounded-full border border-[#8fd9b6] bg-white px-3 py-1 text-[#07845f]">
                Paystack: {statusData?.providers?.paystack || "SANDBOX"}
              </span>
            </div>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#a9e6ca] bg-[#eaf9f0] p-4 text-sm font-medium text-[#13633c]">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#07845f]" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[#f1c4bd] bg-[#fff0ee] p-4 text-sm font-medium text-[#a83b31]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b44035]" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          {/* Left Column: Customer Selector & Auto-Filled Provider Form */}
          <div className="space-y-6 rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
            <div>
              <h2 className="text-lg font-bold text-[#18241f]">
                1. Select Customer &amp; Issuing Account
              </h2>
              <p className="mt-1 text-xs text-[#63736b]">
                Search by name, email, phone number, or NUBAN. Selecting a customer
                automatically fills the bank provider that issued their virtual account.
              </p>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#63736b]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void loadData(searchQuery)
                  }}
                  placeholder="Filter by pilgrim name, email, phone, or 10-digit NUBAN..."
                  className="h-10 w-full rounded-lg border border-[#c9d8d0] bg-white pr-3 pl-9 text-sm outline-none focus:border-[#07845f]"
                />
              </div>
              <button
                type="button"
                onClick={() => void loadData(searchQuery)}
                disabled={loading}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#c9d8d0] bg-[#f8fbf9] px-3.5 text-xs font-bold text-[#204236] hover:bg-[#edf5f0]"
              >
                Search DB
              </button>
            </div>

            {/* Customer List Box */}
            <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border border-[#e0e8e3] bg-[#f9fbfa] p-2">
              {loading ? (
                <div className="grid h-36 place-items-center">
                  <Loader2 className="size-5 animate-spin text-[#07845f]" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#63736b]">
                  No matching customers found.
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const fullName =
                    customer.verifiedName ||
                    [customer.firstName, customer.lastName]
                      .filter(Boolean)
                      .join(" ") ||
                    "Pilgrim User"
                  const primaryAcc = customer.baasAccounts[0]
                  const isSelected = customer.id === selectedUserId

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(customer.id)
                        setSelectedAccountIndex(0)
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-[#07845f] bg-[#ecf8f2] shadow-xs"
                          : "border-transparent bg-white hover:border-[#d7e2dc]"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#18241f]">
                            {fullName}
                          </p>
                          {customer.kycStatus === "verified" && (
                            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#15803d]">
                              KYC Verified
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-[#63736b]">
                          {customer.email}
                          {customer.phone ? ` · ${customer.phone}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-[#07845f]">
                          {formatCurrency(customer.walletBalance)}
                        </p>
                        {primaryAcc ? (
                          <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#204236]">
                            {String(primaryAcc.provider || "PROVIDUS").toUpperCase()} &middot;{" "}
                            {primaryAcc.nubanAccountNumber || primaryAcc.accountId}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-[#8c6b26]">
                            No NUBAN yet
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Auto-Filled Issuing Provider & Account Card */}
            {selectedCustomer && (
              <div className="space-y-4 rounded-xl border border-[#cbe4d6] bg-[#f4faf6] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#07845f]">
                    <UserCheck className="size-4" /> Auto-Filled Issuing Bank &amp; Account
                  </div>
                  <span className="rounded-full border border-[#a9e6ca] bg-white px-2.5 py-0.5 text-xs font-bold text-[#13633c]">
                    Current Balance: {formatCurrency(selectedCustomer.walletBalance)}
                  </span>
                </div>

                {selectedCustomer.baasAccounts.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-[#204236]">
                      Select Issued Virtual Account
                    </label>
                    <select
                      value={selectedAccountIndex}
                      onChange={(e) => setSelectedAccountIndex(Number(e.target.value))}
                      className="mt-1 h-9 w-full rounded-lg border border-[#b9ccc2] bg-white px-3 text-xs font-semibold text-[#18241f]"
                    >
                      {selectedCustomer.baasAccounts.map((acc, idx) => (
                        <option key={`${acc.id || idx}`} value={idx}>
                          {String(acc.provider || "PROVIDUS").toUpperCase()} —{" "}
                          {acc.nubanAccountNumber || acc.accountId} ({acc.bankName || "Bank"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#63736b]">
                      <Building2 className="size-3.5 text-[#07845f]" /> Issuing Provider
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#18241f]">
                      {autoFilledProvider}
                    </p>
                    <p className="text-[11px] text-[#63736b]">{autoFilledBankName}</p>
                  </div>

                  <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#63736b]">
                      <CreditCard className="size-3.5 text-[#07845f]" /> Virtual NUBAN
                    </div>
                    <p className="mt-1 font-mono text-sm font-bold text-[#18241f]">
                      {autoFilledNuban}
                    </p>
                    <p className="text-[11px] text-[#63736b]">
                      Tier {selectedAccount?.activeTier || 1} Account
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#63736b]">
                      <Wallet className="size-3.5 text-[#07845f]" /> Target Wallet
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#18241f]">
                      UfitFlex Balance
                    </p>
                    <p className="truncate text-[11px] text-[#63736b]">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount & Narration Form */}
            <div className="space-y-4 border-t border-[#e5ede8] pt-4">
              <div>
                <label
                  htmlFor="sandbox-fund-amount"
                  className="block text-sm font-bold text-[#18241f]"
                >
                  2. Amount to Credit (NGN)
                </label>
                <input
                  id="sandbox-fund-amount"
                  type="number"
                  min={100}
                  max={50000000}
                  disabled={isLocked || submitting}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#b9ccc2] bg-white px-3.5 text-base font-bold text-[#18241f] outline-none focus:border-[#07845f] disabled:bg-[#f3f6f4]"
                  placeholder="e.g. 100000"
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {AMOUNT_PRESETS.map((preset) => {
                    const active = Number(amountInput) === preset
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isLocked || submitting}
                        onClick={() => setAmountInput(String(preset))}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                          active
                            ? "border-[#07845f] bg-[#07845f] text-white"
                            : "border-[#c9d8d0] bg-[#f8fbf9] text-[#204236] hover:bg-[#edf5f0]"
                        }`}
                      >
                        +₦{preset.toLocaleString("en-NG")}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="sandbox-fund-narration"
                  className="block text-xs font-bold text-[#204236]"
                >
                  Transaction Narration (Optional)
                </label>
                <input
                  id="sandbox-fund-narration"
                  type="text"
                  disabled={isLocked || submitting}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#c9d8d0] bg-white px-3 text-sm outline-none focus:border-[#07845f] disabled:bg-[#f3f6f4]"
                  placeholder="Sandbox QA Test Wallet Deposit"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleFundWallet()}
                disabled={isLocked || submitting || !selectedCustomer}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#07845f] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#05684a] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {isLocked
                  ? "Locked in Live Mode"
                  : selectedCustomer
                    ? `Credit ${formatCurrency(Number(amountInput || 0))} via ${autoFilledProvider}`
                    : "Select a Customer to Fund"}
              </button>
            </div>
          </div>

          {/* Right Column: Recent Sandbox Credits Audit Log */}
          <div className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
            <div className="flex items-center justify-between border-b border-[#e5ede8] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#18241f]">
                  Recent Sandbox Wallet Credits
                </h2>
                <p className="mt-0.5 text-xs text-[#63736b]">
                  Audit trail of simulated test deposits credited via this tool.
                </p>
              </div>
              <span className="rounded-full bg-[#edf5f0] px-2.5 py-1 text-xs font-bold text-[#204236]">
                {statusData?.recentCredits?.length || 0} recent
              </span>
            </div>

            {!statusData?.recentCredits || statusData.recentCredits.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#c9d8d0] p-8 text-center text-xs text-[#63736b]">
                No sandbox wallet credits have been triggered yet.
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {statusData.recentCredits.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#e3ece7] bg-[#fbfdfc] p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#18241f]">
                        {item.customerName || item.customerEmail || "Customer"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#5c6d64]">
                        {item.description || "Sandbox wallet deposit"}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[#718079]">
                        {item.reference} &middot; {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-full border border-[#a9e6ca] bg-[#eaf9f0] px-2.5 py-1 text-xs font-bold text-[#13633c]">
                        +{formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PermissionGate>
  )
}
