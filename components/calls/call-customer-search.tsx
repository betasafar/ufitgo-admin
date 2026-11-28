"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"

type Customer = {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

type SearchResult = { customers: Customer[]; totalPages: number }

export async function searchCallCustomers(search: string, page: number, signal: AbortSignal): Promise<SearchResult> {
  const query = new URLSearchParams({ search, page: String(page), limit: "10" })
  const response = await fetch(`/api/admin/customers?${query}`, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Customer search failed (${response.status}).`)
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== "object") throw new Error("Customer search returned an invalid response.")
  const record = payload as { users?: unknown; data?: unknown; totalPages?: unknown }
  const list = Array.isArray(record.users) ? record.users : Array.isArray(record.data) ? record.data : Array.isArray(payload) ? payload : null
  if (!list) throw new Error("Customer search returned an invalid list.")
  const customers = list.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Customer search returned an invalid customer.")
    const raw = item as Record<string, unknown>
    const id = raw.id ?? raw.userId ?? raw.customerId
    if ((typeof id !== "string" && typeof id !== "number") || !String(id)) throw new Error("Customer search returned a customer without an ID.")
    const text = (value: unknown) => typeof value === "string" ? value : undefined
    return {
      id: String(id),
      firstName: text(raw.firstName ?? raw.first_name),
      lastName: text(raw.lastName ?? raw.last_name),
      email: text(raw.email ?? raw.emailAddress),
      phone: text(raw.phone ?? raw.phoneNumber ?? raw.mobile ?? raw.phone_number),
    }
  })
  const totalPages = Number(record.totalPages ?? 1)
  if (!Number.isFinite(totalPages) || totalPages < 0) throw new Error("Customer search returned invalid pagination.")
  return { customers, totalPages }
}

export function CallCustomerSearch({ disabled, onSelect }: { disabled: boolean; onSelect: (id: string) => void }) {
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const result = useQuery({
    queryKey: ["call-customer-search", search, page],
    queryFn: ({ signal }) => searchCallCustomers(search, page, signal),
    enabled: search.length >= 2,
  })

  return (
    <section className="rounded-xl border border-[#dbe2de] bg-white p-4" aria-label="Search customers to call">
      <h2 className="font-bold text-[#17201c]">Find a customer to call</h2>
      <form className="mt-3 flex gap-2" onSubmit={(event) => {
        event.preventDefault()
        setSearch(input.trim())
        setPage(1)
      }}>
        <label htmlFor="call-customer-search" className="sr-only">Customer name, email or phone</label>
        <input id="call-customer-search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Name, email or phone" className="min-w-0 flex-1 rounded-lg border border-[#cbd5d0] px-3 py-2 text-sm text-[#17201c]" />
        <button type="submit" disabled={input.trim().length < 2} className="inline-flex items-center gap-1 rounded-lg bg-[#07845f] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Search className="size-4" /> Search</button>
      </form>
      {disabled && <p className="mt-2 text-xs text-amber-800">Wait for the call desk to load, end any active call, and finish saving before switching customers.</p>}
      {result.isFetching && <p className="mt-3 text-xs">Searching…</p>}
      {result.isError && <p role="alert" className="mt-3 text-xs text-red-700">{result.error.message}</p>}
      {result.data && !result.isFetching && (
        <div className="mt-3 space-y-2">
          {result.data.customers.length === 0 && <p className="text-xs text-[#52605a]">No customers found.</p>}
          {result.data.customers.map((customer) => (
            <button type="button" key={customer.id} disabled={disabled} onClick={() => onSelect(customer.id)} className="block w-full rounded-lg border border-[#dbe2de] p-3 text-left text-sm hover:bg-[#edf3f0] disabled:opacity-50">
              <span className="block font-bold text-[#17201c]">{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.email || "Customer"}</span>
              <span className="block text-xs text-[#52605a]">{[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact details"}</span>
            </button>
          ))}
          {result.data.totalPages > 1 && <div className="flex items-center justify-between text-xs">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="underline disabled:opacity-40">Previous</button>
            <span>Page {page} of {result.data.totalPages}</span>
            <button type="button" disabled={page >= result.data.totalPages} onClick={() => setPage((value) => value + 1)} className="underline disabled:opacity-40">Next</button>
          </div>}
        </div>
      )}
    </section>
  )
}
