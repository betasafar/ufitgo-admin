"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
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

type IntelligenceConfig = {
  finderMode?: "disabled" | "free" | "paid"
  comparisonMode?: "disabled" | "free" | "paid"
  hajjPilotMode?: "disabled" | "free" | "paid"
  hajjPrice?: number
  hajjEndsOn?: string | null
  umrahPrice?: number
  ramadanPrice?: number
  ramadanStartsOn?: string | null
  ramadanEndsOn?: string | null
  openSlotPasses?: Partial<Record<"hajj" | "ramadan" | "umrah", OpenSlotPassConfig>>
  earlyAccess?: Partial<Record<"hajj" | "ramadan" | "umrah", number>>
}

type OpenSlotPassConfig = {
  mode: "disabled" | "paid"
  basePrice: number
  plusPrice: number
  startsOn?: string | null
  endsOn?: string | null
  durationDays?: number
}

const defaultOpenSlotPasses: Record<"hajj" | "ramadan" | "umrah", OpenSlotPassConfig> = {
  hajj: { mode: "paid", basePrice: 2600, plusPrice: 5300, endsOn: null },
  ramadan: { mode: "disabled", basePrice: 2600, plusPrice: 5300, startsOn: null, endsOn: null },
  umrah: { mode: "paid", basePrice: 2600, plusPrice: 5300, durationDays: 30 },
}

type HajjSeasonCampaignConfig = {
  mode: "planning" | "live" | "hidden"
  seasonLabel: string
  rolloverAnnouncement?: string | null
}

type HalalLockTierConfig = {
  days: 90 | 180 | 270 | 365
  label: string
  shortLabel: string
  annualRatePercent: number
  badge?: string
  subtitle: string
  enabled: boolean
}

type HalalLockConfig = {
  minAmount: number
  allowMudarabahProfit: boolean
  allowPrincipalOnly: boolean
  tiers: HalalLockTierConfig[]
}

type PilgrimFxConfig = {
  wholesaleNgnPerUsd: number
  sellSpreadPercent: number
  buyBackSpreadPercent: number
  virtualCardFeeUsd: number
  physicalCardFeeNgn: number
}

const defaultPilgrimFxConfig: PilgrimFxConfig = {
  wholesaleNgnPerUsd: 1600,
  sellSpreadPercent: 1.5,
  buyBackSpreadPercent: 1.0,
  virtualCardFeeUsd: 3,
  physicalCardFeeNgn: 8500,
}

const defaultHalalLockConfig: HalalLockConfig = {
  minAmount: 100000,
  allowMudarabahProfit: true,
  allowPrincipalOnly: true,
  tiers: [
    {
      days: 90,
      label: "90 Days (3 Months)",
      shortLabel: "90 Days",
      annualRatePercent: 10,
      badge: "Minimum",
      subtitle: "Ideal for upcoming Umrah visa & ticket funds",
      enabled: true,
    },
    {
      days: 180,
      label: "180 Days (6 Months)",
      shortLabel: "180 Days",
      annualRatePercent: 12,
      badge: "Popular",
      subtitle: "Best balance for 6-month travel & goals",
      enabled: true,
    },
    {
      days: 270,
      label: "270 Days (9 Months)",
      shortLabel: "270 Days",
      annualRatePercent: 13.5,
      badge: "",
      subtitle: "Higher profit share for 9-month Hajj prep",
      enabled: true,
    },
    {
      days: 365,
      label: "365 Days (1 Year)",
      shortLabel: "365 Days",
      annualRatePercent: 15,
      badge: "Max Yield",
      subtitle: "Lock lump sum for next year Hajj pilgrimage",
      enabled: true,
    },
  ],
}

type SystemConfig = {
  features?: Record<string, boolean | string | string[]>
  demoMode?: boolean
  fees?: {
    savingsEarlyExitChargePercent?: number
    savingsEarlyExitChargeCap?: number
    savingsBreakPenaltyPercent?: number
    wefitSystemMinContribution?: number
    wefitGroupAdminMinFloor?: number
    ufitflexMinWithdrawal?: number
    ufitflexFreeWithdrawalsPerMonth?: number
    ufitflexExcessWithdrawalFee?: number
  }
  savingsConfig?: {
    gracePeriodDays?: number
    dropThresholdDays?: number
    scheduleEnforcement?: "report" | "notify" | "enforce"
    autoSaveMinMove?: number
    faceCheckThreshold?: number
    postChangeCapEnabled?: boolean
    postChangeCapAmount?: number
    postChangeCapHours?: number
    intelligence?: IntelligenceConfig
    hajjSeasonCampaign?: HajjSeasonCampaignConfig
    halalLock?: HalalLockConfig
    pilgrimFx?: PilgrimFxConfig
  }
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
type TierLimitKey = "maxBalanceLimit" | "singleTransactionLimit" | "dailyTransactionLimit"
type TierLimitDraft = Partial<Record<TierLimitKey, string>>
const feeCardIds = ["early-exit", "ufitflex-withdrawals", "wefit-save", "pilgrim-fx", "halal-lock", "intelligence", "kyc-tiers", "plan-check", "auto-save", "face-check", "post-change-cap", "grace-period", "drop-threshold"] as const
type FeeCardId = (typeof feeCardIds)[number]

const featureToggles: Array<{
  key: string
  badgeId?: string
  label: string
  desc: string
  superAdminOnly?: boolean
}> = [
  { key: "enableConciergeCalls", label: "In-App Concierge Voice Calls", desc: "Enable free in-app Agora voice calls between pilgrims and the admin Concierge Call Desk.", superAdminOnly: true },
  { key: "enablePilgrimFxAccount", badgeId: "fx", label: "Travel FX (SAR / USD Account & Cards)", desc: "Enable the Travel FX SAR / USD Virtual Account, 1-click Virtual Card, Physical Contactless Card ordering, and NFC Tap-to-Pay." },
  { key: "enablePilgrimFxConvertBack", label: "Allow Convert Back (SAR / USD → NGN)", desc: "Allow returning travellers to convert unspent SAR/USD back into their UfitFlex Naira balance. Keep OFF in Year 1 to lock in repeat trip retention." },
  { key: "enableCurrencyCalculator", badgeId: "calculator", label: "Currency Calculator", desc: "Enable the 3-way SAR/USD/NGN Pilgrim Currency Calculator, Makkah cost benchmarks, and personal exchange rate override." },
  { key: "enableTour", label: "Tours", desc: "Show tour packages alongside Hajj and Umrah on the mobile home screen." },
  { key: "enableZiyarahGuide", label: "Ziyarah Guide", desc: "Show the self-guided Makkah and Madinah visit reference in the mobile Travel Toolkit." },
  { key: "enableHomeAds", label: "Home ads", desc: "Show sponsored and promotional ads on the mobile home screen." },
  { key: "enableAiAdvisor", label: "AI Advisor (Lima)", desc: "Enable Lima chat, recommendations, proactive prompts, and AI package assistance." },
  { key: "enableVisaProgress", label: "Visa progress", desc: "Enable internal visa status updates, customer timeline, and the official Saudi portal link." },
  { key: "enablePassportAssist", badgeId: "passport", label: "Passport assist", desc: "Enable passport application and renewal services." },
  { key: "enableTravelDocs", badgeId: "docs", label: "Travel documents", desc: "Enable visa processing and travel document services." },
  { key: "enableTargetSavings", badgeId: "savings", label: "Plan & Save (Target Savings)", desc: "Enable the Plan & Save feature (UfitFlex, UfitSave, and WefitSave plans) for travel." },
  { key: "enableWefitSave", badgeId: "wefit-save", label: "WeFitSave (Group Savings)", desc: "Enable WeFitSave group savings pools, group invite codes, and shared Hajj/Umrah goals. Turn off to pause or hide WeFitSave if not launching it yet." },
  { key: "enableSensitiveFaceCheck", label: "Face check for PIN and secret-question changes", desc: "Before a customer can change their PIN or secret question, they must pass a live face check against the selfie from their BVN face match. Needs the face match service to be deployed first (see Face check strictness below). Customers below Tier 2 are not asked." },
  { key: "enableAutoSave", label: "Auto-save rules", desc: "Let customers save part of every bank transfer into a UfitSave goal or WeFitSave group automatically (set up once with their PIN). Turning this off pauses all rules; nothing is deleted." },
  { key: "enableHalalLock", badgeId: "halal-lock", label: "Halal Lock (Fixed Tenor)", desc: "Enable fixed-tenor Halal lump-sum locks (90–365 days) with Mudarabah profit or 0% Wadiah safekeeping." },
  { key: "enableTravelIntelligence", badgeId: "intelligence", label: "Plan Open Slot (Hajj Intelligence)", desc: "Enable the Plan Open Slot banner/card on Home, availability alerts, and Hajj package comparison." },
  { key: "enableProactiveAdvisorNudge", label: "Proactive AI nudge", desc: "Show a bottom-sheet inviting users to chat with the AI Advisor after repeated zero-result searches." },
  { key: "enableReferralProgram", label: "Referral & rewards", desc: "Enable the refer & earn program (signup and package-sale bonuses) across the app." },
  { key: "enableOperatorDirectory", label: "Operator directory", desc: "Show the browsable \"All Operators\" list in the app. Consider keeping off while onboarding few operators." },
  { key: "enableOperatorWhatsAppInquiry", label: "Operator WhatsApp inquiry button", desc: "Show the 'Inquire via WhatsApp' sticky button on the Operator Details page in the mobile app (off by default)." },
  { key: "enableWalletCheckout", label: "UfitFlex Balance & Providus Direct Transfer (#1 Checkout)", desc: "Place UfitFlex Balance & Providus Bank Transfer as Option #1 on all booking and installment checkouts (₦0 PSP cost to UfitGo)." },
  { key: "enablePaystack", label: "Paystack", desc: "Allow package payments through Paystack, including cards, bank transfer, and USSD." },
  { key: "enableOpay", label: "OPay", desc: "Allow package payments through OPay." },
  { key: "enablePayForMe", label: "Pay for Me", desc: "Allow customers to request a payment link for another person to pay for their booking." },
]

const DEFAULT_TOOLKIT_PRIORITY_ORDER = ["savings", "fx", "calculator", "readiness", "passport", "docs", "ziyarah"] as const

const toolkitModulesMeta: Record<
  string,
  { id: string; label: string; desc: string; featureKey?: string; commercialTier: string }
> = {
  savings: {
    id: "savings",
    label: "Plan & Save",
    desc: "Direct savings deposits (UfitFlex, UfitSave & WefitSave), TVL growth, and package lock-in.",
    featureKey: "enableTargetSavings",
    commercialTier: "Revenue Driver",
  },
  fx: {
    id: "fx",
    label: "Travel FX",
    desc: "SAR / USD Travel FX Account, Virtual & Physical Visa Cards, and NFC Tap-to-Pay.",
    featureKey: "enablePilgrimFxAccount",
    commercialTier: "Revenue Driver",
  },
  calculator: {
    id: "calculator",
    label: "Currency Calculator",
    desc: "3-way SAR/USD/NGN converter, Makkah expense presets & My Personal Rate.",
    featureKey: "enableCurrencyCalculator",
    commercialTier: "Core Engagement",
  },
  readiness: {
    id: "readiness",
    label: "Trip Checklist",
    desc: "Pilgrim readiness tracker (Ihram, Hady, vaccinations & BTA). Always active.",
    commercialTier: "Core Engagement",
  },
  passport: {
    id: "passport",
    label: "Passport Assist",
    desc: "Pre-trip passport application and renewal assistance.",
    featureKey: "enablePassportAssist",
    commercialTier: "Ancillary Utility",
  },
  docs: {
    id: "docs",
    label: "Travel Documents",
    desc: "Post-booking document vault and sharing (also inside Manage Booking).",
    featureKey: "enableTravelDocs",
    commercialTier: "Post-Booking Utility",
  },
  ziyarah: {
    id: "ziyarah",
    label: "Ziyarah Guide",
    desc: "Self-guided places to visit in Makkah and Madinah.",
    featureKey: "enableZiyarahGuide",
    commercialTier: "Core Engagement",
  },
}

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

function CollapsibleFeeCard({
  title,
  description,
  isExpanded,
  onToggle,
  action,
  children,
}: {
  title: string
  description: string
  isExpanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onToggle} aria-expanded={isExpanded} className="min-w-0 flex-1 text-left">
          <p className="font-bold text-[#17201c]">{title}</p>
          <p className="mt-0.5 max-w-2xl text-xs text-[#7b8580]">{description}</p>
        </button>
        <div className="flex items-center gap-2">
          {action}
          <button type="button" onClick={onToggle} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`} title={isExpanded ? "Collapse" : "Expand"} className="grid size-10 place-items-center rounded-lg border border-[#d3dad7] bg-white text-[#52605a] hover:bg-[#edf3f0]">
            <ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {isExpanded && <div className="mt-4">{children}</div>}
    </section>
  )
}

export default function SettingsPage() {
  const { admin } = useAdminSession()
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("profile")
  const [collapsedFeeCards, setCollapsedFeeCards] = useState<FeeCardId[]>([])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    if (tabs.some((item) => item.id === tab)) setActiveTab(tab as (typeof tabs)[number]["id"])
    const collapsedFees = new URLSearchParams(window.location.search).get("collapsedFees")
    if (collapsedFees !== null) setCollapsedFeeCards(collapsedFees.split(",").filter((card): card is FeeCardId => feeCardIds.includes(card as FeeCardId)))
  }, [])

  const selectTab = (tab: (typeof tabs)[number]["id"]) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === "profile") url.searchParams.delete("tab")
    else url.searchParams.set("tab", tab)
    window.history.replaceState(null, "", url)
  }

  const toggleFeeCard = (card: FeeCardId) => {
    const nextCollapsedCards = collapsedFeeCards.includes(card)
      ? collapsedFeeCards.filter((item) => item !== card)
      : [...collapsedFeeCards, card]
    setCollapsedFeeCards(nextCollapsedCards)
    const url = new URL(window.location.href)
    if (nextCollapsedCards.length) url.searchParams.set("collapsedFees", nextCollapsedCards.join(","))
    else url.searchParams.delete("collapsedFees")
    window.history.replaceState(null, "", url)
  }

  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [savingFeature, setSavingFeature] = useState<string | null>(null)
  const [savingCallAiProvider, setSavingCallAiProvider] = useState(false)
  const [savingToolkitOrder, setSavingToolkitOrder] = useState(false)
  const [savingDemoMode, setSavingDemoMode] = useState(false)
  const [newTesterEmailInput, setNewTesterEmailInput] = useState("")
  const [savingTesterEmails, setSavingTesterEmails] = useState(false)
  const [earlyExitChargePercentDraft, setEarlyExitChargePercentDraft] = useState<string | null>(null)
  const [earlyExitChargeCapDraft, setEarlyExitChargeCapDraft] = useState<string | null>(null)
  const [savingEarlyExitCharge, setSavingEarlyExitCharge] = useState(false)
  const [wefitSystemMinDraft, setWefitSystemMinDraft] = useState<string | null>(null)
  const [wefitGroupFloorDraft, setWefitGroupFloorDraft] = useState<string | null>(null)
  const [savingWefitConfig, setSavingWefitConfig] = useState(false)
  const [flexMinDraft, setFlexMinDraft] = useState<string | null>(null)
  const [flexFreeDraft, setFlexFreeDraft] = useState<string | null>(null)
  const [flexFeeDraft, setFlexFeeDraft] = useState<string | null>(null)
  const [savingFlexRules, setSavingFlexRules] = useState(false)
  const [intelligenceDraft, setIntelligenceDraft] = useState<IntelligenceConfig | null>(null)
  const [savingIntelligence, setSavingIntelligence] = useState(false)
  const [campaignDraft, setCampaignDraft] = useState<HajjSeasonCampaignConfig | null>(null)
  const [savingCampaign, setSavingCampaign] = useState(false)
  const [halalLockDraft, setHalalLockDraft] = useState<HalalLockConfig | null>(null)
  const [savingHalalLock, setSavingHalalLock] = useState(false)
  const [pilgrimFxDraft, setPilgrimFxDraft] = useState<PilgrimFxConfig | null>(null)
  const [savingPilgrimFx, setSavingPilgrimFx] = useState(false)
  const [liveMarketRates, setLiveMarketRates] = useState<{
    NGN: number
    SAR: number
    AED: number
    QAR: number
    TRY: number
    EGP: number
    GBP: number
    source: string
    updatedAt: string
  }>({
    NGN: 1595,
    SAR: 3.75,
    AED: 3.6725,
    QAR: 3.64,
    TRY: 50.17,
    EGP: 53.9,
    GBP: 0.75,
    source: "Official NAFEM / Global FX Feed",
    updatedAt: "Just now",
  })
  const [refreshingMarketRates, setRefreshingMarketRates] = useState(false)
  const [fxCalcActiveBox, setFxCalcActiveBox] = useState<"SAR" | "NGN" | "USD">("SAR")
  const [fxCalcInput, setFxCalcInput] = useState<string>("1500")
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierLimitDraft>>({})
  const [savingTier, setSavingTier] = useState<string | null>(null)

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
    void fetchLiveMarketBenchmarkRates()
  }, [])

  const fetchLiveMarketBenchmarkRates = async () => {
    setRefreshingMarketRates(true)
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD")
      if (res.ok) {
        const data = await res.json()
        if (data?.rates && typeof data.rates === "object") {
          setLiveMarketRates({
            NGN: Math.round(Number(data.rates.NGN || 1595) * 100) / 100,
            SAR: Number(data.rates.SAR || 3.75),
            AED: Number(data.rates.AED || 3.6725),
            QAR: Number(data.rates.QAR || 3.64),
            TRY: Number(data.rates.TRY || 50.17),
            EGP: Number(data.rates.EGP || 53.9),
            GBP: Number(data.rates.GBP || 0.75),
            source: "Official NAFEM / Global FX Feed",
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })
          return
        }
      }
    } catch {
      // Try backup CDN below
    }

    try {
      const cdnRes = await fetch(
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
      )
      if (cdnRes.ok) {
        const cdnData = await cdnRes.json()
        const r = cdnData?.usd
        if (r && typeof r === "object") {
          setLiveMarketRates({
            NGN: Math.round(Number(r.ngn || 1595) * 100) / 100,
            SAR: Number(r.sar || 3.75),
            AED: Number(r.aed || 3.6725),
            QAR: Number(r.qar || 3.64),
            TRY: Number(r.try || 50.17),
            EGP: Number(r.egp || 53.9),
            GBP: Number(r.gbp || 0.75),
            source: "Global FX Reference CDN",
            updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })
        }
      }
    } catch {
      // Keep last known benchmark rates
    } finally {
      setRefreshingMarketRates(false)
    }
  }

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

  function getFeatureReleaseMode(key: string): "disabled" | "beta" | "live" {
    const legacyFxMode =
      key === "enablePilgrimFxAccount"
        ? String(config?.features?.pilgrimFxReleaseMode || "").toLowerCase()
        : ""
    const rawMode = String(
      config?.features?.[`${key}ReleaseMode`] || legacyFxMode || ""
    ).toLowerCase()
    if (rawMode === "live" || rawMode === "beta" || rawMode === "disabled") {
      return rawMode
    }
    const rawVal = config?.features?.[key]
    if (rawVal === "beta") return "beta"
    const defaultOn =
      key === "enableHomeAds" ||
      key === "enableWefitSave" ||
      key === "enableHalalLock" ||
      key === "enableConciergeCalls" ||
      key === "enableCurrencyCalculator" ||
      key === "enableWalletCheckout" ||
      key === "enablePaystack" ||
      key === "enableOpay"
    const isBoolActive = defaultOn ? rawVal !== false : rawVal === true
    return isBoolActive ? "live" : "disabled"
  }

  async function selectFeatureReleaseMode(
    key: string,
    nextMode: "disabled" | "beta" | "live"
  ) {
    setSavingFeature(key)
    const boolActive = nextMode === "live"
    const currentCampaignId = String(
      config?.features?.festivalCampaignId || "ramadan-heritage-v1"
    )
    const extraPayload: Record<string, string | boolean | string[]> =
      key === "enablePilgrimFxAccount"
        ? { pilgrimFxReleaseMode: nextMode }
        : key === "enableFestivalMode"
          ? {
              festivalReleaseMode: nextMode,
              festivalCampaignId:
                nextMode !== "disabled"
                  ? currentCampaignId
                  : currentCampaignId,
              festivalSeasonName: String(
                config?.features?.festivalSeasonName || "Ramadan & Arabian Heritage"
              ),
            }
          : {}
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            [key]: boolActive,
            [`${key}ReleaseMode`]: nextMode,
            ...extraPayload,
          },
        }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({
        ...prev,
        features: {
          ...prev?.features,
          [key]: boolActive,
          [`${key}ReleaseMode`]: nextMode,
          ...extraPayload,
        },
      }))
      const label =
        key === "enableFestivalMode"
          ? "Festival Mode (Ramadan / Arabian Heritage)"
          : featureToggles.find((f) => f.key === key)?.label || key
      const modeLabel =
        nextMode === "live"
          ? "LIVE for all users"
          : nextMode === "beta"
            ? "DEV ONLY (visible only when signed into an admin/tester account)"
            : "OFF for everyone"
      showToast("success", `${label} is now ${modeLabel}.`)
    } catch {
      showToast("error", "Failed to update feature release mode.")
    } finally {
      setSavingFeature(null)
    }
  }

  const internalTesterEmails = useMemo(() => {
    const raw = config?.features?.internalTesterEmails
    if (Array.isArray(raw)) {
      return raw
        .map((e) => String(e || "").trim().toLowerCase())
        .filter(Boolean)
    }
    return [
      "shafiakinropo@gmail.com",
      "sakinropo@gmail.com",
      "arcabdulrahmandolapobello@gmail.com",
    ]
  }, [config?.features?.internalTesterEmails])

  async function saveInternalTesterEmails(nextEmails: string[]) {
    const cleaned = [...new Set(nextEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
    setSavingTesterEmails(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            internalTesterEmails: cleaned,
          },
        }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({
        ...prev,
        features: {
          ...prev?.features,
          internalTesterEmails: cleaned,
        },
      }))
      showToast("success", "Dev / Beta tester email allowlist updated.")
    } catch {
      showToast("error", "Failed to update Dev / Beta tester emails.")
    } finally {
      setSavingTesterEmails(false)
    }
  }

  function handleAddTesterEmail() {
    const candidate = newTesterEmailInput.trim().toLowerCase()
    if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      showToast("error", "Enter a valid email address.")
      return
    }
    if (internalTesterEmails.includes(candidate)) {
      showToast("error", "This email is already in the Dev / Beta tester allowlist.")
      return
    }
    setNewTesterEmailInput("")
    void saveInternalTesterEmails([...internalTesterEmails, candidate])
  }

  function handleRemoveTesterEmail(emailToRemove: string) {
    void saveInternalTesterEmails(
      internalTesterEmails.filter((e) => e !== emailToRemove)
    )
  }

  async function selectCallAiProvider(nextProvider: "openai" | "gemini") {
    setSavingCallAiProvider(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: { callAiProvider: nextProvider } }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({
        ...prev,
        features: { ...prev?.features, callAiProvider: nextProvider },
      }))
      showToast(
        "success",
        nextProvider === "openai"
          ? "Call AI switched to OpenAI Whisper + GPT-4o-mini (Primary) with Gemini 2.0 Flash as fallback."
          : "Call AI switched to Gemini 2.0 Flash (Primary) with OpenAI Whisper + GPT-4o-mini as fallback."
      )
    } catch {
      showToast("error", "Failed to update Call AI provider.")
    } finally {
      setSavingCallAiProvider(false)
    }
  }

  async function toggleNewBadge(badgeId: string, current: boolean) {
    setSavingFeature(`badge-${badgeId}`)
    const newFeatureBadges = current
      ? ((config?.features?.newFeatureBadges as string[] | undefined) || []).filter((id) => id !== badgeId)
      : [...new Set([...((config?.features?.newFeatureBadges as string[] | undefined) || []), badgeId])]
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFeatureBadges }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({ ...prev, features: { ...prev?.features, newFeatureBadges } }))
      showToast("success", `NEW badge ${current ? "removed" : "shown"}.`)
    } catch {
      showToast("error", "Failed to update the NEW badge.")
    } finally {
      setSavingFeature(null)
    }
  }

  const resolvedToolkitOrder = useMemo(() => {
    const remoteOrder = Array.isArray(config?.features?.toolkitPriorityOrder)
      ? (config?.features?.toolkitPriorityOrder as string[])
      : []
    return [...new Set([...remoteOrder, ...DEFAULT_TOOLKIT_PRIORITY_ORDER])].filter(
      (id) => Boolean(toolkitModulesMeta[id])
    )
  }, [config?.features?.toolkitPriorityOrder])

  async function saveToolkitPriorityOrder(nextOrder: string[]) {
    setSavingToolkitOrder(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolkitPriorityOrder: nextOrder }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({
        ...prev,
        features: {
          ...prev?.features,
          toolkitPriorityOrder: nextOrder,
        },
      }))
      showToast("success", "Travel Toolkit priority order updated.")
    } catch {
      showToast("error", "Failed to update Travel Toolkit priority order.")
    } finally {
      setSavingToolkitOrder(false)
    }
  }

  function moveToolkitModule(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= resolvedToolkitOrder.length) return
    const nextOrder = [...resolvedToolkitOrder]
    const [moved] = nextOrder.splice(index, 1)
    nextOrder.splice(targetIndex, 0, moved)
    void saveToolkitPriorityOrder(nextOrder)
  }

  async function toggleDemoMode(current: boolean) {
    setSavingDemoMode(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoMode: !current }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({ ...previous, demoMode: !current }))
      showToast("success", `Demo mode is now ${!current ? "active" : "inactive"}.`)
    } catch {
      showToast("error", "Failed to update demo mode.")
    } finally {
      setSavingDemoMode(false)
    }
  }

  async function saveFeeField(field: "fees" | "savingsConfig", key: string, value: number | string | boolean): Promise<boolean> {
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: { [key]: value } }),
      })
      if (!response.ok) throw new Error()
      setConfig((prev) => ({ ...prev, [field]: { ...(prev as any)?.[field], [key]: value } }))
      showToast("success", "Setting saved.")
      return true
    } catch {
      showToast("error", "Failed to save this setting.")
      return false
    }
  }

  async function saveTierLimits(provider: string, tierLevel: number) {
    const tier = config?.tiers?.find((item) => item.provider === provider && item.tierLevel === tierLevel)
    const tierKey = `${provider}-${tierLevel}`
    const draft = tierDrafts[tierKey]
    if (!tier || !draft) return

    const updatedTier = {
      ...tier,
      ...Object.fromEntries(
        Object.entries(draft).map(([key, value]) => [key, Number(value)]),
      ),
    }

    if ([updatedTier.maxBalanceLimit, updatedTier.singleTransactionLimit, updatedTier.dailyTransactionLimit].some((value) => !Number.isFinite(value) || value < 0)) {
      showToast("error", "Enter valid, non-negative tier limits before saving.")
      return
    }

    setSavingTier(tierKey)
    try {
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
      setTierDrafts((previous) => {
        const { [tierKey]: _, ...remainingDrafts } = previous
        return remainingDrafts
      })
      showToast("success", `${provider} Tier ${tierLevel} limit saved.`)
    } catch {
      showToast("error", `Failed to save ${provider} Tier ${tierLevel} limit.`)
    } finally {
      setSavingTier(null)
    }
  }

  function updateTierDraft(provider: string, tierLevel: number, key: TierLimitKey, value: string) {
    const tierKey = `${provider}-${tierLevel}`
    setTierDrafts((previous) => ({
      ...previous,
      [tierKey]: { ...previous[tierKey], [key]: value },
    }))
  }

  async function saveEarlyExitCharge() {
    const percent = Number(earlyExitChargePercentDraft ?? earlyExitChargePercent)
    const cap = Number(earlyExitChargeCapDraft ?? earlyExitChargeCap)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      showToast("error", "Enter an early exit charge between 0 and 100 percent.")
      return
    }
    if (!Number.isFinite(cap) || cap < 0) {
      showToast("error", "Enter a valid, non-negative charge cap.")
      return
    }

    setSavingEarlyExitCharge(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fees: {
            savingsEarlyExitChargePercent: percent,
            savingsEarlyExitChargeCap: cap,
          },
        }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({
        ...previous,
        fees: {
          ...previous?.fees,
          savingsEarlyExitChargePercent: percent,
          savingsEarlyExitChargeCap: cap,
        },
      }))
      showToast("success", "Early exit charge saved.")
        setEarlyExitChargePercentDraft(null)
        setEarlyExitChargeCapDraft(null)
    } catch {
      showToast("error", "Failed to save the early exit charge.")
    } finally {
      setSavingEarlyExitCharge(false)
    }
  }

  async function saveFlexWithdrawalRules() {
    const minAmount = Number(flexMinDraft ?? flexMinWithdrawal)
    const freePerMonth = Number(flexFreeDraft ?? flexFreeWithdrawals)
    const excessFee = Number(flexFeeDraft ?? flexExcessFee)
    if (!Number.isFinite(minAmount) || minAmount < 100) {
      showToast("error", "The minimum withdrawal must be at least ₦100.")
      return
    }
    if (!Number.isInteger(freePerMonth) || freePerMonth < 0 || freePerMonth > 100) {
      showToast("error", "Free withdrawals per month must be a whole number from 0 to 100.")
      return
    }
    if (!Number.isFinite(excessFee) || excessFee < 0 || excessFee > 1000) {
      showToast("error", "The fee must be between ₦0 and ₦1,000.")
      return
    }

    setSavingFlexRules(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fees: {
            ufitflexMinWithdrawal: minAmount,
            ufitflexFreeWithdrawalsPerMonth: freePerMonth,
            ufitflexExcessWithdrawalFee: excessFee,
          },
        }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({
        ...previous,
        fees: {
          ...previous?.fees,
          ufitflexMinWithdrawal: minAmount,
          ufitflexFreeWithdrawalsPerMonth: freePerMonth,
          ufitflexExcessWithdrawalFee: excessFee,
        },
      }))
      setFlexMinDraft(null)
      setFlexFreeDraft(null)
      setFlexFeeDraft(null)
      showToast("success", "UfitFlex withdrawal rules saved.")
    } catch {
      showToast("error", "Failed to save the UfitFlex withdrawal rules.")
    } finally {
      setSavingFlexRules(false)
    }
  }

  async function saveWefitConfig() {
    const sysMin = Number(wefitSystemMinDraft ?? wefitSystemMinContribution)
    const groupFloor = Number(wefitGroupFloorDraft ?? wefitGroupAdminMinFloor)
    if (!Number.isFinite(sysMin) || sysMin < 100) {
      showToast("error", "UfitGo system minimum contribution must be at least ₦100.")
      return
    }
    if (!Number.isFinite(groupFloor) || groupFloor < 10000) {
      showToast("error", "Group Admin minimum standard floor cannot be less than ₦10,000.")
      return
    }
    if (groupFloor < sysMin) {
      showToast("error", "Group Admin minimum standard floor cannot be less than the UfitGo system minimum.")
      return
    }

    setSavingWefitConfig(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fees: {
            wefitSystemMinContribution: sysMin,
            wefitGroupAdminMinFloor: groupFloor,
          },
        }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({
        ...previous,
        fees: {
          ...previous?.fees,
          wefitSystemMinContribution: sysMin,
          wefitGroupAdminMinFloor: groupFloor,
        },
      }))
      setWefitSystemMinDraft(null)
      setWefitGroupFloorDraft(null)
      showToast("success", "WeFitSave configuration saved.")
    } catch {
      showToast("error", "Failed to save WeFitSave configuration.")
    } finally {
      setSavingWefitConfig(false)
    }
  }

  async function saveIntelligenceConfig() {
    const value = intelligenceDraft ?? config?.savingsConfig?.intelligence
    if (!value) return
    const prices = [value.hajjPrice, value.umrahPrice, value.ramadanPrice]
    if (prices.some((price) => !Number.isFinite(Number(price)) || Number(price) < 0)) {
      showToast("error", "Enter valid, non-negative Intelligence prices.")
      return
    }
    if ((value.ramadanStartsOn && !value.ramadanEndsOn) || (!value.ramadanStartsOn && value.ramadanEndsOn)) {
      showToast("error", "Set both Ramadan dates or leave both empty.")
      return
    }
    const earlyHours = Object.values(value.earlyAccess ?? {})
    if (earlyHours.some((hours) => !Number.isInteger(Number(hours)) || Number(hours) < 0 || Number(hours) > 168)) {
      showToast("error", "Early access hours must be whole numbers from 0 to 168 (7 days).")
      return
    }
    const passConfigs = { ...defaultOpenSlotPasses, ...value.openSlotPasses }
    if (Object.values(passConfigs).some((pass) => !Number.isFinite(Number(pass.basePrice)) || Number(pass.basePrice) < 0 || !Number.isFinite(Number(pass.plusPrice)) || Number(pass.plusPrice) < Number(pass.basePrice))) {
      showToast("error", "Set valid Base and Plus pass prices. Plus cannot cost less than Base.")
      return
    }
    if (!passConfigs.hajj.endsOn) {
      showToast("error", "Set the Hajj Open Slot Pass end date.")
      return
    }
    if (passConfigs.ramadan.mode === "paid" && (!passConfigs.ramadan.startsOn || !passConfigs.ramadan.endsOn || passConfigs.ramadan.startsOn > passConfigs.ramadan.endsOn)) {
      showToast("error", "Set a valid Ramadan Open Slot Pass travel window.")
      return
    }
    if (!Number.isInteger(Number(passConfigs.umrah.durationDays)) || Number(passConfigs.umrah.durationDays) < 1) {
      showToast("error", "Set a valid Umrah Open Slot Pass duration.")
      return
    }
    setSavingIntelligence(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsConfig: { intelligence: value } }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({ ...previous, savingsConfig: { ...previous?.savingsConfig, intelligence: value } }))
      setIntelligenceDraft(null)
      showToast("success", "Intelligence settings saved.")
    } catch {
      showToast("error", "Failed to save Intelligence settings.")
    } finally {
      setSavingIntelligence(false)
    }
  }

  async function saveCampaignConfig() {
    const value = campaignDraft ?? campaignConfig
    if (!value.seasonLabel.trim()) {
      showToast("error", "Enter a Hajj season label before saving.")
      return
    }
    setSavingCampaign(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsConfig: { hajjSeasonCampaign: { ...value, seasonLabel: value.seasonLabel.trim() } } }),
      })
      if (!response.ok) throw new Error()
      const savedValue = { ...value, seasonLabel: value.seasonLabel.trim() }
      setConfig((previous) => ({ ...previous, savingsConfig: { ...previous?.savingsConfig, hajjSeasonCampaign: savedValue } }))
      setCampaignDraft(null)
      showToast("success", "Hajj season campaign saved.")
    } catch {
      showToast("error", "Failed to save the Hajj season campaign.")
    } finally {
      setSavingCampaign(false)
    }
  }

  async function saveHalalLockConfig() {
    const value = halalLockDraft ?? halalLockConfig
    if (!Number.isFinite(value.minAmount) || value.minAmount < 1000) {
      showToast("error", "Enter a valid minimum lock amount (at least ₦1,000).")
      return
    }
    if (!value.allowMudarabahProfit && !value.allowPrincipalOnly) {
      showToast("error", "At least one Shariah return option (Mudarabah or Principal Only) must be enabled.")
      return
    }
    if (!value.tiers.some((tier) => tier.enabled)) {
      showToast("error", "At least one lock duration tier must be enabled.")
      return
    }
    if (value.tiers.some((tier) => !Number.isFinite(tier.annualRatePercent) || tier.annualRatePercent < 0 || tier.annualRatePercent > 100)) {
      showToast("error", "Enter valid annual profit rates between 0% and 100%.")
      return
    }
    setSavingHalalLock(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsConfig: { halalLock: value } }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({ ...previous, savingsConfig: { ...previous?.savingsConfig, halalLock: value } }))
      setHalalLockDraft(null)
      showToast("success", "Halal Lock configuration saved.")
    } catch {
      showToast("error", "Failed to save Halal Lock configuration.")
    } finally {
      setSavingHalalLock(false)
    }
  }

  async function savePilgrimFxConfig() {
    const value = pilgrimFxDraft ?? pilgrimFxConfig
    if (!Number.isFinite(value.wholesaleNgnPerUsd) || value.wholesaleNgnPerUsd < 100) {
      showToast("error", "Enter a valid wholesale NGN per $1 USD reference rate.")
      return
    }
    if (!Number.isFinite(value.sellSpreadPercent) || value.sellSpreadPercent < 0 || value.sellSpreadPercent > 25) {
      showToast("error", "Enter a valid NGN → SAR/USD sell spread between 0% and 25%.")
      return
    }
    if (!Number.isFinite(value.buyBackSpreadPercent) || value.buyBackSpreadPercent < 0 || value.buyBackSpreadPercent > 25) {
      showToast("error", "Enter a valid SAR/USD → NGN buy-back spread between 0% and 25%.")
      return
    }
    if (!Number.isFinite(value.virtualCardFeeUsd) || value.virtualCardFeeUsd < 0) {
      showToast("error", "Enter a valid Virtual Card fee ($0 or higher).")
      return
    }
    if (!Number.isFinite(value.physicalCardFeeNgn) || value.physicalCardFeeNgn < 0) {
      showToast("error", "Enter a valid Physical Card fee (₦0 or higher).")
      return
    }
    setSavingPilgrimFx(true)
    try {
      const response = await fetch("/api/admin/customers/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savingsConfig: { pilgrimFx: value } }),
      })
      if (!response.ok) throw new Error()
      setConfig((previous) => ({ ...previous, savingsConfig: { ...previous?.savingsConfig, pilgrimFx: value } }))
      setPilgrimFxDraft(null)
      showToast("success", "Pilgrim FX & Card pricing saved.")
    } catch {
      showToast("error", "Failed to save Pilgrim FX & Card pricing.")
    } finally {
      setSavingPilgrimFx(false)
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

  const earlyExitChargePercent = useMemo(() => Number(config?.fees?.savingsEarlyExitChargePercent ?? config?.fees?.savingsBreakPenaltyPercent ?? 0), [config])
  const earlyExitChargeCap = useMemo(() => Number(config?.fees?.savingsEarlyExitChargeCap ?? 0), [config])
  const flexMinWithdrawal = useMemo(() => Number(config?.fees?.ufitflexMinWithdrawal ?? 500), [config])
  const flexFreeWithdrawals = useMemo(() => Number(config?.fees?.ufitflexFreeWithdrawalsPerMonth ?? 4), [config])
  const flexExcessFee = useMemo(() => Number(config?.fees?.ufitflexExcessWithdrawalFee ?? 100), [config])
  const flexRulesHaveChanges =
    (flexMinDraft !== null && Number(flexMinDraft) !== flexMinWithdrawal) ||
    (flexFreeDraft !== null && Number(flexFreeDraft) !== flexFreeWithdrawals) ||
    (flexFeeDraft !== null && Number(flexFeeDraft) !== flexExcessFee)
  const wefitSystemMinContribution = useMemo(() => Number(config?.fees?.wefitSystemMinContribution ?? 500), [config])
  const wefitGroupAdminMinFloor = useMemo(() => Math.max(10000, Number(config?.fees?.wefitGroupAdminMinFloor ?? 10000)), [config])
  const gracePeriodDays = useMemo(() => Number(config?.savingsConfig?.gracePeriodDays ?? 3), [config])
  const dropThresholdDays = useMemo(() => Number(config?.savingsConfig?.dropThresholdDays ?? 30), [config])
  const scheduleEnforcement = config?.savingsConfig?.scheduleEnforcement ?? "report"
  const autoSaveMinMove = Number(config?.savingsConfig?.autoSaveMinMove ?? 500)
  const faceCheckThreshold = Number(config?.savingsConfig?.faceCheckThreshold ?? 0.45)
  const postChangeCapEnabled = config?.savingsConfig?.postChangeCapEnabled === true
  const postChangeCapAmount = Number(config?.savingsConfig?.postChangeCapAmount ?? 50000)
  const postChangeCapHours = Number(config?.savingsConfig?.postChangeCapHours ?? 24)
  const earlyExitChargeHasChanges =
    (earlyExitChargePercentDraft !== null && Number(earlyExitChargePercentDraft) !== earlyExitChargePercent) ||
    (earlyExitChargeCapDraft !== null && Number(earlyExitChargeCapDraft) !== earlyExitChargeCap)
  const intelligenceConfig = intelligenceDraft ?? config?.savingsConfig?.intelligence ?? {
    finderMode: "free" as const,
    comparisonMode: "free" as const,
    hajjPilotMode: "paid" as const,
    hajjPrice: 2000,
    hajjEndsOn: null,
    umrahPrice: 1000,
    ramadanPrice: 1200,
    ramadanStartsOn: null,
    ramadanEndsOn: null,
    openSlotPasses: defaultOpenSlotPasses,
    earlyAccess: { hajj: 0, ramadan: 0, umrah: 0 },
  }
  const earlyAccessHours = { hajj: 0, ramadan: 0, umrah: 0, ...intelligenceConfig.earlyAccess }
  const openSlotPasses = { ...defaultOpenSlotPasses, ...intelligenceConfig.openSlotPasses }
  const campaignConfig = campaignDraft ?? config?.savingsConfig?.hajjSeasonCampaign ?? {
    mode: "planning" as const,
    seasonLabel: "Hajj 2027",
  }
  const halalLockConfig: HalalLockConfig = useMemo(() => {
    const remote = config?.savingsConfig?.halalLock
    const mergedTiers = defaultHalalLockConfig.tiers.map((defaultTier) => {
      const match = remote?.tiers?.find((t) => Number(t.days) === defaultTier.days)
      return match
        ? {
            ...defaultTier,
            ...match,
            annualRatePercent: Number(match.annualRatePercent ?? defaultTier.annualRatePercent),
            enabled: match.enabled !== false,
          }
        : defaultTier
    })
    return halalLockDraft ?? {
      minAmount: Number(remote?.minAmount ?? defaultHalalLockConfig.minAmount),
      allowMudarabahProfit: remote?.allowMudarabahProfit !== false,
      allowPrincipalOnly: remote?.allowPrincipalOnly !== false,
      tiers: mergedTiers,
    }
  }, [config, halalLockDraft])

  const pilgrimFxConfig: PilgrimFxConfig = useMemo(() => {
    const remote = config?.savingsConfig?.pilgrimFx
    return pilgrimFxDraft ?? {
      wholesaleNgnPerUsd: Number(remote?.wholesaleNgnPerUsd ?? defaultPilgrimFxConfig.wholesaleNgnPerUsd),
      sellSpreadPercent: Number(remote?.sellSpreadPercent ?? defaultPilgrimFxConfig.sellSpreadPercent),
      buyBackSpreadPercent: Number(remote?.buyBackSpreadPercent ?? defaultPilgrimFxConfig.buyBackSpreadPercent),
      virtualCardFeeUsd: Number(remote?.virtualCardFeeUsd ?? defaultPilgrimFxConfig.virtualCardFeeUsd),
      physicalCardFeeNgn: Number(remote?.physicalCardFeeNgn ?? defaultPilgrimFxConfig.physicalCardFeeNgn),
    }
  }, [config, pilgrimFxDraft])

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
                onClick={() => selectTab(tab.id)}
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
            <div className="mt-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e9bc72] bg-[#fff8e8] p-4">
                <div>
                  <p className="flex items-center gap-2 font-bold text-[#17201c]"><CircleAlert className="size-4 text-[#a95b00]" /> Demo mode</p>
                  <p className="mt-0.5 max-w-xl text-xs text-[#7b5b26]">Uses simulated NIN, wallet, bank-resolution, savings funding, and payout responses. Turn this off before live FCMB testing.</p>
                </div>
                <ToggleSwitch checked={Boolean(config?.demoMode)} disabled={savingDemoMode} onChange={() => void toggleDemoMode(Boolean(config?.demoMode))} />
              </div>

              <div className="mt-3 rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#92400e]">
                        Dev Only Access Gate
                      </span>
                      <p className="font-bold text-[#17201c]">
                        Whitelisted Dev / Beta Tester Accounts
                      </p>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs text-[#68716d]">
                      Any feature set to <strong>Dev Only</strong> below is hidden in Guest Mode and from regular users, and is unlocked <strong>only</strong> when signed into the mobile app with one of these email addresses.
                    </p>
                  </div>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <input
                      type="email"
                      value={newTesterEmailInput}
                      onChange={(e) => setNewTesterEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTesterEmail()
                        }
                      }}
                      placeholder="Add tester email (e.g. name@ufitgo.ng)"
                      disabled={savingTesterEmails}
                      className="w-full sm:w-64 rounded-lg border border-[#cfdad5] bg-white px-3 py-1.5 text-xs font-medium text-[#17201c] placeholder:text-[#9aa39e] focus:border-[#0d7d5f] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={savingTesterEmails || !newTesterEmailInput.trim()}
                      onClick={handleAddTesterEmail}
                      className="shrink-0 rounded-lg bg-[#0d7d5f] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#09634b] disabled:opacity-50"
                    >
                      + Add Email
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {internalTesterEmails.length === 0 ? (
                    <span className="text-xs italic text-[#7b8580]">
                      No tester emails added yet. Add an email above to test Dev Only features in the app.
                    </span>
                  ) : (
                    internalTesterEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 rounded-full border border-[#cfdad5] bg-white py-1 pl-3 pr-2 text-xs font-semibold text-[#17201c] shadow-2xs"
                      >
                        <Mail className="size-3 text-[#0d7d5f]" />
                        {email}
                        <button
                          type="button"
                          disabled={savingTesterEmails}
                          onClick={() => handleRemoveTesterEmail(email)}
                          title={`Remove ${email}`}
                          className="ml-0.5 grid size-4 place-items-center rounded-full bg-[#f0f4f2] text-[11px] font-bold text-[#52605a] hover:bg-[#fee2e2] hover:text-[#b91c1c] disabled:opacity-40"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Ramadan & Seasonal Festival Mode Control Card */}
              {(() => {
                const festivalMode = getFeatureReleaseMode("enableFestivalMode")
                const festivalCampaignId = String(
                  config?.features?.festivalCampaignId || "ramadan-heritage-v1"
                )
                return (
                  <div className="mt-3 rounded-xl border border-[#d9c082] bg-gradient-to-r from-[#faf6eb] via-[#f5eedb] to-[#efe4c6] p-4 shadow-2xs">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-[#0d4a2e] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e9ce86]">
                            Seasonal Design Override
                          </span>
                          <p className="font-bold text-[#14291e]">
                            Festival Mode (Ramadan / Arabian Heritage Design)
                          </p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#49584f]">
                          When set to <strong>Live</strong> (or <strong>Dev Only</strong> for whitelisted tester emails), this superimposes the Arabian Heritage parchment, gold &amp; skyline theme across Travel FX, Home, and supported screens for all users — regardless of their current theme — until a user intentionally switches back in their personal Settings. While <strong>Off</strong>, Festival is hidden from every user&apos;s Settings, and anyone who picked it earlier is moved back to the Modern design. Their choice is kept, so it returns when you switch Festival on again.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#5c6b62]">
                          <span>
                            Active Campaign Stamp: <strong className="font-mono text-[#0d4a2e]">{festivalCampaignId}</strong>
                          </span>
                          <button
                            type="button"
                            disabled={savingFeature === "enableFestivalMode"}
                            onClick={async () => {
                              const nextStamp = `ramadan-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`
                              setSavingFeature("enableFestivalMode")
                              try {
                                const res = await fetch("/api/admin/customers/system/config", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    features: {
                                      festivalCampaignId: nextStamp,
                                    },
                                  }),
                                })
                                if (!res.ok) throw new Error()
                                setConfig((prev) => ({
                                  ...prev,
                                  features: {
                                    ...prev?.features,
                                    festivalCampaignId: nextStamp,
                                  },
                                }))
                                showToast(
                                  "success",
                                  `New Festival Campaign (${nextStamp}) pushed — Festival Mode will now re-superimpose for all users!`
                                )
                              } catch {
                                showToast("error", "Could not update Festival Campaign stamp.")
                              } finally {
                                setSavingFeature(null)
                              }
                            }}
                            className="rounded-lg border border-[#c8ad68] bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#0d4a2e] transition hover:bg-white disabled:opacity-50"
                          >
                            ↻ Push Fresh Campaign Stamp (Re-apply to All Users)
                          </button>
                        </div>
                      </div>

                      <div className="w-full sm:w-72 rounded-xl border border-[#d6c28f] bg-white/90 p-2.5">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#68716d]">
                          Festival Mode Rollout
                        </p>
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#eef2f0] p-1">
                          {(
                            [
                              { id: "disabled", label: "Off" },
                              { id: "beta", label: "Dev Only" },
                              { id: "live", label: "Live" },
                            ] as const
                          ).map((opt) => {
                            const selected = festivalMode === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={savingFeature === "enableFestivalMode"}
                                onClick={() =>
                                  void selectFeatureReleaseMode("enableFestivalMode", opt.id)
                                }
                                className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition ${
                                  selected
                                    ? opt.id === "live"
                                      ? "bg-[#0d4a2e] text-[#f3dca2] shadow-xs"
                                      : opt.id === "beta"
                                        ? "bg-[#d97706] text-white shadow-xs"
                                        : "bg-white text-[#17201c] shadow-xs"
                                    : "text-[#617069] hover:text-[#17201c]"
                                } disabled:opacity-50`}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {featureToggles.map((feature) => {
                  const activeMode = getFeatureReleaseMode(feature.key)
                  const isActive = activeMode !== "disabled"
                  const isSuperAdmin = admin.role === "SUPER_ADMIN" || admin.permissions.includes("*")
                  const lockedForRole = Boolean(feature.superAdminOnly && !isSuperAdmin)
                  const showNewBadge = feature.badgeId ? Boolean((config?.features?.newFeatureBadges as string[] | undefined)?.includes(feature.badgeId)) : false
                  const activeCallAi = String(config?.features?.callAiProvider || "openai").toLowerCase() === "gemini" ? "gemini" : "openai"
                  return (
                    <div key={feature.key} className="flex min-h-40 flex-col rounded-xl border border-[#dbe2de] bg-[#f7faf9] p-4">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-[#17201c]">{feature.label}</p>
                          {feature.superAdminOnly && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#cfeee0] bg-[#eaf9f3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0c6b50]">
                              <ShieldCheck className="size-3" /> Super Admin
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-[#7b8580]">{feature.desc}</p>
                        <div className="mt-3 rounded-lg border border-[#d6e4dd] bg-white p-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#52605a]">
                            Rollout Visibility Mode
                          </p>
                          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                            {(
                              [
                                { id: "disabled", label: "Off" },
                                { id: "beta", label: "Dev Only" },
                                { id: "live", label: "Live (All)" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={savingFeature === feature.key || lockedForRole}
                                onClick={() => void selectFeatureReleaseMode(feature.key, opt.id)}
                                className={`rounded-md px-2 py-1.5 text-[11px] font-bold transition ${
                                  activeMode === opt.id
                                    ? opt.id === "beta"
                                      ? "bg-[#b45309] text-white shadow-2xs"
                                      : opt.id === "live"
                                        ? "bg-[#0d7d5f] text-white shadow-2xs"
                                        : "bg-[#475569] text-white shadow-2xs"
                                    : "border border-[#d3dad7] bg-[#f7faf9] text-[#35443e] hover:bg-[#eaf9f3]"
                                } disabled:opacity-50`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[10px] text-[#7b8580]">
                            {activeMode === "beta"
                              ? "Visible ONLY when signed into a whitelisted Admin / Dev account. Hidden in Guest mode & from public users."
                              : activeMode === "live"
                                ? "Visible to all users on Production & Beta."
                                : "Completely hidden for everyone."}
                          </p>
                        </div>
                        {feature.key === "enableConciergeCalls" && (
                          <div className="mt-3 rounded-lg border border-[#d6e4dd] bg-white p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52605a]">
                              Call Transcript &amp; Summary AI Priority
                            </p>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                disabled={savingCallAiProvider || lockedForRole}
                                onClick={() => void selectCallAiProvider("openai")}
                                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                                  activeCallAi === "openai"
                                    ? "bg-[#0d7d5f] text-white shadow-2xs"
                                    : "border border-[#d3dad7] bg-[#f7faf9] text-[#35443e] hover:bg-[#eaf9f3]"
                                } disabled:opacity-50`}
                              >
                                1st: OpenAI Whisper
                              </button>
                              <button
                                type="button"
                                disabled={savingCallAiProvider || lockedForRole}
                                onClick={() => void selectCallAiProvider("gemini")}
                                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                                  activeCallAi === "gemini"
                                    ? "bg-[#0d7d5f] text-white shadow-2xs"
                                    : "border border-[#d3dad7] bg-[#f7faf9] text-[#35443e] hover:bg-[#eaf9f3]"
                                } disabled:opacity-50`}
                              >
                                1st: Gemini 2.0
                              </button>
                            </div>
                            <p className="mt-1 text-[10px] text-[#7b8580]">
                              {activeCallAi === "openai"
                                ? "Primary: OpenAI (Whisper + GPT-4o-mini) · Fallback: Gemini 2.0"
                                : "Primary: Gemini 2.0 Flash · Fallback: OpenAI (Whisper + GPT-4o-mini)"}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe2de] pt-3">
                        {feature.badgeId && isActive ? (
                          <label className="flex items-center gap-2 text-xs font-bold text-[#a62b2b]">
                            <span>Show NEW badge</span>
                            <ToggleSwitch checked={showNewBadge} disabled={savingFeature === `badge-${feature.badgeId}`} onChange={() => void toggleNewBadge(feature.badgeId!, showNewBadge)} />
                          </label>
                        ) : lockedForRole ? (
                          <span className="text-[11px] font-semibold text-[#7b8580]">Super Admin required</span>
                        ) : <span />}
                        <ToggleSwitch
                          checked={isActive}
                          disabled={savingFeature === feature.key || lockedForRole}
                          onChange={() => {
                            void selectFeatureReleaseMode(
                              feature.key,
                              isActive ? "disabled" : "live"
                            )
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-[#dbe2de] bg-[#f7faf9] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#eaf9f3] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#0c6b50]">
                        Home 2×2 Cap + Central Hub
                      </span>
                      <h3 className="font-brand text-base font-bold text-[#17201c]">
                        Travel Toolkit Priority &amp; Overflow Routing
                      </h3>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-[#68716d]">
                      The mobile Home Screen caps <strong>Travel toolkit</strong> at <strong>4 active modules</strong> (2 rows) so Deals of the Month and Featured Journeys stay above the fold. When more than 4 modules are active, a central <strong>Menu</strong> button automatically appears in the bottom navigation bar and lower-priority modules move into the UfitGo Travel Hub modal.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      savingToolkitOrder ||
                      resolvedToolkitOrder.join(",") === DEFAULT_TOOLKIT_PRIORITY_ORDER.join(",")
                    }
                    onClick={() => void saveToolkitPriorityOrder([...DEFAULT_TOOLKIT_PRIORITY_ORDER])}
                    className="rounded-lg border border-[#cfdad5] bg-white px-3 py-2 text-xs font-bold text-[#17201c] hover:bg-[#edf3f0] disabled:opacity-45"
                  >
                    Reset to Revenue-First Default
                  </button>
                </div>

                <div className="mt-4 space-y-2.5">
                  {(() => {
                    let activeRankCounter = 0
                    return resolvedToolkitOrder.map((moduleId, idx) => {
                      const meta = toolkitModulesMeta[moduleId]
                      if (!meta) return null
                      const isModuleActive = meta.featureKey
                        ? config?.features?.[meta.featureKey] === true
                        : true
                      if (isModuleActive) {
                        activeRankCounter += 1
                      }
                      const activeRank = isModuleActive ? activeRankCounter : null
                      const isHomeGrid = activeRank !== null && activeRank <= 4
                      const isOverflowHub = activeRank !== null && activeRank > 4

                      return (
                        <div
                          key={meta.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbe2de] bg-white px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#edf3f0] text-xs font-extrabold text-[#17201c]">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#17201c]">{meta.label}</span>
                                <span className="rounded-full bg-[#f0f4f2] px-2 py-0.5 text-[10px] font-bold text-[#52605a]">
                                  {meta.commercialTier}
                                </span>
                                {isHomeGrid && (
                                  <span className="rounded-full border border-[#cfeee0] bg-[#eaf9f3] px-2.5 py-0.5 text-[10px] font-bold text-[#0c6b50]">
                                    Home 2×2 Grid (Slot #{activeRank})
                                  </span>
                                )}
                                {isOverflowHub && (
                                  <span className="rounded-full border border-[#f2d49b] bg-[#fff8e8] px-2.5 py-0.5 text-[10px] font-bold text-[#9a5b00]">
                                    Central Hub Menu (Overflow)
                                  </span>
                                )}
                                {!isModuleActive && (
                                  <span className="rounded-full bg-[#eef1f0] px-2.5 py-0.5 text-[10px] font-semibold text-[#7b8580]">
                                    Inactive (Off)
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-[#68716d]">{meta.desc}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingToolkitOrder || idx === 0}
                              onClick={() => moveToolkitModule(idx, -1)}
                              title="Move higher in priority"
                              className="rounded-lg border border-[#d3dad7] bg-[#f7faf9] px-2.5 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#eaf2ee] disabled:opacity-40"
                            >
                              ↑ Boost
                            </button>
                            <button
                              type="button"
                              disabled={savingToolkitOrder || idx === resolvedToolkitOrder.length - 1}
                              onClick={() => moveToolkitModule(idx, 1)}
                              title="Move lower in priority"
                              className="rounded-lg border border-[#d3dad7] bg-[#f7faf9] px-2.5 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#eaf2ee] disabled:opacity-40"
                            >
                              ↓ Demote
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "fees" && (
        <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
          <h2 className="font-brand text-lg font-bold text-[#17201c]">Fees & savings automation</h2>
          <p className="mt-1 text-sm text-[#68716d]">Numbers that drive early-exit service charges and savings-plan enforcement.</p>
          <div className="mt-5 space-y-3">
            <CollapsibleFeeCard title="Plan & Save Platform Service Charge (UfitSave & WefitSave)" description="Applied per individual early cash withdrawal from UfitSave or WefitSave before maturity, up to the configured NGN cap. Moving matured funds to UfitFlex or booking an Umrah, Hajj, or Tour package on UfitGo is always 0% (Free)." isExpanded={!collapsedFeeCards.includes("early-exit")} onToggle={() => toggleFeeCard("early-exit")}>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input aria-label="Early exit charge percentage" type="number" step="0.01" min="0" max="100" value={earlyExitChargePercentDraft ?? earlyExitChargePercent.toFixed(2)} onChange={(event) => setEarlyExitChargePercentDraft(event.target.value)} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">%</span>
                <input aria-label="Early exit charge cap" type="number" min="0" value={earlyExitChargeCapDraft ?? String(earlyExitChargeCap)} onChange={(event) => setEarlyExitChargeCapDraft(event.target.value)} className="h-10 w-28 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">NGN cap</span>
                {earlyExitChargeHasChanges && <button type="button" onClick={() => void saveEarlyExitCharge()} disabled={savingEarlyExitCharge} className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{savingEarlyExitCharge ? "Saving..." : "Save"}</button>}
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="UfitFlex Bank Withdrawals (Free Allowance & Fee)"
              description="Applies only when a customer withdraws from UfitFlex to their own bank account. Moving money between UfitFlex, UfitSave, WeFitSave and Halal Lock never counts. Customers see these numbers in the app straight away. The fee is added on top of the amount withdrawn."
              isExpanded={!collapsedFeeCards.includes("ufitflex-withdrawals")}
              onToggle={() => toggleFeeCard("ufitflex-withdrawals")}
              action={
                flexRulesHaveChanges ? (
                  <button
                    type="button"
                    onClick={() => void saveFlexWithdrawalRules()}
                    disabled={savingFlexRules}
                    className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                  >
                    {savingFlexRules ? "Saving..." : "Save"}
                  </button>
                ) : undefined
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-xs font-semibold text-[#68716d]">
                  Free withdrawals per month
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={flexFreeDraft ?? String(flexFreeWithdrawals)}
                    onChange={(event) => setFlexFreeDraft(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#7b8580]">
                    Each customer gets this many free bank withdrawals every calendar month (current default 4).
                  </span>
                </label>
                <label className="text-xs font-semibold text-[#68716d]">
                  Fee after the free ones (NGN)
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={flexFeeDraft ?? String(flexExcessFee)}
                    onChange={(event) => setFlexFeeDraft(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#7b8580]">
                    Charged per withdrawal once the free ones are used. Set 0 to make bank withdrawals always free. Compare with what your payment provider charges you per payout.
                  </span>
                </label>
                <label className="text-xs font-semibold text-[#68716d]">
                  Minimum withdrawal (NGN)
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={flexMinDraft ?? String(flexMinWithdrawal)}
                    onChange={(event) => setFlexMinDraft(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#7b8580]">
                    Smallest amount a customer can send to their bank (current default ₦500).
                  </span>
                </label>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="WeFitSave (Group Savings & Minimum Contribution Rules)"
              description="Turn WeFitSave (Group Savings) on or off independently of UfitSave, and configure the UfitGo system minimum deposit floor alongside the minimum contribution standard Group Admins can set for their group (must never be less than ₦10,000)."
              isExpanded={!collapsedFeeCards.includes("wefit-save")}
              onToggle={() => toggleFeeCard("wefit-save")}
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#17201c]">
                    <span>Feature enabled</span>
                    <ToggleSwitch
                      checked={config?.features?.enableWefitSave !== false}
                      disabled={savingFeature === "enableWefitSave"}
                      onChange={() => void toggleFeature("enableWefitSave", config?.features?.enableWefitSave !== false)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveWefitConfig()}
                    disabled={savingWefitConfig}
                    className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                  >
                    {savingWefitConfig ? "Saving..." : "Save WeFitSave"}
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold text-[#68716d]">
                  UfitGo System Minimum Deposit (NGN · Hard Floor)
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={wefitSystemMinDraft ?? String(wefitSystemMinContribution)}
                    onChange={(event) => setWefitSystemMinDraft(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#7b8580]">
                    Hard-enforced minimum for any single WeFitSave deposit across wallet, card, or bank transfer (default ₦500).
                  </span>
                </label>

                <label className="text-xs font-semibold text-[#68716d]">
                  Group Admin Minimum Standard Floor (NGN · Min ₦10,000)
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    value={wefitGroupFloorDraft ?? String(wefitGroupAdminMinFloor)}
                    onChange={(event) => setWefitGroupFloorDraft(event.target.value)}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#7b8580]">
                    Lowest recommended contribution standard a Group Admin can configure when creating a group goal (cannot be below ₦10,000).
                  </span>
                </label>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Travel FX (SAR / USD Account & Cards Pricing & Spreads)"
              description="Configure wholesale NGN/USD rate, NGN → SAR/USD conversion spread, Convert-Back buy-back spread, and Virtual/Physical Travel FX Card issuance fees. Both toggles default to OFF until you enable them."
              isExpanded={!collapsedFeeCards.includes("pilgrim-fx")}
              onToggle={() => toggleFeeCard("pilgrim-fx")}
              action={
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#17201c]">
                    <span>Travel FX &amp; Cards</span>
                    <ToggleSwitch
                      checked={config?.features?.enablePilgrimFxAccount === true}
                      disabled={savingFeature === "enablePilgrimFxAccount"}
                      onChange={() => void toggleFeature("enablePilgrimFxAccount", config?.features?.enablePilgrimFxAccount === true)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-[#17201c]">
                    <span>Convert Back (SAR → NGN)</span>
                    <ToggleSwitch
                      checked={config?.features?.enablePilgrimFxConvertBack === true}
                      disabled={savingFeature === "enablePilgrimFxConvertBack"}
                      onChange={() => void toggleFeature("enablePilgrimFxConvertBack", config?.features?.enablePilgrimFxConvertBack === true)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void savePilgrimFxConfig()}
                    disabled={savingPilgrimFx}
                    className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                  >
                    {savingPilgrimFx ? "Saving..." : "Save Travel FX"}
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <label className="text-xs font-semibold text-[#68716d]">
                  Wholesale Rate (₦ per $1 USD)
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={String(pilgrimFxConfig.wholesaleNgnPerUsd)}
                    onChange={(event) =>
                      setPilgrimFxDraft((current) => ({
                        ...(current ?? pilgrimFxConfig),
                        wholesaleNgnPerUsd: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                </label>

                <label className="text-xs font-semibold text-[#68716d]">
                  Local → Foreign Rate (₦ per $1 USD)
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={String(
                      Math.round(
                        pilgrimFxConfig.wholesaleNgnPerUsd *
                          (1 + pilgrimFxConfig.sellSpreadPercent / 100) *
                          100
                      ) / 100
                    )}
                    onChange={(event) => {
                      const nextSellRate = Number(event.target.value)
                      setPilgrimFxDraft((current) => {
                        const base = current ?? pilgrimFxConfig
                        const wholesale = Math.max(100, base.wholesaleNgnPerUsd || 1600)
                        const computedSpread = Math.max(
                          0,
                          Math.min(25, Number((((nextSellRate / wholesale) - 1) * 100).toFixed(2)))
                        )
                        return {
                          ...base,
                          sellSpreadPercent: Number.isFinite(computedSpread) ? computedSpread : base.sellSpreadPercent,
                        }
                      })
                    }}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#68716d]">
                    Spread: +{pilgrimFxConfig.sellSpreadPercent}% · ₦
                    {(
                      (pilgrimFxConfig.wholesaleNgnPerUsd *
                        (1 + pilgrimFxConfig.sellSpreadPercent / 100)) /
                      3.75
                    ).toFixed(2)}{" "}
                    / 1 SAR
                  </span>
                </label>

                <label className="text-xs font-semibold text-[#68716d]">
                  Foreign → Local Rate (₦ per $1 USD)
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={String(
                      Math.round(
                        pilgrimFxConfig.wholesaleNgnPerUsd *
                          (1 - pilgrimFxConfig.buyBackSpreadPercent / 100) *
                          100
                      ) / 100
                    )}
                    onChange={(event) => {
                      const nextBuyBackRate = Number(event.target.value)
                      setPilgrimFxDraft((current) => {
                        const base = current ?? pilgrimFxConfig
                        const wholesale = Math.max(100, base.wholesaleNgnPerUsd || 1600)
                        const computedSpread = Math.max(
                          0,
                          Math.min(25, Number(((1 - nextBuyBackRate / wholesale) * 100).toFixed(2)))
                        )
                        return {
                          ...base,
                          buyBackSpreadPercent: Number.isFinite(computedSpread)
                            ? computedSpread
                            : base.buyBackSpreadPercent,
                        }
                      })
                    }}
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="mt-1 block text-[11px] font-normal text-[#68716d]">
                    Spread: -{pilgrimFxConfig.buyBackSpreadPercent}% · ₦
                    {(
                      (pilgrimFxConfig.wholesaleNgnPerUsd *
                        (1 - pilgrimFxConfig.buyBackSpreadPercent / 100)) /
                      3.75
                    ).toFixed(2)}{" "}
                    / 1 SAR
                  </span>
                </label>

                <label className="text-xs font-semibold text-[#68716d]">
                  Virtual Card Issuance Fee ($ USD)
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={String(pilgrimFxConfig.virtualCardFeeUsd)}
                    onChange={(event) =>
                      setPilgrimFxDraft((current) => ({
                        ...(current ?? pilgrimFxConfig),
                        virtualCardFeeUsd: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                </label>

                <label className="text-xs font-semibold text-[#68716d]">
                  Physical Card + Delivery (₦ NGN)
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={String(pilgrimFxConfig.physicalCardFeeNgn)}
                    onChange={(event) =>
                      setPilgrimFxDraft((current) => ({
                        ...(current ?? pilgrimFxConfig),
                        physicalCardFeeNgn: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-[#68716d]">
                Effective Pilgrim Buy Rate: <strong>₦{Math.round(pilgrimFxConfig.wholesaleNgnPerUsd * (1 + pilgrimFxConfig.sellSpreadPercent / 100)).toLocaleString()} / $1 USD</strong> (<strong>₦{(pilgrimFxConfig.wholesaleNgnPerUsd * (1 + pilgrimFxConfig.sellSpreadPercent / 100) / 3.75).toFixed(2)} / 1 SAR</strong>) · Effective Convert-Back Rate: <strong>₦{Math.round(pilgrimFxConfig.wholesaleNgnPerUsd * (1 - pilgrimFxConfig.buyBackSpreadPercent / 100)).toLocaleString()} / $1 USD</strong>
              </p>

              {/* Live Market Benchmark & Admin Rate Decision Calculator */}
              {(() => {
                const sellNgnPerUsd =
                  pilgrimFxConfig.wholesaleNgnPerUsd *
                  (1 + pilgrimFxConfig.sellSpreadPercent / 100)
                const sellNgnPerSar = sellNgnPerUsd / 3.75
                const buyBackNgnPerUsd =
                  pilgrimFxConfig.wholesaleNgnPerUsd *
                  (1 - pilgrimFxConfig.buyBackSpreadPercent / 100)
                const buyBackNgnPerSar = buyBackNgnPerUsd / 3.75
                const marketNgnPerUsd = liveMarketRates.NGN || 1595
                const marketNgnPerSar = marketNgnPerUsd / (liveMarketRates.SAR || 3.75)

                const rawNum = Math.max(0, Number(String(fxCalcInput || "0").replace(/,/g, "")) || 0)
                const simSar =
                  fxCalcActiveBox === "SAR"
                    ? rawNum
                    : fxCalcActiveBox === "USD"
                      ? rawNum * 3.75
                      : sellNgnPerSar > 0
                        ? rawNum / sellNgnPerSar
                        : 0
                const simUsd = simSar / 3.75
                const simPilgrimPaysNgn = simUsd * sellNgnPerUsd
                const simWholesaleCostNgn = simUsd * pilgrimFxConfig.wholesaleNgnPerUsd
                const simMarketCostNgn = simUsd * marketNgnPerUsd
                const simUfitGoSpreadProfitNgn = simPilgrimPaysNgn - simWholesaleCostNgn
                const simConvertBackNgn = simUsd * buyBackNgnPerUsd

                return (
                  <div className="mt-5 rounded-xl border border-[#cde3d8] bg-[#f4faf7] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7e8df] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block size-2 rounded-full bg-[#0d7d5f]" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0b5c45]">
                            Live Market Benchmark &amp; Rate Decision Calculator
                          </h4>
                        </div>
                        <p className="mt-0.5 text-xs text-[#546860]">
                          Compare live interbank/NAFEM reference rates against your Wholesale &amp; Pilgrim Travel FX rates before saving.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPilgrimFxDraft((current) => ({
                              ...(current ?? pilgrimFxConfig),
                              wholesaleNgnPerUsd: Math.round(marketNgnPerUsd),
                            }))
                          }
                          className="rounded-lg border border-[#96ceb5] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0b5c45] hover:bg-[#e8f6ef]"
                        >
                          Use Live Market (₦{Math.round(marketNgnPerUsd).toLocaleString()}) as Wholesale
                        </button>
                        <button
                          type="button"
                          disabled={refreshingMarketRates}
                          onClick={() => void fetchLiveMarketBenchmarkRates()}
                          className="rounded-lg border border-[#c9d8d0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#17201c] hover:bg-[#eef4f1] disabled:opacity-50"
                        >
                          {refreshingMarketRates ? "Refreshing..." : "Refresh Live Rate"}
                        </button>
                      </div>
                    </div>

                    {/* 4-Card Rate Comparison Strip */}
                    <div className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                        <p className="text-[10px] font-bold uppercase text-[#68716d]">
                          1. Live Official Reference ({liveMarketRates.updatedAt})
                        </p>
                        <p className="mt-1 text-base font-extrabold text-[#17201c]">
                          ₦{marketNgnPerUsd.toLocaleString("en-NG", { maximumFractionDigits: 2 })} <span className="text-xs font-semibold text-[#68716d]">/ $1</span>
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[#0d7d5f]">
                          1 SAR = ₦{marketNgnPerSar.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                        <p className="text-[10px] font-bold uppercase text-[#68716d]">
                          2. Your Wholesale Base
                        </p>
                        <p className="mt-1 text-base font-extrabold text-[#17201c]">
                          ₦{pilgrimFxConfig.wholesaleNgnPerUsd.toLocaleString("en-NG")} <span className="text-xs font-semibold text-[#68716d]">/ $1</span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#68716d]">
                          1 SAR = ₦{(pilgrimFxConfig.wholesaleNgnPerUsd / 3.75).toFixed(2)} ({pilgrimFxConfig.wholesaleNgnPerUsd >= marketNgnPerUsd ? "+" : ""}
                          ₦{Math.round(pilgrimFxConfig.wholesaleNgnPerUsd - marketNgnPerUsd)} vs market)
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#96ceb5] bg-[#eaf7f1] p-3">
                        <p className="text-[10px] font-bold uppercase text-[#0b5c45]">
                          3. Pilgrim Local → Foreign (Sell)
                        </p>
                        <p className="mt-1 text-base font-extrabold text-[#0b5c45]">
                          ₦{Math.round(sellNgnPerUsd).toLocaleString("en-NG")} <span className="text-xs font-semibold">/ $1</span>
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-[#0d7d5f]">
                          1 SAR = ₦{sellNgnPerSar.toFixed(2)} (+{pilgrimFxConfig.sellSpreadPercent}% · +₦
                          {Math.round(sellNgnPerUsd - pilgrimFxConfig.wholesaleNgnPerUsd)}/USD)
                        </p>
                      </div>

                      <div className="rounded-lg border border-[#d7e2dc] bg-white p-3">
                        <p className="text-[10px] font-bold uppercase text-[#68716d]">
                          4. Pilgrim Foreign → Local (Buy-Back)
                        </p>
                        <p className="mt-1 text-base font-extrabold text-[#17201c]">
                          ₦{Math.round(buyBackNgnPerUsd).toLocaleString("en-NG")} <span className="text-xs font-semibold text-[#68716d]">/ $1</span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#68716d]">
                          1 SAR = ₦{buyBackNgnPerSar.toFixed(2)} (-{pilgrimFxConfig.buyBackSpreadPercent}% · -₦
                          {Math.round(pilgrimFxConfig.wholesaleNgnPerUsd - buyBackNgnPerUsd)}/USD)
                        </p>
                      </div>
                    </div>

                    {/* Interactive Admin 3-Way Simulator */}
                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="space-y-3 rounded-lg border border-[#d7e2dc] bg-white p-3.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#17201c]">
                            Interactive Pilgrim Trade Simulator
                          </p>
                          <div className="flex gap-1">
                            {(["SAR", "USD", "NGN"] as const).map((ccy) => (
                              <button
                                key={ccy}
                                type="button"
                                onClick={() => {
                                  setFxCalcActiveBox(ccy)
                                  if (ccy === "SAR") setFxCalcInput(String(Math.round(simSar || 1500)))
                                  else if (ccy === "USD") setFxCalcInput(String(Math.round(simUsd || 400)))
                                  else setFxCalcInput(String(Math.round(simPilgrimPaysNgn || 650000)))
                                }}
                                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                                  fxCalcActiveBox === ccy
                                    ? "bg-[#0d7d5f] text-white"
                                    : "bg-[#f1f5f3] text-[#4b5853] hover:bg-[#e3ece8]"
                                }`}
                              >
                                Input {ccy}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#68716d]">
                            Test Amount ({fxCalcActiveBox})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={fxCalcInput}
                            onChange={(e) => setFxCalcInput(e.target.value)}
                            className="mt-1 h-10 w-full rounded-lg border border-[#b9ccc2] bg-[#f9fbfa] px-3 text-base font-extrabold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "175 SAR (Train)", mode: "SAR" as const, val: "175" },
                            { label: "1,500 SAR (7-Day Upkeep)", mode: "SAR" as const, val: "1500" },
                            { label: "$500 USD", mode: "USD" as const, val: "500" },
                            { label: "₦500,000", mode: "NGN" as const, val: "500000" },
                            { label: "₦1,000,000", mode: "NGN" as const, val: "1000000" },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setFxCalcActiveBox(preset.mode)
                                setFxCalcInput(preset.val)
                              }}
                              className="rounded-md border border-[#d3dad7] bg-[#f8fbf9] px-2 py-1 text-[11px] font-semibold text-[#204236] hover:bg-[#eaf4ef]"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#d7e2dc] bg-white p-3.5">
                        <div className="rounded-lg bg-[#f4faf7] p-2.5">
                          <p className="text-[10px] font-bold uppercase text-[#68716d]">
                            Pilgrim Pays (UfitFlex NGN)
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#17201c]">
                            ₦{Math.round(simPilgrimPaysNgn).toLocaleString("en-NG")}
                          </p>
                          <p className="text-[11px] text-[#68716d]">
                            Official Ref: ₦{Math.round(simMarketCostNgn).toLocaleString("en-NG")}
                          </p>
                        </div>

                        <div className="rounded-lg bg-[#f4faf7] p-2.5">
                          <p className="text-[10px] font-bold uppercase text-[#68716d]">
                            Pilgrim Receives (FX)
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#0b5c45]">
                            SAR {simSar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] text-[#68716d]">
                            ≈ ${simUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </p>
                        </div>

                        <div className="rounded-lg border border-[#b7e2ce] bg-[#eaf8f1] p-2.5">
                          <p className="text-[10px] font-bold uppercase text-[#0b5c45]">
                            UfitGo Spread Margin
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#0b5c45]">
                            +₦{Math.round(simUfitGoSpreadProfitNgn).toLocaleString("en-NG")}
                          </p>
                          <p className="text-[11px] text-[#1f6f48]">
                            +{pilgrimFxConfig.sellSpreadPercent}% over wholesale
                          </p>
                        </div>

                        <div className="rounded-lg bg-[#f4faf7] p-2.5">
                          <p className="text-[10px] font-bold uppercase text-[#68716d]">
                            If Converted Back to NGN
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[#17201c]">
                            ₦{Math.round(simConvertBackNgn).toLocaleString("en-NG")}
                          </p>
                          <p className="text-[11px] text-[#68716d]">
                            @ ₦{buyBackNgnPerSar.toFixed(2)} / SAR
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Halal Lock (Fixed-Tenor Mudarabah & Wadiah)"
              description="Configure minimum lump-sum lock amount, Shariah return options, and indicative Mudarabah annual profit rates per tenor tier (90–365 days). Turn Halal Lock off globally from Platform features."
              isExpanded={!collapsedFeeCards.includes("halal-lock")}
              onToggle={() => toggleFeeCard("halal-lock")}
              action={
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#17201c]">
                    <span>Feature enabled</span>
                    <ToggleSwitch
                      checked={config?.features?.enableHalalLock !== false}
                      disabled={savingFeature === "enableHalalLock"}
                      onChange={() => void toggleFeature("enableHalalLock", config?.features?.enableHalalLock !== false)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveHalalLockConfig()}
                    disabled={savingHalalLock}
                    className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50"
                  >
                    {savingHalalLock ? "Saving..." : "Save Halal Lock"}
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-xs font-semibold text-[#68716d]">
                  Minimum lock amount (NGN)
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={String(halalLockConfig.minAmount)}
                    onChange={(event) =>
                      setHalalLockDraft((current) => ({
                        ...(current ?? halalLockConfig),
                        minAmount: Number(event.target.value),
                      }))
                    }
                    className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                  />
                </label>

                <div className="flex items-center justify-between rounded-lg border border-[#dbe2de] bg-white px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#17201c]">Mudarabah Profit Option</p>
                    <p className="text-[11px] text-[#7b8580]">Allow users to earn Halal profit share at maturity</p>
                  </div>
                  <ToggleSwitch
                    checked={halalLockConfig.allowMudarabahProfit}
                    onChange={() =>
                      setHalalLockDraft((current) => {
                        const base = current ?? halalLockConfig
                        return { ...base, allowMudarabahProfit: !base.allowMudarabahProfit }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#dbe2de] bg-white px-4 py-3">
                  <div>
                    <p className="text-xs font-bold text-[#17201c]">Principal Only (0% Wadiah)</p>
                    <p className="text-[11px] text-[#7b8580]">Allow users to lock principal with 0% return</p>
                  </div>
                  <ToggleSwitch
                    checked={halalLockConfig.allowPrincipalOnly}
                    onChange={() =>
                      setHalalLockDraft((current) => {
                        const base = current ?? halalLockConfig
                        return { ...base, allowPrincipalOnly: !base.allowPrincipalOnly }
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-[#dbe2de] pt-5">
                <p className="text-sm font-bold text-[#17201c]">Tenor tiers & indicative Mudarabah profit rates</p>
                <p className="mt-0.5 text-xs text-[#68716d]">Enable or disable individual lock durations and adjust their annual profit rate (% p.a.), highlight badge, and subtitle.</p>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {halalLockConfig.tiers.map((tier) => {
                    const effectiveReturn = Number(((tier.annualRatePercent * tier.days) / 365).toFixed(1))
                    return (
                      <div key={tier.days} className="rounded-lg border border-[#dbe2de] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#17201c]">{tier.label}</p>
                            <p className="text-xs text-[#68716d]">~{effectiveReturn}% effective return over {tier.days} days</p>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-[#68716d]">
                            <span>{tier.enabled ? "Enabled" : "Disabled"}</span>
                            <ToggleSwitch
                              checked={tier.enabled}
                              onChange={() =>
                                setHalalLockDraft((current) => {
                                  const base = current ?? halalLockConfig
                                  return {
                                    ...base,
                                    tiers: base.tiers.map((item) =>
                                      item.days === tier.days ? { ...item, enabled: !item.enabled } : item
                                    ),
                                  }
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <label className="text-xs font-semibold text-[#68716d]">
                            Annual rate (% p.a.)
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={String(tier.annualRatePercent)}
                              onChange={(event) =>
                                setHalalLockDraft((current) => {
                                  const base = current ?? halalLockConfig
                                  return {
                                    ...base,
                                    tiers: base.tiers.map((item) =>
                                      item.days === tier.days
                                        ? { ...item, annualRatePercent: Number(event.target.value) }
                                        : item
                                    ),
                                  }
                                })
                              }
                              className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]"
                            />
                          </label>

                          <label className="text-xs font-semibold text-[#68716d]">
                            Highlight badge (optional)
                            <input
                              type="text"
                              placeholder="e.g. Minimum, Popular, Max Yield"
                              value={tier.badge ?? ""}
                              onChange={(event) =>
                                setHalalLockDraft((current) => {
                                  const base = current ?? halalLockConfig
                                  return {
                                    ...base,
                                    tiers: base.tiers.map((item) =>
                                      item.days === tier.days
                                        ? { ...item, badge: event.target.value }
                                        : item
                                    ),
                                  }
                                })
                              }
                              className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]"
                            />
                          </label>
                        </div>

                        <label className="mt-3 block text-xs font-semibold text-[#68716d]">
                          Customer subtitle
                          <input
                            type="text"
                            value={tier.subtitle}
                            onChange={(event) =>
                              setHalalLockDraft((current) => {
                                const base = current ?? halalLockConfig
                                return {
                                  ...base,
                                  tiers: base.tiers.map((item) =>
                                    item.days === tier.days
                                      ? { ...item, subtitle: event.target.value }
                                      : item
                                  ),
                                }
                              })
                            }
                            className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]"
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard title="Hajj & Umrah Intelligence" description="Control Finder availability. Configure customer-facing Base and Plus prices in the Open Slot Pass catalogue below." isExpanded={!collapsedFeeCards.includes("intelligence")} onToggle={() => toggleFeeCard("intelligence")} action={<button type="button" onClick={() => void saveIntelligenceConfig()} disabled={savingIntelligence} className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{savingIntelligence ? "Saving..." : "Save Intelligence"}</button>}>
              <div className="grid gap-4 lg:grid-cols-3">
                {(["finderMode", "comparisonMode"] as const).map((key) => (
                  <label key={key} className="text-xs font-semibold text-[#68716d]">{key === "finderMode" ? "Available Slot Finder" : "Package Comparison"}
                    <select value={intelligenceConfig[key] ?? "free"} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, [key]: event.target.value as "disabled" | "free" | "paid" }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]">
                      <option value="disabled">Disabled</option>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-5 border-t border-[#dbe2de] pt-5">
                <div>
                  <p className="text-sm font-bold text-[#17201c]">Open Slot Pass catalogue</p>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-[#68716d]">Set the customer-facing Base and Plus prices for each journey. Hajj and Ramadan passes end on Admin-selected dates; regular Umrah is valid for a number of days from purchase.</p>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {(["hajj", "ramadan", "umrah"] as const).map((journey) => {
                    const pass = openSlotPasses[journey]
                    const label = journey === "hajj" ? "Hajj" : journey === "ramadan" ? "Ramadan Umrah" : "Regular Umrah"
                    return (
                      <div key={journey} className="rounded-lg border border-[#dbe2de] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-[#17201c]">{label}</p>
                          <select aria-label={`${label} Open Slot Pass availability`} value={pass.mode} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, [journey]: { ...pass, mode: event.target.value as OpenSlotPassConfig["mode"] } } }))} className="h-9 rounded-lg border border-[#d3dad7] bg-white px-2 text-xs font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]">
                            <option value="disabled">Disabled</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <label className="text-xs font-semibold text-[#68716d]">Base (NGN)
                            <input aria-label={`${label} Base price`} type="number" min="0" value={String(pass.basePrice)} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, [journey]: { ...pass, basePrice: Number(event.target.value) } } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                          </label>
                          <label className="text-xs font-semibold text-[#68716d]">Plus (NGN)
                            <input aria-label={`${label} Plus price`} type="number" min="0" value={String(pass.plusPrice)} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, [journey]: { ...pass, plusPrice: Number(event.target.value) } } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                          </label>
                        </div>
                        {journey === "umrah" ? (
                          <label className="mt-3 block text-xs font-semibold text-[#68716d]">Validity from purchase (days)
                            <input aria-label="Regular Umrah validity duration" type="number" min="1" value={String(pass.durationDays ?? 30)} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, umrah: { ...pass, durationDays: Number(event.target.value) } } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                          </label>
                        ) : (
                          <div className="mt-3 grid gap-3">
                            {journey === "ramadan" && (
                              <label className="text-xs font-semibold text-[#68716d]">Available from
                                <input aria-label="Ramadan Open Slot Pass start date" type="date" value={pass.startsOn ?? ""} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, ramadan: { ...pass, startsOn: event.target.value || null } } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                              </label>
                            )}
                            <label className="text-xs font-semibold text-[#68716d]">Pass ends
                              <input aria-label={`${label} Open Slot Pass end date`} type="date" value={pass.endsOn ?? ""} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, openSlotPasses: { ...openSlotPasses, [journey]: { ...pass, endsOn: event.target.value || null } } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-[#d9dfdc] bg-white p-4">
                <p className="text-sm font-bold text-[#17201c]">Early access for Open Slot Pass holders</p>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-[#68716d]">
                  Give paying customers a head start. When you set hours here, every <strong>new</strong> package for that journey is shown only to customers with an active Open Slot Pass for the first few hours. After that it appears for everyone. Customers without a pass are told how many new packages are waiting, so they know what the pass offers, but cannot open them.
                </p>
                <ul className="mt-2 max-w-3xl list-disc space-y-1 pl-5 text-xs leading-5 text-[#68716d]">
                  <li><strong>0 hours turns it off.</strong> New packages are public immediately, exactly as today. This is the starting setting.</li>
                  <li>It only works while Open Slot is switched on. If you set <strong>Available Slot Finder</strong> to Disabled (or turn off the Plan Open Slot feature), every package is public immediately, whatever hours are set here. It also needs the journey's Open Slot Pass set to <strong>Paid</strong> above (and, for Hajj, the Hajj season campaign <strong>Live</strong>). Otherwise nobody could buy a pass to see the new packages, so they stay public.</li>
                  <li>Only packages created from now on are affected. Packages that are already live stay visible to everyone.</li>
                  <li>The wait starts when the operator creates the package. It applies to the app and the website lists. A direct link to a package always opens, and booking is never blocked.</li>
                  <li>Pass holders also get availability alerts for these packages as soon as they appear.</li>
                  <li>Choose a short window first (for example 24 hours) and check bookings before making it longer. The maximum is 168 hours (7 days).</li>
                </ul>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(["hajj", "ramadan", "umrah"] as const).map((journey) => {
                    const label = journey === "hajj" ? "Hajj" : journey === "ramadan" ? "Ramadan Umrah" : "Regular Umrah"
                    const hours = Number(earlyAccessHours[journey] ?? 0)
                    return (
                      <label key={journey} className="text-xs font-semibold text-[#68716d]">{label}: hours before everyone else sees new packages
                        <input aria-label={`${label} early access hours`} type="number" min="0" max="168" step="1" value={String(hours)} onChange={(event) => setIntelligenceDraft((current: IntelligenceConfig | null) => ({ ...intelligenceConfig, ...current, earlyAccess: { ...earlyAccessHours, [journey]: event.target.value === "" ? 0 : Number(event.target.value) } }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                        <span className={`mt-1 block text-xs font-normal leading-5 ${hours > 0 ? "text-[#0d7d5f]" : "text-[#68716d]"}`}>
                          {hours > 0
                            ? `New ${label} packages are visible only to pass holders for ${hours} hour${hours === 1 ? "" : "s"}${hours >= 24 ? ` (about ${Math.round((hours / 24) * 10) / 10} day${hours === 24 ? "" : "s"})` : ""}, then to everyone.`
                            : `Off: new ${label} packages are public immediately.`}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-3 text-xs leading-5 text-[#68716d]">Click <strong>Save Intelligence</strong> at the top of this card to apply. The app picks the change up within a minute.</p>
              </div>
              <div className="mt-4 rounded-lg border border-[#d9dfdc] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#17201c]">Hajj season campaign</p>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-[#68716d]">Planning shows free Hajj-opening and savings waitlists. Live enables the paid Hajj Intelligence flow. Hidden removes the campaign card from the app.</p>
                  </div>
                  <button type="button" onClick={() => void saveCampaignConfig()} disabled={savingCampaign} className="h-10 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{savingCampaign ? "Saving..." : "Save campaign"}</button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#68716d]">Campaign mode
                    <select value={campaignConfig.mode} onChange={(event) => setCampaignDraft((current) => ({ ...campaignConfig, ...current, mode: event.target.value as HajjSeasonCampaignConfig["mode"] }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]">
                      <option value="planning">Planning / waitlist</option>
                      <option value="live">Live / paid Hajj Intelligence</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[#68716d]">Season label
                    <input value={campaignConfig.seasonLabel} onChange={(event) => setCampaignDraft((current) => ({ ...campaignConfig, ...current, seasonLabel: event.target.value }))} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold text-[#68716d]">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span>Season rollover announcement</span>
                    <select aria-label="Announcement suggestion" value="" onChange={(event) => {
                      const suggestion = event.target.value === "open"
                        ? `${campaignConfig.seasonLabel} planning is now open. Start preparing early and join the waitlist for updates.`
                        : `${campaignConfig.seasonLabel} bookings have closed. Start preparing early for the next Hajj season.`
                      setCampaignDraft((current) => ({ ...campaignConfig, ...current, rolloverAnnouncement: suggestion }))
                    }} className="h-8 rounded-lg border border-[#d3dad7] bg-white px-2 text-xs font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]">
                      <option value="">Use a suggestion</option>
                      <option value="open">Open state</option>
                      <option value="closed">Closed state</option>
                    </select>
                  </span>
                  <textarea value={campaignConfig.rolloverAnnouncement ?? ""} onChange={(event) => setCampaignDraft((current) => ({ ...campaignConfig, ...current, rolloverAnnouncement: event.target.value || null }))} placeholder="Hajj 2027 bookings have closed. Start preparing for Hajj 2028." rows={3} className="mt-1 block w-full resize-y rounded-lg border border-[#d3dad7] bg-white px-3 py-2 text-sm outline-none focus:border-[#0d7d5f]" />
                  <span className="mt-1 block font-normal text-[#7b8580]">Shown to customers while this campaign is in planning mode. Leave blank for the standard planning message.</span>
                </label>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard title="KYC tier limits" description="These limits apply immediately to wallet and savings enforcement." isExpanded={!collapsedFeeCards.includes("kyc-tiers")} onToggle={() => toggleFeeCard("kyc-tiers")}>
              <div className="space-y-4">
                {(config?.tiers || []).map((tier) => {
                  const tierKey = `${tier.provider}-${tier.tierLevel}`
                  const draft = tierDrafts[tierKey]
                  const hasChanges = Boolean(draft && Object.entries(draft).some(([key, value]) => Number(value) !== Number(tier[key as TierLimitKey])))
                  return (
                    <div key={tierKey} className="border-t border-[#dbe2de] pt-4 first:border-t-0 first:pt-0">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#17201c]">{tier.provider} {tier.name}</p>
                          <p className="mt-0.5 text-xs text-[#7b8580]">Tier {tier.tierLevel}</p>
                        </div>
                        {hasChanges && <button type="button" onClick={() => void saveTierLimits(tier.provider, tier.tierLevel)} disabled={savingTier === tierKey} className="h-9 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{savingTier === tierKey ? "Saving..." : "Save changes"}</button>}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {(["maxBalanceLimit", "singleTransactionLimit", "dailyTransactionLimit"] as TierLimitKey[]).map((key) => (
                          <label key={key} className="text-xs font-semibold text-[#68716d]">{key === "maxBalanceLimit" ? "Maximum balance" : key === "singleTransactionLimit" ? "Per transaction" : "Daily outgoing"}
                            <input type="number" min="0" value={draft?.[key] ?? String(tier[key])} onChange={(event) => updateTierDraft(tier.provider, tier.tierLevel, key, event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm outline-none focus:border-[#0d7d5f]" />
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Savings plan check (missed payments)"
              description="What the daily savings plan check does when a UfitSave goal misses a saving cycle. Start with Report only for a week and review the job's results in Scheduler before moving up. The check itself runs from Admin > Scheduler (Savings plan check)."
              isExpanded={!collapsedFeeCards.includes("plan-check")}
              onToggle={() => toggleFeeCard("plan-check")}
            >
              <div className="flex flex-col gap-2 sm:items-end">
                <select
                  aria-label="Savings plan check mode"
                  value={scheduleEnforcement}
                  onChange={(event) => void saveFeeField("savingsConfig", "scheduleEnforcement", event.target.value)}
                  className="h-10 rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                >
                  <option value="report">Report only (no changes, no messages)</option>
                  <option value="notify">Notify customers (count missed cycles, never drop)</option>
                  <option value="enforce">Enforce (also drop goals 3 cycles behind)</option>
                </select>
                <span className="max-w-md text-[11px] text-[#7b8580] sm:text-right">
                  Dropping only unlinks the package and stops the plan. The customer&apos;s money stays in the goal and can be withdrawn.
                </span>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Auto-save minimum per move"
              description="Auto-save skips any move smaller than this, so customers don't get many tiny transfers into their goals. Turn auto-save on or off under Features."
              isExpanded={!collapsedFeeCards.includes("auto-save")}
              onToggle={() => toggleFeeCard("auto-save")}
            >
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  type="number"
                  min="100"
                  step="100"
                  aria-label="Auto-save minimum per move"
                  defaultValue={autoSaveMinMove}
                  key={`autosave-min-${autoSaveMinMove}`}
                  onBlur={(event) => {
                    const val = Number(event.target.value)
                    if (Number.isFinite(val) && val >= 100 && val !== autoSaveMinMove) void saveFeeField("savingsConfig", "autoSaveMinMove", val)
                  }}
                  className="h-10 w-28 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]"
                />
                <span className="text-sm font-bold text-[#68716d]">NGN (min ₦100)</span>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Face check strictness"
              description="How closely a live selfie must match the customer's saved BVN selfie before they can change their PIN or secret question. Higher is stricter: fewer wrong people pass, but more real customers are asked to retry. In our tests the same person scored about 0.74 and different people 0.13 to 0.26. Turn the check on or off under Features."
              isExpanded={!collapsedFeeCards.includes("face-check")}
              onToggle={() => toggleFeeCard("face-check")}
            >
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  type="number"
                  min="0.2"
                  max="0.9"
                  step="0.05"
                  aria-label="Face check strictness"
                  defaultValue={faceCheckThreshold}
                  key={`face-threshold-${faceCheckThreshold}`}
                  onBlur={(event) => {
                    const val = Number(event.target.value)
                    if (Number.isFinite(val) && val >= 0.2 && val <= 0.9 && val !== faceCheckThreshold) void saveFeeField("savingsConfig", "faceCheckThreshold", val)
                  }}
                  className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]"
                />
                <span className="text-sm font-bold text-[#68716d]">score (0.2 to 0.9, suggested 0.45)</span>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard
              title="Bank withdrawal cap after a PIN or secret-question change"
              description="An extra guard, off by default. When on, for the set hours after a customer changes their PIN or secret question, their bank withdrawals are capped in total. Paying for bookings and moving money inside UfitGo are not affected."
              isExpanded={!collapsedFeeCards.includes("post-change-cap")}
              onToggle={() => toggleFeeCard("post-change-cap")}
            >
              <div className="flex flex-col gap-2 sm:items-end">
                <select
                  aria-label="Withdrawal cap after a security change"
                  value={postChangeCapEnabled ? "on" : "off"}
                  onChange={(event) => void saveFeeField("savingsConfig", "postChangeCapEnabled", event.target.value === "on")}
                  className="h-10 rounded-lg border border-[#d3dad7] bg-white px-3 text-sm font-semibold text-[#17201c] outline-none focus:border-[#0d7d5f]"
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    aria-label="Cap amount"
                    defaultValue={postChangeCapAmount}
                    key={`cap-amount-${postChangeCapAmount}`}
                    onBlur={(event) => {
                      const val = Number(event.target.value)
                      if (Number.isFinite(val) && val >= 1000 && val !== postChangeCapAmount) void saveFeeField("savingsConfig", "postChangeCapAmount", val)
                    }}
                    className="h-10 w-28 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="text-sm font-bold text-[#68716d]">NGN in total, for</span>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    aria-label="Cap hours"
                    defaultValue={postChangeCapHours}
                    key={`cap-hours-${postChangeCapHours}`}
                    onBlur={(event) => {
                      const val = parseInt(event.target.value, 10)
                      if (Number.isFinite(val) && val >= 1 && val <= 168 && val !== postChangeCapHours) void saveFeeField("savingsConfig", "postChangeCapHours", val)
                    }}
                    className="h-10 w-20 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]"
                  />
                  <span className="text-sm font-bold text-[#68716d]">hours</span>
                </div>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard title="Missed payment grace period" description="Days before a missed savings milestone is flagged for restructuring." isExpanded={!collapsedFeeCards.includes("grace-period")} onToggle={() => toggleFeeCard("grace-period")}>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input type="number" min="1" max="30" defaultValue={gracePeriodDays} key={`grace-${gracePeriodDays}`} onBlur={(event) => { const val = parseInt(event.target.value, 10); if (!Number.isNaN(val)) void saveFeeField("savingsConfig", "gracePeriodDays", val) }} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">days</span>
              </div>
            </CollapsibleFeeCard>
            <CollapsibleFeeCard title="Drop threshold limit" description="Days before departure where users below 80% funding are dropped from the package." isExpanded={!collapsedFeeCards.includes("drop-threshold")} onToggle={() => toggleFeeCard("drop-threshold")}>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input type="number" min="1" max="90" defaultValue={dropThresholdDays} key={`drop-${dropThresholdDays}`} onBlur={(event) => { const val = parseInt(event.target.value, 10); if (!Number.isNaN(val)) void saveFeeField("savingsConfig", "dropThresholdDays", val) }} className="h-10 w-24 rounded-lg border border-[#d3dad7] bg-white px-3 text-right text-sm outline-none focus:border-[#0d7d5f]" />
                <span className="text-sm font-bold text-[#68716d]">days</span>
              </div>
            </CollapsibleFeeCard>
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
