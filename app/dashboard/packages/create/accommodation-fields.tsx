"use client";

export type Accommodation = {
  city: string;
  status: "confirmed" | "unconfirmed";
  hotelName?: string;
  expectedStandard?: string;
  nights?: string;
  roomSharing?: string;
  substitution?: string;
};

export function AccommodationFields({ value, onChange }: { value: Accommodation[]; onChange: (value: Accommodation[]) => void }) {
  const update = (index: number, patch: Partial<Accommodation>) => onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  const cls = "w-full rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 text-sm";
  return <div className="mt-4 space-y-3">
    <p className="text-sm text-[#68716d]">Optional structured hotels; mark uncertain arrangements unconfirmed.</p>
    {value.map((item, index) => <div key={index} className="space-y-2 rounded-xl border border-[#dbe2de] p-3">
      <input aria-label="City" placeholder="City" className={cls} value={item.city} onChange={(e) => update(index, { city: e.target.value })} />
      <select aria-label="Hotel status" className={cls} value={item.status} onChange={(e) => update(index, { status: e.target.value === "confirmed" ? "confirmed" : "unconfirmed" })}>
        <option value="unconfirmed">Hotel not confirmed</option><option value="confirmed">Hotel confirmed</option>
      </select>
      <input aria-label="Hotel name" placeholder="Hotel name" className={cls} value={item.hotelName || ""} onChange={(e) => update(index, { hotelName: e.target.value })} />
      <input aria-label="Expected hotel standard" placeholder="Expected standard, e.g. 4–5-star (not confirmed)" maxLength={100} className={cls} value={item.expectedStandard || ""} onChange={(e) => update(index, { expectedStandard: e.target.value })} />
      <input aria-label="Number of nights" placeholder="Nights (optional)" type="number" min={1} max={365} className={cls} value={item.nights || ""} onChange={(e) => update(index, { nights: e.target.value })} />
      <input aria-label="Room sharing" placeholder="Room sharing (optional)" className={cls} value={item.roomSharing || ""} onChange={(e) => update(index, { roomSharing: e.target.value })} />
      <input aria-label="Substitution terms" placeholder="Substitution terms (optional)" className={cls} value={item.substitution || ""} onChange={(e) => update(index, { substitution: e.target.value })} />
      <button type="button" className="text-sm text-red-600" onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove hotel</button>
    </div>)}
    <button type="button" disabled={value.length >= 10} onClick={() => onChange([...value, { city: "", status: "unconfirmed" }])} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Add hotel</button>
  </div>;
}
