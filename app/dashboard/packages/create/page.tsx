"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Building2, Loader2, PackagePlus } from "lucide-react"
import { AppSelect } from "@/components/ui/app-select"

const paymentPlans = [
  { value: "FULL_PAYMENT", label: "Full payment only" },
  { value: "REGISTRATION_AND_FULL_PAYMENT", label: "Registration fee + full payment" },
  { value: "INSTALLMENTS", label: "Initial payment + final balance" },
  { value: "REGISTRATION_AND_INSTALLMENTS", label: "Registration + initial + final" },
]

const splitOptions = [{ label: "50 / 50", value: 50 }, { label: "30 / 70", value: 30 }, { label: "60 / 40", value: 60 }]

export default function CreatePackagePage() {
  const params = useParams()
  const editId = String(params?.id ?? "")
  const isEdit = Boolean(editId)
  const [operators, setOperators] = useState<any[]>([])
  const [operatorId, setOperatorId] = useState("")
  const [form, setForm] = useState({ title: "", description: "", type: "umrah", serviceLevel: "standard", price: "", capacity: "", departureDate: "", returnDate: "", paymentPlan: "FULL_PAYMENT", registrationFee: "", initialPayment: "", finalBalance: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/operator-auth/operators?limit=100", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json()
      const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
      setOperators(list.filter((operator: any) => operator.isActive !== false))
    }).catch(() => setError("Unable to load operators")).finally(() => setLoading(false))
    if (editId) {
      fetch(`/api/admin/operator-auth/packages/${editId}`, { cache: "no-store" }).then(async (response) => {
        const payload = await response.json()
        const pkg = payload?.data || payload
        const hasRegistration = Boolean(pkg?.registrationFeeEnabled && Number(pkg?.registrationFeeAmount || 0) > 0)
        const hasInstallments = Boolean(pkg?.installmentEligible)
        setOperatorId(String(pkg?.operator?.id || pkg?.operatorId || ""))
        setForm({
          title: pkg?.title || "", description: pkg?.description || "", type: pkg?.type || "umrah", serviceLevel: pkg?.serviceLevel || "standard",
          price: String(pkg?.price || ""), capacity: String(pkg?.capacity || ""), departureDate: pkg?.departureDate?.slice?.(0, 10) || "", returnDate: pkg?.returnDate?.slice?.(0, 10) || "",
          paymentPlan: hasRegistration && hasInstallments ? "REGISTRATION_AND_INSTALLMENTS" : hasRegistration ? "REGISTRATION_AND_FULL_PAYMENT" : hasInstallments ? "INSTALLMENTS" : "FULL_PAYMENT",
          registrationFee: hasRegistration ? String(pkg.registrationFeeAmount) : "", initialPayment: hasInstallments ? String(pkg.initialDeposit || "") : "", finalBalance: hasInstallments ? String(pkg.finalBalance || "") : "",
        })
      }).catch(() => setError("Unable to load package for editing"))
    }
  }, [editId])

  const usesRegistration = form.paymentPlan.startsWith("REGISTRATION")
  const usesInstallments = form.paymentPlan.endsWith("INSTALLMENTS")
  const packagePrice = Number(form.price || 0)
  const installmentTotal = Number(form.initialPayment || 0) + Number(form.finalBalance || 0)
  const installmentValid = !usesInstallments || installmentTotal === packagePrice
  const selectedOperator = useMemo(() => operators.find((operator) => String(operator.id) === operatorId), [operators, operatorId])

  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const applySplit = (initialPercent: number) => update("initialPayment", String(Math.round(packagePrice * initialPercent / 100)))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!operatorId || !form.title || !packagePrice || !form.capacity || !installmentValid) return
    setSaving(true)
    setError("")
    const body = new FormData()
    body.append("title", form.title)
    body.append("description", form.description)
    body.append("type", form.type)
    body.append("serviceLevel", form.serviceLevel)
    body.append("price", String(packagePrice))
    body.append("capacity", form.capacity)
    body.append("departureDate", form.departureDate)
    body.append("returnDate", form.returnDate)
    body.append("registrationFeeEnabled", String(usesRegistration))
    body.append("registrationFeeAmount", usesRegistration ? String(Number(form.registrationFee || 0)) : "0")
    body.append("installmentEligible", String(usesInstallments))
    body.append("initialDeposit", usesInstallments ? String(Number(form.initialPayment || 0)) : "0")
    body.append("finalBalance", usesInstallments ? String(Number(form.finalBalance || 0)) : "0")
    try {
      const response = isEdit
        ? await fetch(`/api/admin/operator-auth/packages/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(body.entries())) })
        : await fetch(`/api/admin/operator-auth/packages/for-operator/${operatorId}`, { method: "POST", body })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || "Unable to create package")
      window.location.assign("/dashboard/packages")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create package")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="grid min-h-[60vh] place-items-center p-8"><Loader2 className="size-8 animate-spin text-[#0d7d5f]" /></main>

  return <main className="space-y-6 p-5 sm:p-8"><Link href="/dashboard/packages" className="inline-flex items-center gap-2 text-sm font-bold text-[#0d7d5f]"><ArrowLeft className="size-4" /> Back to packages</Link><header><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Packages / {isEdit ? "Edit" : "Create"}</p><h1 className="mt-2 flex items-center gap-3 font-brand text-3xl font-bold text-[#17201c]"><PackagePlus className="size-7 text-[#0d7d5f]" /> {isEdit ? "Edit package" : "Create package"}</h1><p className="mt-2 text-sm text-[#68716d]">{isEdit ? "Update package details and payment configuration." : "Create package inventory for an approved operator and define exactly how customers can pay."}</p></header>
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]"><div className="space-y-6"><section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm"><h2 className="font-brand text-lg font-bold text-[#17201c]">Package details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Package title" value={form.title} onChange={(value) => update("title", value)} required /><label className="text-sm font-semibold text-[#52605a]">Operator<AppSelect value={operatorId} onValueChange={setOperatorId} options={[{ value: "", label: "Select operator" }, ...operators.map((operator) => ({ value: String(operator.id), label: operator.companyName || operator.tradingName || operator.email }))]} className="mt-1.5 w-full" /></label><Field label="Price per package (NGN)" type="number" value={form.price} onChange={(value) => update("price", value)} required /><Field label="Capacity" type="number" value={form.capacity} onChange={(value) => update("capacity", value)} required /><label className="text-sm font-semibold text-[#52605a]">Package type<select value={form.type} onChange={(event) => update("type", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal"><option value="umrah">Umrah</option><option value="hajj">Hajj</option><option value="tour">Tour</option></select></label><Field label="Service level" value={form.serviceLevel} onChange={(value) => update("serviceLevel", value)} /><Field label="Departure date" type="date" value={form.departureDate} onChange={(value) => update("departureDate", value)} required /><Field label="Return date" type="date" value={form.returnDate} onChange={(value) => update("returnDate", value)} required /></div><label className="mt-4 block text-sm font-semibold text-[#52605a]">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={5} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm font-normal outline-none focus:border-[#0d7d5f]" /></label></section>
      <section className="rounded-2xl border border-[#cfeee0] bg-white p-6 shadow-sm"><h2 className="font-brand text-lg font-bold text-[#17201c]">Payment plan</h2><p className="mt-1 text-sm text-[#68716d]">Registration fees are separate from package cost.</p><label className="mt-5 block text-sm font-semibold text-[#52605a]">Allowed customer payment flow<AppSelect value={form.paymentPlan} onValueChange={(value) => update("paymentPlan", value)} options={paymentPlans} className="mt-1.5 w-full" /></label>{usesRegistration && <Field label="Registration fee (NGN)" type="number" value={form.registrationFee} onChange={(value) => update("registrationFee", value)} required />}{usesInstallments && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#17201c]">Suggested split</p><p className="mt-1 text-xs text-[#68716d]">Package cost: ₦{packagePrice.toLocaleString()}</p></div><div className="flex flex-wrap gap-2">{splitOptions.map((split) => <button key={split.value} type="button" onClick={() => applySplit(split.value)} className="rounded-lg border border-primary/25 bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10">{split.label}</button>)}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Initial payment (NGN)" type="number" value={form.initialPayment} onChange={(value) => update("initialPayment", value)} required /><Field label="Final balance (NGN)" type="number" value={form.finalBalance} onChange={(value) => update("finalBalance", value)} required /></div>{!installmentValid && <p className="mt-2 text-sm font-semibold text-[#a43229]">Initial payment + final balance must equal package cost.</p>}</div>}</section></div><aside className="h-fit rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><Building2 className="size-5 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">Publish package</h2></div><p className="mt-3 text-sm leading-6 text-[#68716d]">{selectedOperator ? `${selectedOperator.companyName || selectedOperator.tradingName} will own this package.` : "Select an operator before publishing."}</p>{error && <p className="mt-4 rounded-lg bg-[#fff0ee] p-3 text-sm font-semibold text-[#a43229]">{error}</p>}<button type="submit" disabled={saving || !operatorId || !installmentValid} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0d7d5f] px-4 text-sm font-bold text-white hover:bg-[#0b6b51] disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />} {saving ? "Creating..." : "Create package"}</button></aside></form>
  </main>
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="text-sm font-semibold text-[#52605a]">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-normal text-[#17201c] outline-none focus:border-[#0d7d5f]" /></label> }
