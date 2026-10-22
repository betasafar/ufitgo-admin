export type SeasonRule = {
  mode: "manual" | "automatic"
  year: number | null
  automaticFallbackEnabled: boolean
}

export type SectionConfig = {
  id: "recommendations" | "hajj" | "ramadan" | "featured" | "advert"
  enabled: boolean
  title: string
  mode: "manual" | "automatic" | "manual_with_fill"
  packageIds: number[]
  limit: number
  fallbackEnabled: boolean
  type?: "hajj" | "umrah"
  season?: "ramadan"
  seasonYear?: number
}

export type Campaign = {
  id: string
  title: string
  enabled: boolean
  startsAt: string
  endsAt: string
  packageIds: number[]
  fallbackEnabled: boolean
  type?: "hajj" | "umrah"
  season?: "ramadan"
  seasonYear?: number
}

export type HomeContent = {
  revision: number
  seasons: { hajj: SeasonRule; ramadan: SeasonRule }
  sections: SectionConfig[]
  campaigns: Campaign[]
  updatedAt?: string
  updatedBy?: string
}

export type HomePackage = {
  id: number
  title: string
  type: string
  season: "ramadan" | null
  seasonYear: number | null
  status: string
  salesStatus: string
  departureDate?: string
  operator?: { id?: number; name?: string; businessName?: string } | string
  remainingSlots?: number
}

export type PackageResult = {
  data: HomePackage[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export type HomePreview = {
  sections: {
    id: string
    title?: string
    packages?: HomePackage[]
    packageIds?: number[]
    selection?: { packageId: number; source: "manual" | "promoted" | "automatic" }[]
    [key: string]: unknown
  }[]
  warnings: unknown[]
  configVersion: number
}

export async function homeContentRequest<T>(path = "", options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/home-content${path}`, {
    ...options,
    cache: "no-store",
    headers: { ...(options?.body ? { "Content-Type": "application/json" } : {}), ...options?.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 409) {
      throw new Error("Revision conflict: another admin saved changes. Your draft is preserved. Reload the latest configuration before reapplying your changes.")
    }
    const message = Array.isArray(payload?.message) ? payload.message.join("; ") : payload?.message
    throw new Error(typeof message === "string" ? message : `Home content request failed (${response.status}).`)
  }
  return payload as T
}

export function toLocalDateTime(iso: string) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return ""
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function fromLocalDateTime(local: string) {
  return local ? new Date(local).toISOString() : ""
}

export function campaignEnd(startsAt: string, months: number) {
  const start = new Date(startsAt)
  const end = new Date(start)
  const day = start.getDate()
  end.setDate(1)
  end.setMonth(end.getMonth() + months)
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  end.setDate(Math.min(day, lastDay))
  return end.toISOString()
}

export function validateHomeContent(config: HomeContent): string | null {
  for (const [name, rule] of Object.entries(config.seasons)) {
    if (rule.mode === "manual" && (!Number.isInteger(rule.year) || Number(rule.year) < 2000 || Number(rule.year) > 2200)) {
      return `Select a selling year (2000–2200) for ${name}.`
    }
  }
  for (const section of config.sections) {
    if (!section.title.trim()) return `Enter a title for ${section.id}.`
    if (!Number.isInteger(section.limit) || section.limit < 1 || section.limit > 50) {
      return `Set a package limit from 1 to 50 for ${section.title}.`
    }
    if (section.season && section.type !== "umrah") return `Ramadan candidates must use Umrah type in ${section.title}.`
    if (section.seasonYear !== undefined) {
      if (section.type !== "hajj" && section.season !== "ramadan") return `A candidate season year requires Hajj or Ramadan in ${section.title}.`
      if (!Number.isInteger(section.seasonYear) || section.seasonYear < 2000 || section.seasonYear > 2200) return `Select a valid candidate season year for ${section.title}.`
    }
  }
  for (const campaign of config.campaigns) {
    if (!campaign.title.trim()) return "Enter a title for each campaign."
    if (!Number.isFinite(Date.parse(campaign.startsAt)) || !Number.isFinite(Date.parse(campaign.endsAt)) ||
        Date.parse(campaign.startsAt) >= Date.parse(campaign.endsAt)) {
      return `Choose an end after the start for ${campaign.title}.`
    }
    if (campaign.seasonYear !== undefined && (!Number.isInteger(campaign.seasonYear) || campaign.seasonYear < 2000 || campaign.seasonYear > 2200)) {
      return `Select a valid season year (2000–2200) for ${campaign.title}.`
    }
  }
  const active = config.campaigns.filter((campaign) => campaign.enabled)
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (Date.parse(active[i].startsAt) < Date.parse(active[j].endsAt) &&
          Date.parse(active[j].startsAt) < Date.parse(active[i].endsAt)) {
        return `Enabled campaigns "${active[i].title}" and "${active[j].title}" overlap. Pause one or adjust the dates.`
      }
    }
  }
  return null
}
