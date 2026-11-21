"use client"

import { useState } from "react"
import { Loader2, Save, UserPlus } from "lucide-react"

export type TravelerDetails = {
  firstName: string
  middleName: string
  lastName: string
  gender: "" | "MALE" | "FEMALE"
  dateOfBirth: string
  nationality: string
  relationship: string
  nin: string
}

export const emptyTravelerDetails: TravelerDetails = {
  firstName: "",
  middleName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  nationality: "Nigerian",
  relationship: "",
  nin: "",
}

type Source = {
  fullName?: string
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  nationality?: string | null
  relationship?: string | null
  nin?: string | null
}

// Older travellers only have a full name; split it as a starting point for staff to confirm
export function detailsFromTraveler(traveler: Source): TravelerDetails {
  const parts = (traveler.fullName || "").trim().split(/\s+/).filter(Boolean)
  const hasNames = Boolean(traveler.firstName || traveler.lastName)
  return {
    firstName: traveler.firstName || (hasNames ? "" : parts[0] || ""),
    middleName: traveler.middleName || (hasNames ? "" : parts.length > 2 ? parts.slice(1, -1).join(" ") : ""),
    lastName: traveler.lastName || (hasNames ? "" : parts.length > 1 ? parts[parts.length - 1] : ""),
    gender: traveler.gender === "MALE" || traveler.gender === "FEMALE" ? traveler.gender : "",
    dateOfBirth: traveler.dateOfBirth ? String(traveler.dateOfBirth).slice(0, 10) : "",
    nationality: traveler.nationality || "Nigerian",
    relationship: traveler.relationship || "",
    nin: traveler.nin || "",
  }
}

const inputClass = "h-10 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]"
const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#78817d]"

export function TravelerDetailsForm({
  initial,
  mode,
  showRelationship = true,
  onSubmit,
}: {
  initial: TravelerDetails
  mode: "add" | "edit"
  showRelationship?: boolean
  onSubmit: (details: TravelerDetails) => Promise<boolean>
}) {
  const [form, setForm] = useState<TravelerDetails>(initial)
  const [saving, setSaving] = useState(false)
  const set = (key: keyof TravelerDetails) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))
  const canSave = form.firstName.trim() && form.lastName.trim() && !saving
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (!canSave) return
        setSaving(true)
        try {
          const ok = await onSubmit(form)
          if (ok && mode === "add") setForm(emptyTravelerDetails)
        } finally {
          setSaving(false)
        }
      }}
    >
      <p className="mb-3 text-xs text-[#68716d]">Copy names exactly as printed on the passport data page.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label><span className={labelClass}>First name *</span><input required value={form.firstName} onChange={set("firstName")} className={`${inputClass} uppercase`} /></label>
        <label><span className={labelClass}>Middle name</span><input value={form.middleName} onChange={set("middleName")} className={`${inputClass} uppercase`} /></label>
        <label><span className={labelClass}>Last name (surname) *</span><input required value={form.lastName} onChange={set("lastName")} className={`${inputClass} uppercase`} /></label>
        <label>
          <span className={labelClass}>Gender</span>
          <select value={form.gender} onChange={set("gender")} className={inputClass}>
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>
        <label><span className={labelClass}>Date of birth</span><input type="date" max={today} value={form.dateOfBirth} onChange={set("dateOfBirth")} className={inputClass} /></label>
        <label><span className={labelClass}>Nationality</span><input value={form.nationality} onChange={set("nationality")} className={inputClass} /></label>
        {showRelationship && (
          <label><span className={labelClass}>Relationship to account holder</span><input value={form.relationship} onChange={set("relationship")} placeholder="e.g. Spouse, Child" className={inputClass} /></label>
        )}
        <label><span className={labelClass}>NIN (optional)</span><input value={form.nin} onChange={set("nin")} className={inputClass} /></label>
      </div>
      <button type="submit" disabled={!canSave} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">
        {saving ? <Loader2 className="size-4 animate-spin" /> : mode === "add" ? <UserPlus className="size-4" /> : <Save className="size-4" />}
        {mode === "add" ? "Add traveller" : "Save details"}
      </button>
    </form>
  )
}
