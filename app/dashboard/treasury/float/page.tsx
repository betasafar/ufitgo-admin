"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Database, Target, Users } from "lucide-react"
import { TreasurySubnav } from "@/components/treasury/treasury-subnav"

type UfitSaveRecord = {
  id: string
  userId: string | null
  userName: string
  userEmail: string | null
  title: string
  currentAmount: number
  targetAmount: number
  status: string
  lockedUntil: string | null
  createdAt: string
}

type WefitGroupMemberRecord = {
  id: string
  userId: string
  name: string
  role: string
  status: string
  netContributed: number
  totalContributed: number
  totalWithdrawn: number
  joinedAt: string
}

type WefitGroupTxRecord = {
  id: string
  userId: string
  memberName: string
  type: string
  method: string
  amount: number
  reference: string
  status: string
  createdAt: string
}

type WefitGroupRecord = {
  id: string
  title: string
  category: string
  inviteCode: string
  currentAmount: number
  targetAmount: number
  deadline: string | null
  contributionFrequency: string
  status: string
  adminUserId: string
  adminName: string
  activeMembersCount: number
  pendingMembersCount: number
  createdAt: string
  members: WefitGroupMemberRecord[]
  transactions: WefitGroupTxRecord[]
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
  ufitSaveRecords?: UfitSaveRecord[]
  wefitSaveRecords?: {
    groups: WefitGroupRecord[]
  }
}

export default function TreasuryFloatPage() {
  const [treasury, setTreasury] = useState<TreasuryReconciliation | null>(null)
  const [subaccountBankCode, setSubaccountBankCode] = useState("101")
  const [subaccountAccountNumber, setSubaccountAccountNumber] = useState("")
  const [subaccountBusinessName, setSubaccountBusinessName] = useState("UfitGo Corporate Revenue")
  const [creatingSubaccount, setCreatingSubaccount] = useState(false)
  const [createdSubaccountCode, setCreatedSubaccountCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [recordsTab, setRecordsTab] = useState<"wefitsave" | "ufitsave">("wefitsave")
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const treasuryResponse = await fetch("/api/admin/fcmb-diagnostics/treasury-reconciliation", {
        cache: "no-store",
      })
      const treasuryPayload = await treasuryResponse.json().catch(() => null)
      if (treasuryPayload?.customerLiability) {
        setTreasury(treasuryPayload)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load treasury float reconciliation.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createRevenueSubaccount = async () => {
    const cleanNuban = subaccountAccountNumber.trim()
    if (cleanNuban.length !== 10) {
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
    <div className="space-y-6 p-5 sm:p-8">
      <TreasurySubnav
        title="Float & Revenue Separation"
        subtitle="Track customer custodial float (Bucket A) vs. UfitGo earned revenue (Bucket B) and configure automated Paystack revenue subaccounts."
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
        <div className="flex flex-col gap-3 border-b border-[#e5ede8] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
              <Database className="size-4" /> Providus Settlement &amp; Paystack Treasury Separation
            </div>
            <h2 className="mt-1 text-lg font-bold">
              Customer Custodial Float vs. UfitGo Earned Revenue
            </h2>
            <p className="mt-0.5 text-xs text-[#63736b]">
              Paystack sweeps DVA &amp; checkout collections (T+1) into your Providus Settlement Account. Keep{" "}
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
                <span>UfitFlex Balances ({treasury?.customerLiability?.ufitFlex?.fundedWalletsCount ?? 0} active):</span>
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
              Unlocked UfitGo revenue earned from fees, commissions &amp; passes:
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
                <span>Open Slot Pass &amp; Intelligence Sales:</span>
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

      {/* UfitSave & WefitSave Live Records Explorer */}
      <section className="rounded-xl border border-[#d7e2dc] bg-white p-5 shadow-[0_10px_30px_rgba(20,55,40,0.06)]">
        <div className="flex flex-col gap-3 border-b border-[#e5ede8] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
              <Users className="size-4" /> Savings Plans &amp; Group Pools Explorer
            </div>
            <h2 className="mt-1 text-lg font-bold text-[#18241f]">
              WefitSave Group Pools &amp; UfitSave Personal Plans
            </h2>
            <p className="mt-0.5 text-xs text-[#63736b]">
              Inspect every active group pool, invite code, member approval status, individual sub-ledger balance, and personal UfitSave goal.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-[#c9d8d0] bg-[#f4f8f6] p-1">
            <button
              type="button"
              onClick={() => setRecordsTab("wefitsave")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                recordsTab === "wefitsave"
                  ? "bg-[#07845f] text-white shadow-sm"
                  : "text-[#204236] hover:bg-white"
              }`}
            >
              <Users className="size-3.5" />
              WefitSave Groups ({treasury?.wefitSaveRecords?.groups?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setRecordsTab("ufitsave")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                recordsTab === "ufitsave"
                  ? "bg-[#07845f] text-white shadow-sm"
                  : "text-[#204236] hover:bg-white"
              }`}
            >
              <Target className="size-3.5" />
              UfitSave Personal ({treasury?.ufitSaveRecords?.length ?? 0})
            </button>
          </div>
        </div>

        {recordsTab === "wefitsave" ? (
          <div className="mt-4 space-y-3">
            {!treasury?.wefitSaveRecords?.groups?.length ? (
              <div className="rounded-xl border border-dashed border-[#c9d8d0] bg-[#f9fbfa] p-8 text-center text-sm text-[#63736b]">
                No WefitSave group pools created yet.
              </div>
            ) : (
              treasury.wefitSaveRecords.groups.map((group) => {
                const isExpanded = expandedGroupId === group.id
                const progress =
                  group.targetAmount > 0
                    ? Math.min(Math.round((group.currentAmount / group.targetAmount) * 100), 100)
                    : 0
                return (
                  <div
                    key={group.id}
                    className="overflow-hidden rounded-xl border border-[#d7e2dc] bg-[#fcfefd]"
                  >
                    <div
                      onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                      className="flex cursor-pointer flex-col gap-3 p-4 hover:bg-[#f4f9f6] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-[#18241f]">
                            {group.title}
                          </span>
                          <span className="rounded-md bg-[#ede9fe] px-2 py-0.5 font-mono text-[11px] font-bold text-[#6d28d9]">
                            {group.inviteCode}
                          </span>
                          <span className="rounded-full bg-[#e6f6ef] px-2 py-0.5 text-[10px] font-bold uppercase text-[#07845f]">
                            {group.status}
                          </span>
                          {group.pendingMembersCount > 0 && (
                            <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                              {group.pendingMembersCount} Pending Approval
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#5c6d64]">
                          Admin: <strong className="text-[#18241f]">{group.adminName}</strong> ·{" "}
                          {group.activeMembersCount} Approved Member{group.activeMembersCount === 1 ? "" : "s"} ·{" "}
                          Schedule: <strong>{group.contributionFrequency}</strong> · Maturity:{" "}
                          <strong>{group.deadline || "Flexible"}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-[#07845f]">
                            ₦{Number(group.currentAmount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}{" "}
                            <span className="text-xs font-semibold text-[#5c6d64]">
                              / ₦{Number(group.targetAmount).toLocaleString("en-NG")} ({progress}%)
                            </span>
                          </div>
                          <div className="text-[11px] text-[#63736b]">
                            Click to {isExpanded ? "hide" : "view"} members &amp; ledger
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-[#5c6d64]" />
                        ) : (
                          <ChevronDown className="size-4 text-[#5c6d64]" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#e5ede8] bg-white p-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          {/* Group Members Sub-Ledger */}
                          <div>
                            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#204236]">
                              Group Members ({group.members.length})
                            </h4>
                            <div className="overflow-hidden rounded-lg border border-[#e5ede8]">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-[#f4f8f6] text-[10px] uppercase text-[#5c6d64]">
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Member</th>
                                    <th className="px-3 py-2 font-bold">Role / Status</th>
                                    <th className="px-3 py-2 text-right font-bold">Net Saved</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#edf2ef]">
                                  {group.members.map((m) => (
                                    <tr key={m.id}>
                                      <td className="px-3 py-2 font-bold text-[#18241f]">
                                        <Link
                                          href={`/dashboard/customers/${m.userId}?tab=financials`}
                                          className="hover:text-[#07845f] hover:underline"
                                        >
                                          {m.name}
                                        </Link>
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="mr-1.5 text-[11px] text-[#5c6d64]">{m.role}</span>
                                        <span
                                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            m.status === "ACTIVE"
                                              ? "bg-[#dcfce7] text-[#15803d]"
                                              : "bg-[#fef3c7] text-[#b45309]"
                                          }`}
                                        >
                                          {m.status === "ACTIVE" ? "Approved" : "Pending Admin"}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-[#18241f]">
                                        ₦{Number(m.netContributed).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Recent Group Transactions */}
                          <div>
                            <h4 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-[#204236]">
                              Recent Group Ledger ({group.transactions.length})
                            </h4>
                            {group.transactions.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-[#d7e2dc] p-4 text-center text-xs text-[#63736b]">
                                No contributions or withdrawals recorded yet.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-[#e5ede8]">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#f4f8f6] text-[10px] uppercase text-[#5c6d64]">
                                    <tr>
                                      <th className="px-3 py-2 font-bold">Member</th>
                                      <th className="px-3 py-2 font-bold">Type / Status</th>
                                      <th className="px-3 py-2 text-right font-bold">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#edf2ef]">
                                    {group.transactions.map((tx) => (
                                      <tr key={tx.id}>
                                        <td className="px-3 py-2 font-medium text-[#18241f]">
                                          {tx.memberName}
                                          <div className="font-mono text-[10px] text-[#63736b]">
                                            {tx.reference}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2">
                                          <span
                                            className={`font-bold ${
                                              tx.type === "WITHDRAWAL"
                                                ? "text-[#b45309]"
                                                : "text-[#07845f]"
                                            }`}
                                          >
                                            {tx.type}
                                          </span>
                                          <div className="text-[10px] text-[#63736b]">{tx.status}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-[#18241f]">
                                          {tx.type === "WITHDRAWAL" ? "-" : "+"}₦
                                          {Number(tx.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[#d7e2dc]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f8f6] text-[10px] uppercase tracking-wider text-[#5c6d64]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Goal Title</th>
                    <th className="px-4 py-3 font-bold">Saved Balance</th>
                    <th className="px-4 py-3 font-bold">Target Amount</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Maturity / Lock Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf2ef]">
                  {!treasury?.ufitSaveRecords?.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#63736b]">
                        No UfitSave personal goals found.
                      </td>
                    </tr>
                  ) : (
                    treasury.ufitSaveRecords.map((goal) => (
                      <tr key={goal.id} className="hover:bg-[#f9fbfa]">
                        <td className="px-4 py-3 font-bold text-[#18241f]">
                          {goal.userId ? (
                            <Link
                              href={`/dashboard/customers/${goal.userId}?tab=financials`}
                              className="hover:text-[#07845f] hover:underline"
                            >
                              {goal.userName}
                            </Link>
                          ) : (
                            goal.userName
                          )}
                          {goal.userEmail && (
                            <div className="text-[11px] font-normal text-[#63736b]">{goal.userEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#18241f]">{goal.title}</td>
                        <td className="px-4 py-3 font-extrabold text-[#07845f]">
                          ₦{Number(goal.currentAmount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#5c6d64]">
                          ₦{Number(goal.targetAmount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-[#e6f6ef] px-2.5 py-0.5 text-[10px] font-bold text-[#07845f]">
                            {goal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#5c6d64]">
                          {goal.lockedUntil
                            ? new Date(goal.lockedUntil).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Flexible"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
