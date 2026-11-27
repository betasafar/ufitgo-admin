"use client";

import { useEffect, useState } from "react";

type Template = { description: string; itinerary: string; registrationFeeBasis?: "per_booking" | "per_traveller"; installmentSplit?: 30 | 50 | 60 | 70; agePricingRule?: { adultAge: number; infantAge: number; childDiscountPercent: number | null; infantDiscountPercent: number | null } | null };
type Templates = { standard: Template; premium: Template };
const emptyTemplates: Templates = {
  standard: { description: "This Standard package is offered by the operator. Review the departure dates, accommodation, child and infant policy, inclusions and terms before booking. Expected details are not yet confirmed.", itinerary: "The itinerary is to be confirmed by the operator." },
  premium: { description: "This Premium package is offered by the operator. Review the departure dates, accommodation, child and infant policy, inclusions and terms before booking. Expected details are not yet confirmed.", itinerary: "The itinerary is to be confirmed by the operator." },
};

export function PackageTemplates({ onApply }: {
  onApply: (template: Template, level: "standard" | "premium") => void;
}) {
  const [templates, setTemplates] = useState<Templates>(emptyTemplates);
  const [saved, setSaved] = useState<Templates>(emptyTemplates);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/platform-settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load templates.");
        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : payload;
        if (!Array.isArray(list)) throw new Error("Invalid settings response.");
        const value = list.find((setting) => setting.key === "PACKAGE_TEMPLATES_V1")?.value ?? emptyTemplates;
        if (!value?.standard || !value?.premium ||
          typeof value.standard.description !== "string" || typeof value.standard.itinerary !== "string" ||
          typeof value.premium.description !== "string" || typeof value.premium.itinerary !== "string") {
          throw new Error("Invalid template configuration.");
        }
        if (active) { setTemplates(value); setSaved(value); setLoaded(true); }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load templates.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/platform-settings/PACKAGE_TEMPLATES_V1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: templates, description: "Reusable package description and itinerary templates" }),
      });
      if (!response.ok) throw new Error("Unable to save templates.");
      setSaved(templates);
      setMessage("Templates saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save templates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-sm">
      <h2 className="font-brand text-lg font-bold text-[#17201c]">Package templates</h2>
      <p className="mt-1 text-sm text-[#68716d]">Maintain reusable wording for Standard and Premium. Do not include unconfirmed trip-specific facts. Applying a template requires review and does not publish a package.</p>
      <p className="mt-1 text-sm text-[#68716d]">Enter tentative departure ranges and expected hotel standards in the package fields, not as confirmed facts. Child-specific checkout discounts are not yet supported; do not promise a discount in template wording.</p>
      <p className="mt-1 text-sm text-[#68716d]">Payment defaults are optional and never set a price or registration fee amount. Choose &quot;Leave unchanged&quot; to keep the current setting.</p>
      {message && <p role="status" className="mt-3 text-sm text-[#52605a]">{message}</p>}
      {loaded && (["standard", "premium"] as const).map((level) => (
        <div key={level} className="mt-5 space-y-3 rounded-xl border border-[#dbe2de] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold capitalize">{level}</h3>
            <button type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={!saved[level].description && !saved[level].itinerary} onClick={() => onApply(saved[level], level)}>
              Apply saved template
            </button>
          </div>
          {(["description", "itinerary"] as const).map((field) => (
            <label key={field} className="block text-sm font-semibold capitalize text-[#52605a]">
              {field}
              <textarea value={templates[level][field]} maxLength={5000} rows={3}
                onChange={(event) => setTemplates((current) => ({ ...current, [level]: { ...current[level], [field]: event.target.value } }))}
                className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal" />
            </label>
          ))}
          <label className="block text-sm font-semibold text-[#52605a]">Registration fee basis
            <select value={templates[level].registrationFeeBasis ?? ""} onChange={(event) => {
              const value = event.target.value;
              setTemplates((current) => {
                const template = { ...current[level] };
                if (value === "per_booking" || value === "per_traveller") template.registrationFeeBasis = value;
                else delete template.registrationFeeBasis;
                return { ...current, [level]: template };
              });
            }} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal">
              <option value="">Leave unchanged</option><option value="per_traveller">Per traveller</option><option value="per_booking">Once per booking</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-[#52605a]">Initial installment percentage
            <select value={templates[level].installmentSplit ?? ""} onChange={(event) => {
              const value = Number(event.target.value);
              setTemplates((current) => {
                const template = { ...current[level] };
                if (value === 30 || value === 50 || value === 60 || value === 70) template.installmentSplit = value;
                else delete template.installmentSplit;
                return { ...current, [level]: template };
              });
            }} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal">
              <option value="">Leave unchanged</option><option value="30">30 / 70</option><option value="50">50 / 50</option><option value="60">60 / 40</option><option value="70">70 / 30</option>
            </select>
          </label>
          {process.env.NEXT_PUBLIC_ENABLE_AGE_PRICING === "true" && <div className="space-y-2 text-sm text-[#52605a]">
            <label className="block font-semibold">Age discount default
              <select value={templates[level].agePricingRule === undefined ? "unchanged" : templates[level].agePricingRule === null ? "off" : "on"}
                onChange={(event) => setTemplates(current => {
                  const template = { ...current[level] };
                  if (event.target.value === "unchanged") delete template.agePricingRule;
                  else template.agePricingRule = event.target.value === "off" ? null : { adultAge: 12, infantAge: 2, childDiscountPercent: 0, infantDiscountPercent: null };
                  return { ...current, [level]: template };
                })} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal">
                <option value="unchanged">Leave unchanged</option><option value="off">Discounts off</option><option value="on">Configure discount</option>
              </select>
            </label>
            {templates[level].agePricingRule && <div className="grid gap-3 sm:grid-cols-2">
              {(["adultAge", "infantAge"] as const).map(key => <label key={key} className="font-semibold">{key === "adultAge" ? "Adult age starts at" : "Infant age ends before"}
                <input type="number" value={templates[level].agePricingRule?.[key] ?? ""} onChange={(event) => setTemplates(current => {
                  const rule = current[level].agePricingRule;
                  return rule ? { ...current, [level]: { ...current[level], agePricingRule: { ...rule, [key]: Number(event.target.value) } } } : current;
                })} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] px-3 py-2" />
              </label>)}
              {(["childDiscountPercent", "infantDiscountPercent"] as const).map(key => <div key={key}>
                <label className="flex items-center gap-2"><input type="checkbox" checked={templates[level].agePricingRule?.[key] != null} onChange={event => setTemplates(current => {
                  const rule = current[level].agePricingRule;
                  return rule ? { ...current, [level]: { ...current[level], agePricingRule: { ...rule, [key]: event.target.checked ? 0 : null } } } : current;
                })} /> {key === "childDiscountPercent" ? "Child" : "Infant"} discount</label>
                {templates[level].agePricingRule?.[key] != null && <input aria-label={`${key === "childDiscountPercent" ? "Child" : "Infant"} discount percentage`} type="number" min={0} max={100}
                  value={templates[level].agePricingRule?.[key] ?? ""} onChange={event => setTemplates(current => {
                    const rule = current[level].agePricingRule;
                    return rule ? { ...current, [level]: { ...current[level], agePricingRule: { ...rule, [key]: Number(event.target.value) } } } : current;
                  })} className="mt-1.5 w-full rounded-lg border border-[#d3dad7] px-3 py-2" />}
              </div>)}
            </div>}
          </div>}
        </div>
      ))}
      <button type="button" onClick={save} disabled={loading || !loaded || saving} className="mt-4 rounded-lg bg-[#0d7d5f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save templates"}
      </button>
    </section>
  );
}
