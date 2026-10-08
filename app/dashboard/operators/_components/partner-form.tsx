"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Save, UserPlus } from "lucide-react"

type PartnerFormProps = { operatorId?: string }

type PartnerFormState = {
  partnerType: string
  country: string
  companyName: string
  tradingName: string
  cacNumber: string
  foundedAt: string
  officeAddress: string
  email: string
  phone: string
  directorTitle: string
  directorName: string
  directorPhone: string
  directorWhatsApp: string
  directorNin: string
  description: string
  nahconLicense: string
  capacity: string
  transportReg: string
  fleetSize: string
  telecomPermit: string
  supportedNetworks: string
  guideLanguages: string
  guideExperience: string
  guideExpertise: string
}

const initialForm: PartnerFormState = {
  partnerType: "tour-operator",
  country: "Nigeria",
  companyName: "",
  tradingName: "",
  cacNumber: "",
  foundedAt: "",
  officeAddress: "",
  email: "",
  phone: "",
  directorTitle: "Mr",
  directorName: "",
  directorPhone: "",
  directorWhatsApp: "",
  directorNin: "",
  description: "",
  nahconLicense: "",
  capacity: "",
  transportReg: "",
  fleetSize: "",
  telecomPermit: "",
  supportedNetworks: "",
  guideLanguages: "",
  guideExperience: "",
  guideExpertise: "",
}

const partnerTypes = [
  { value: "tour-operator", label: "Tour operator" },
  { value: "exchange-agent", label: "FX agent" },
  { value: "transport", label: "Transport provider" },
  { value: "sim-seller", label: "SIM seller" },
  { value: "tour-guide", label: "Tour guide" },
]

function textValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value)
}

export function PartnerForm({ operatorId }: PartnerFormProps) {
  const router = useRouter()
  const isEdit = Boolean(operatorId)
  const [form, setForm] = useState<PartnerFormState>(initialForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!operatorId) return

    fetch(`/api/admin/operator-auth/operators/${operatorId}/dossier`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message || "Unable to load partner")
        const operator = payload?.data || payload || {}
        const owner = operator.businessOwner || {}
        setForm({
          partnerType: textValue(operator.partnerType || operator.partner_type || "tour-operator"),
          country: textValue(operator.country || "Nigeria"),
          companyName: textValue(operator.companyName || operator.company_name),
          tradingName: textValue(operator.tradingName || operator.trading_name),
          cacNumber: textValue(operator.cacNumber || operator.cac_number),
          foundedAt: textValue(operator.foundedAt || operator.founded_at),
          officeAddress: textValue(operator.address || operator.officeAddress || operator.physicalAddress),
          email: textValue(operator.email || operator.emailAddress),
          phone: textValue(operator.phone || operator.phoneNumber),
          directorTitle: textValue(owner.title || "Mr"),
          directorName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
          directorPhone: textValue(owner.phone),
          directorWhatsApp: textValue(operator.whatsappNumber || operator.whatsapp_number),
          directorNin: textValue(owner.nin),
          description: textValue(operator.description || operator.bio),
          nahconLicense: textValue(operator.nahconId || operator.nahconLicense || operator.nahcon_id),
          capacity: textValue(operator.capacity || operator.operatorCapacity),
          transportReg: textValue(operator.transportReg || operator.transport_reg),
          fleetSize: textValue(operator.fleetSize || operator.fleet_size),
          telecomPermit: textValue(operator.telecomPermit || operator.telecom_permit),
          supportedNetworks: textValue(operator.supportedNetworks || operator.supported_networks),
          guideLanguages: textValue(operator.guideLanguages || operator.guide_languages),
          guideExperience: textValue(operator.guideExperience || operator.guide_experience),
          guideExpertise: Array.isArray(operator.guideExpertise || operator.guide_expertise) ? (operator.guideExpertise || operator.guide_expertise).join(", ") : textValue(operator.guideExpertise || operator.guide_expertise),
        })
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load partner."))
      .finally(() => setLoading(false))
  }, [operatorId])

  const updateField = (field: keyof PartnerFormState, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const inputClass = "mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-white px-3 text-sm text-[#17201c] outline-none transition focus:border-[#07845f]"
  const labelClass = "block text-sm font-bold text-[#32443d]"

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (!form.companyName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Company name, email, and phone are required.")
      return
    }

    const payload: Record<string, unknown> = {
      ...form,
      foundedAt: form.foundedAt ? Number(form.foundedAt) : undefined,
      yearsOfExperience: form.foundedAt ? Math.max(0, new Date().getFullYear() - Number(form.foundedAt)) : undefined,
      guideExpertise: form.guideExpertise.split(",").map((item) => item.trim()).filter(Boolean),
    }
    delete payload.officeAddress
    if (isEdit) {
      payload.address = form.officeAddress
      payload.nahconId = form.nahconLicense
      delete payload.nahconLicense
    }

    setSaving(true)
    try {
      const response = await fetch(isEdit ? `/api/admin/operator-auth/users/${operatorId}` : "/api/admin/operator-auth/onboard", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.message || `Unable to ${isEdit ? "update" : "add"} partner`)
      const savedId = operatorId || result?.operator?.id || result?.data?.id
      router.push(savedId ? `/dashboard/operators/${savedId}` : "/dashboard/operators")
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save partner.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <main className="p-5 sm:p-8"><div className="flex items-center justify-center gap-3 rounded-xl border border-[#dbe2de] bg-white p-10 text-sm text-[#68716d]"><Loader2 className="size-5 animate-spin text-[#07845f]" /> Loading partner information…</div></main>
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <Link href={isEdit ? `/dashboard/operators/${operatorId}` : "/dashboard/operators"} className="mt-1 inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]"><ArrowLeft className="size-4" /></Link>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Partner management</p><h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">{isEdit ? "Edit partner" : "Add partner"}</h1><p className="mt-2 text-sm text-[#68716d]">{isEdit ? "Update the partner profile and owner contact details." : "Create the business profile and send the owner a secure password-setup link."}</p></div>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-6">
        {error && <div className="rounded-lg border border-[#f4d0ca] bg-[#fff0ee] px-4 py-3 text-sm text-[#a43229]">{error}</div>}
        <section className="rounded-xl border border-[#dbe2de] bg-white p-5 sm:p-6"><h2 className="font-brand text-xl font-bold text-[#17201c]">Business profile</h2><div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Partner type<select value={form.partnerType} onChange={(event) => updateField("partnerType", event.target.value)} className={inputClass}>{partnerTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className={labelClass}>Country<input value={form.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass} required /></label>
          <label className={labelClass}>Company name<input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} className={inputClass} required /></label>
          <label className={labelClass}>Trading name<input value={form.tradingName} onChange={(event) => updateField("tradingName", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>CAC / registration number<input value={form.cacNumber} onChange={(event) => updateField("cacNumber", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Year established<input type="number" min="1900" max={new Date().getFullYear()} value={form.foundedAt} onChange={(event) => updateField("foundedAt", event.target.value)} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Office address<input value={form.officeAddress} onChange={(event) => updateField("officeAddress", event.target.value)} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Business description<textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className="mt-1.5 min-h-28 w-full rounded-lg border border-[#d3dad7] bg-white p-3 text-sm text-[#17201c] outline-none transition focus:border-[#07845f]" /></label>
        </div></section>

        <section className="rounded-xl border border-[#dbe2de] bg-white p-5 sm:p-6"><h2 className="font-brand text-xl font-bold text-[#17201c]">Account and primary contact</h2><div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={labelClass}>Account email<input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass} required /></label>
          <label className={labelClass}>Account phone<input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClass} required /></label>
          <label className={labelClass}>Director title<select value={form.directorTitle} onChange={(event) => updateField("directorTitle", event.target.value)} className={inputClass}><option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option></select></label>
          <label className={labelClass}>Director name<input value={form.directorName} onChange={(event) => updateField("directorName", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Director phone<input type="tel" value={form.directorPhone} onChange={(event) => updateField("directorPhone", event.target.value)} className={inputClass} /></label>
          <label className={labelClass}>Director WhatsApp<input type="tel" value={form.directorWhatsApp} onChange={(event) => updateField("directorWhatsApp", event.target.value)} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Director NIN<input value={form.directorNin} onChange={(event) => updateField("directorNin", event.target.value)} className={inputClass} /></label>
        </div></section>

        <section className="rounded-xl border border-[#dbe2de] bg-white p-5 sm:p-6"><h2 className="font-brand text-xl font-bold text-[#17201c]">Partner-specific details</h2><div className="mt-5 grid gap-4 md:grid-cols-2">
          {form.partnerType === "tour-operator" && <><label className={labelClass}>NAHCON licence<input value={form.nahconLicense} onChange={(event) => updateField("nahconLicense", event.target.value)} className={inputClass} /></label><label className={labelClass}>Capacity<input value={form.capacity} onChange={(event) => updateField("capacity", event.target.value)} className={inputClass} /></label></>}
          {form.partnerType === "transport" && <><label className={labelClass}>Transport registration<input value={form.transportReg} onChange={(event) => updateField("transportReg", event.target.value)} className={inputClass} /></label><label className={labelClass}>Fleet size<input value={form.fleetSize} onChange={(event) => updateField("fleetSize", event.target.value)} className={inputClass} /></label></>}
          {form.partnerType === "sim-seller" && <><label className={labelClass}>Telecom permit<input value={form.telecomPermit} onChange={(event) => updateField("telecomPermit", event.target.value)} className={inputClass} /></label><label className={labelClass}>Supported networks<input value={form.supportedNetworks} onChange={(event) => updateField("supportedNetworks", event.target.value)} className={inputClass} /></label></>}
          {form.partnerType === "tour-guide" && <><label className={labelClass}>Languages<input value={form.guideLanguages} onChange={(event) => updateField("guideLanguages", event.target.value)} className={inputClass} /></label><label className={labelClass}>Experience<input value={form.guideExperience} onChange={(event) => updateField("guideExperience", event.target.value)} className={inputClass} /></label><label className={`${labelClass} md:col-span-2`}>Expertise<input value={form.guideExpertise} onChange={(event) => updateField("guideExpertise", event.target.value)} placeholder="Separate areas with commas" className={inputClass} /></label></>}
          {form.partnerType === "exchange-agent" && <p className="text-sm text-[#68716d] md:col-span-2">No additional profile fields are required for FX agents. Compliance documents are managed from the partner dossier.</p>}
        </div></section>

        <div className="flex flex-wrap justify-end gap-3"><Link href={isEdit ? `/dashboard/operators/${operatorId}` : "/dashboard/operators"} className="rounded-lg border border-[#cbd5d0] bg-white px-4 py-2.5 text-sm font-bold text-[#32443d] hover:bg-[#edf3f0]">Cancel</Link><button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#07845f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="size-4 animate-spin" /> : isEdit ? <Save className="size-4" /> : <UserPlus className="size-4" />}{saving ? "Saving…" : isEdit ? "Save changes" : "Create partner"}</button></div>
      </form>
    </main>
  )
}