"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  CircleAlert,
  Lock,
  Mail,
  MessageCircle,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react"
import { useAdminSession } from "@/components/auth/session-provider"

type SystemConfig = {
  features?: Record<string, boolean>
  fees?: { savingsBreakPenaltyPercent?: number }
  savingsConfig?: { gracePeriodDays?: number; dropThresholdDays?: number }
  tiers?: Array<{
    provider: string
    tierLevel: number
    name: string
    maxBalanceLimit: number
    singleTransactionLimit: number
    dailyTransactionLimit: number
    requiredDocuments: string[]
  }>
}

type PlatformSetting = { key: string; value?: string; description?: string }

const featureToggles = [
  { key: "enableTravelFx", label: "Travel FX", desc: "Enable foreign exchange and currency swap features." },
  { key: "enableAiAdvisor", label: "AI Advisor (Lima)", desc: "Enable Lima chat, recommendations, proactive prompts, and AI package assistance." },
  { key: "enableVisaProgress", label: "Visa progress", desc: "Enable internal visa status updates, customer timeline, and the official Saudi portal link." },
  { key: "enablePassportAssist", label: "Passport assist", desc: "Enable passport application and renewal services." },
  { key: "enableTravelDocs", label: "Travel documents", desc: "Enable visa processing and travel document services." },
  { key: "enableTargetSavings", label: "Target savings", desc: "Enable user target savings plans for travel." },
  { key: "enableProactiveAdvisorNudge", label: "Proactive AI nudge", desc: "Show a bottom-sheet inviting users to chat with the AI Advisor after repeated zero-result searches." },
  { key: "enableReferralProgram", label: "Referral & rewards", desc: "Enable the refer & earn program (signup and package-sale bonuses) across the app." },
  { key: "enableOperatorDirectory", label: "Operator directory", desc: "Show the browsable \"All Operators\" list in the app. Consider keeping off while onboarding few operators." },
]

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "features", label: "Platform features", icon: SettingsIcon },
  { id: "fees", label: "Fees & automation", icon: SlidersHorizontal },
  { id: "support", label: "Support contact", icon: MessageCircle },
  { id: "security", label: "Security", icon: Lock },
] as const

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "UA"
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-[#0d7d5f]" : "bg-[#d9dfdc]"}`}
    >
      <span className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

export default function SettingsPage() {
  const { admin } = useAdminSession()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("profile")

  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [savingFeature, setSavingFeature] = useState<string | null>(null)

  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [savingWhatsapp, setSavingWhatsapp] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3500)
  }

  const loadConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", { cache: "no-store" })
      const payload = await response.json().catch(() => null)
      setConfig(payload?.data || payload || {})
    } finally {
      setConfigLoading(false)
    }
  }

  const loadPlatformSettings = async () => {
    const response = await fetch("/api/admin/platform-settings", { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    const list: PlatformSetting[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
    setPlatformSettings(list)
    setWhatsappNumber(list.find((setting) => setting.key === "SUPPORT_WHATSAPP_NUMBER")?.value || "")
  }

  useEffect(() => {
    void loadConfig()
    void loadPlatformSettings()
  }, [])

  async function toggleFeature(key: string, current: boolean) {
    setSavingFeature(key)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: { [key]: !current } }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({ ...prev, features: { ...prev?.features, [key]: !current } }))
      showToast("success", `${featureToggles.find((f) => f.key === key)?.label} is now ${!current ? "active" : "inactive"}.`)
    } catch {
      showToast("error", "Failed to update this feature.")
    } finally {
      setSavingFeature(null)
    }
  }

  async function saveFeeField(field: "fees" | "savingsConfig", key: string, value: number) {
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: { [key]: value } }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({ ...prev, [field]: { ...(prev as any)?.[field], [key]: value } }))
      showToast("success", "Setting saved.")
    } catch {
      showToast("error", "Failed to save this setting.")
    }
  }

  async function saveTierLimit(provider: string, tierLevel: number, key: "maxBalanceLimit" | "singleTransactionLimit" | "dailyTransactionLimit", value: number) {
    const tier = config?.tiers?.find((item) => item.provider === provider && item.tierLevel === tierLevel)
    if (!tier || value < 0) return
    try {
      const updatedTier = { ...tier, [key]: value }
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: [updatedTier] }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({
        ...previous,
        tiers: previous?.tiers?.map((item) => item.provider === provider && item.tierLevel === tierLevel ? updatedTier : item),
      }))
      showToast("success", `${provider} Tier ${tierLevel} limit saved.`)
    } catch {
      showToast("error", `Failed to save ${provider} Tier ${tierLevel} limit.`)
    }
  }

  async function saveWhatsappNumber() {
    const value = whatsappNumber.trim()
    if (!value) return
    setSavingWhatsapp(true)
    try {
      const response = await fetch("/api/admin/platform-settings/SUPPORT_WHATSAPP_NUMBER", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, description: "Official UfitGo WhatsApp support number for inquiries." }),
      })
      if (!response.ok) throw new Error()
      showToast("success", "Support number updated.")
      void loadPlatformSettings()
    } catch {
      showToast("error", "Failed to update support number.")
    } finally {
      setSavingWhatsapp(false)
    }
  }

  async function submitPasswordChange(event: React.FormEvent) {
    event.preventDefault()
    setPasswordMessage(null)
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." })
      return
    }
    setPasswordSaving(true)
    try {
      const response = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Failed to update password.")
      setPasswordMessage({ type: "success", text: "Password updated successfully." })
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (requestError) {
      setPasswordMessage({ type: "error", text: requestError instanceof Error ? requestError.message : "Failed to update password." })
    } finally {
      setPasswordSaving(false)
    }
  }

  const penaltyPercent = useMemo(() => Number(config?.fees?.savingsBreakPenaltyPercent ?? 0.9), [config])
  const gracePeriodDays = useMemo(() => Number(config?.savingsConfig?.gracePeriodDays ?? 3), [config])
  const dropThresholdDays = useMemo(() => Number(config?.savingsConfig?.dropThresholdDays ?? 30), [config])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Administration</p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">Platform settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68716d]">Manage remote feature flags, automation rules, support contact details, and your own account security.</p>
      </header>

      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === "success" ? "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]" : "border-[#f4d0ca] bg-[#fff0ee] text-[#a43229]"}`}>
          {toast.type === "success" ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
          {toast.text}
        </div>
      )}

      <div className="border-b border-[#d9dfdc]">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${isActive ? "text-[#0d7d5f]" : "text-[#68716d] hover:text-[#17201c]"}`}
              >
                <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#0d7d5f] ${isActive ? "opacity-100" : "opacity-0"}`} />
                <Icon className="relative z-10 size-4" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === "profile" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-2xl bg-[#eaf9f3] text-2xl font-bold text-[#0d7d5f]">{initials(admin.name)}</span>
            <div>
              <h2 className="font-brand text-xl font-bold text-[#17201c]">{admin.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#68716d]"><ShieldCheck className="size-4 text-[#0d7d5f]" /> {admin.role.replaceAll("_", " ")}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 border-t border-[#edf1ef] pt-6 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f7faf9] text-[#66716c]"><Mail className="size-4" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">Email address</p>
                <p className="truncate text-sm font-semibold text-[#17201c]">{admin.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f7faf9] text-[#66716c]"><ShieldCheck className="size-4" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9aa39e]">Access level</p>
                <p className="truncate text-sm font-semibold text-[#17201c]">{admin.permissions.includes("*") ? "Full platform access" : `${admin.permissions.length} permission${admin.permissions.length === 1 ? "" : "s"} granted`}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "features" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Platform features</h2>
          <p className="mt-1 text-sm text-[#68716d]">Toggle features on or off globally — changes take effect immediately across the mobile app.</p>
          {configLoading ? (
            <div className="mt-8 grid place-items-center"><div className="size-6 animate-spin rounded-full border-2 border-[#0d7d5f] border-t-transparent" /></div>
          ) : (
            <div className="mt-5 space-y-3">
              {featureToggles.map((feature) => {
                const isActive = Boolean(config?.features?.[feature.key])
                return (
                  <div key={feature.key} className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
                    <div>
                      <p className="font-bold text-[#17201c]">{feature.label}</p>
                      <p className="mt-0.5 text-xs text-[#7b8580]">{feature.desc}</p>
                    </div>
                    <ToggleSwitch checked={isActive} disabled={savingFeature === feature.key} onChange={() => void toggleFeature(feature.key, isActive)} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "fees" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Fees & savings automation</h2>
          <p className="mt-1 text-sm text-[#68716d]">Numbers that drive automated penalties and savings-plan enforcement.</p>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
              <div className="max-w-md">
                <p className="font-bold text-[#17201c]">Savings break penalty</p>
                <p className="mt-0.5 text-xs text-[#7b8580]">Percentage applied when a user breaks their savings goal before the target date.</p>
              </div>
              <div className="rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
                <div>
                  <p className="font-bold text-[#17201c]">KYC tier limits</p>
                  <p className="mt-0.5 text-xs text-[#7b8580]">These limits apply immediately to wallet and savings enforcement.</p>
                </div>
                <div className="mt-4 space-y-3">
                  {(config?.tiers || []).map((tier) => (
                    <div key={`${tier.provider}-${tier.tierLevel}`} className="grid gap-3 border-t border-[#dbe2de] pt-3 md:grid-cols-4">
                      <div>
                        <p className="text-sm font-bold text-[#17201c]">{tier.provider} {tier.name}</p>
                        <p className="mt-0.5 text-xs text-[#7b8580]">Tier {tier.tierLevel}</p>
                      </div>
                      <label className="text-xs font-semibold text-[#68716d]">Maximum balance
                        <input type="number" min="0" defaultValue={tier.maxBalanceLimit} key={`${tier.provider}-${tier.tierLevel}-balance-${tier.maxBalanceLimit}`} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) void saveTierLimit(tier.provider, tier.tierLevel, "maxBalanceLimit", value) }} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                      </label>
                      <label className="text-xs font-semibold text-[#68716d]">Per transaction
                        <input type="number" min="0" defaultValue={tier.singleTransactionLimit} key={`${tier.provider}-${tier.tierLevel}-single-${tier.singleTransactionLimit}`} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) void saveTierLimit(tier.provider, tier.tierLevel, "singleTransactionLimit", value) }} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                      </label>
                      <label className="text-xs font-semibold text-[#68716d]">Daily outgoing
                        <input type="number" min="0" defaultValue={tier.dailyTransactionLimit} key={`${tier.provider}-${tier.tierLevel}-daily-${tier.dailyTransactionLimit}`} onBlur={(event) => { const value = Number(event.target.value); if (Number.isFinite(value)) void saveTierLimit(tier.provider, tier.tierLevel, "dailyTransactionLimit", value) }} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" min="0" max="100" defaultValue={penaltyPercent.toFixed(2)} key={`penalty-${penaltyPercent}`} onBlur={(event) => { const val = parseFloat(event.target.value); if (!Number.isNaN(val)) void saveFeeField("fees", "savingsBreakPenaltyPercent", val) }} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
              <div className="max-w-md">
                <p className="font-bold text-[#17201c]">Missed payment grace period</p>
                <p className="mt-0.5 text-xs text-[#7b8580]">Days before a missed savings milestone is flagged for restructuring.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="30" defaultValue={gracePeriodDays} key={`grace-${gracePeriodDays}`} onBlur={(event) => { const val = parseInt(event.target.value, 10); if (!Number.isNaN(val)) void saveFeeField("savingsConfig", "gracePeriodDays", val) }} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">days</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
              <div className="max-w-md">
                <p className="font-bold text-[#17201c]">Drop threshold limit</p>
                <p className="mt-0.5 text-xs text-[#7b8580]">Days before departure where users below 80% funding are dropped from the package.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="90" defaultValue={dropThresholdDays} key={`drop-${dropThresholdDays}`} onBlur={(event) => { const val = parseInt(event.target.value, 10); if (!Number.isNaN(val)) void saveFeeField("savingsConfig", "dropThresholdDays", val) }} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">days</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "support" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Support contact</h2>
          <p className="mt-1 text-sm text-[#68716d]">Powers the &ldquo;Chat with support on WhatsApp&rdquo; links shown across the mobile app.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Support WhatsApp number</label>
              <input value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="+234..." className="h-11 w-full max-w-sm rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <button type="button" onClick={() => void saveWhatsappNumber()} disabled={savingWhatsapp} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
              {savingWhatsapp ? <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="size-4" />} Save
            </button>
          </div>
          {platformSettings.length > 0 && (
            <p className="mt-3 text-xs text-[#9aa39e]">Include the country code, e.g. +2348148804448.</p>
          )}
        </section>
      )}

      {activeTab === "security" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Security & authentication</h2>
          <p className="mt-1 text-sm text-[#68716d]">Update the password for your own admin account.</p>

          {passwordMessage && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${passwordMessage.type === "success" ? "border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]" : "border-[#f4d0ca] bg-[#fff0ee] text-[#a43229]"}`}>
              {passwordMessage.type === "success" ? <CheckCircle2 className="size-4" /> : <CircleAlert className="size-4" />}
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={submitPasswordChange} className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Current password</label>
              <input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="••••••••" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">New password</label>
              <input type="password" required minLength={8} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="••••••••" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#78817d]">Confirm new password</label>
              <input type="password" required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="••••••••" className="h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]" />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" disabled={passwordSaving} className="inline-flex h-11 min-w-[180px] items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-5 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
                {passwordSaving ? <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="size-4" />} Update password
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
