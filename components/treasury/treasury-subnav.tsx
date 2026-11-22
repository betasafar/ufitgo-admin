"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Banknote, CreditCard, Database, ListChecks, Radio, RefreshCw, ShieldAlert } from "lucide-react"
import { useCan } from "@/components/auth/permission-gate"
import type { Permission } from "@/lib/rbac/permissions"

const TREASURY_TABS: Array<{
  label: string
  href: string
  icon: typeof Database
  permissions?: readonly Permission[]
}> = [
  { label: "Float & Revenue", href: "/dashboard/treasury/float", icon: Database },
  { label: "BaaS Routing & Health", href: "/dashboard/treasury/providers", icon: ShieldAlert },
  { label: "DVA & Ledger Recon", href: "/dashboard/treasury/reconciliation", icon: ListChecks },
  { label: "Stuck Withdrawals", href: "/dashboard/treasury/withdrawals", icon: Banknote },
  { label: "Webhooks & Sandbox", href: "/dashboard/treasury/webhooks", icon: Radio },
  {
    label: "Sandbox Wallet Funder",
    href: "/dashboard/treasury/sandbox-funder",
    icon: CreditCard,
    permissions: ["sandbox.wallet.fund"],
  },
]

export function TreasurySubnav({
  title,
  subtitle,
  loading,
  onRefresh,
}: Readonly<{
  title: string
  subtitle: string
  loading?: boolean
  onRefresh?: () => void
}>) {
  const pathname = usePathname()
  const can = useCan()
  const visibleTabs = TREASURY_TABS.filter(
    (tab) => !tab.permissions || can(tab.permissions, "all")
  )

  return (
    <div className="mb-6 border-b border-[#d7e2dc] pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
            <Radio className="size-4" /> Treasury &amp; Multi-Provider BaaS Control
          </div>
          <h1 className="mt-1.5 text-2xl font-bold text-[#18241f] sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-[#5c6d64]">{subtitle}</p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b9ccc2] bg-white px-4 text-sm font-bold text-[#204236] hover:bg-[#edf5f0] disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition ${
                active
                  ? "border-[#07845f] bg-[#07845f] text-white shadow-sm"
                  : "border-[#c9d8d0] bg-white text-[#204236] hover:bg-[#edf5f0]"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
