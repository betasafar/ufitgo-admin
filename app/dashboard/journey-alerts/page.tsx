"use client"

import { useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { BellRing, Loader2, RefreshCw, Search, Users } from "lucide-react"
import { useCan } from "@/components/auth/permission-gate"
import { AppSelect } from "@/components/ui/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginationBar } from "@/components/ui/pagination-bar"

interface JourneyAlertEntry {
  id: string
  purpose: "HAJJ_OPENING" | "TARGET_SAVINGS"
  active: boolean
  notifiedAt: string | null
  createdAt: string
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
}

interface JourneyAlertResult {
  entries: JourneyAlertEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const PAGE_SIZE = 20

async function fetchJourneyAlerts(page: number, search: string, status: string, purpose: string, signal: AbortSignal): Promise<JourneyAlertResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status, purpose })
  if (search) params.set("search", search)
  const response = await fetch(`/api/admin/journey-alerts?${params}`, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Unable to load journey alerts (${response.status}). Please try again or contact your administrator.`)
  return response.json()
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

function purposeLabel(purpose: JourneyAlertEntry["purpose"]) {
  return purpose === "HAJJ_OPENING" ? "Hajj opening" : "Target Savings"
}

export default function JourneyAlertsPage() {
  const can = useCan()
  const allowed = can(["marketing.manage"])
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [purpose, setPurpose] = useState("all")
  const query = useQuery({
    queryKey: ["journey-alerts", page, search, status, purpose],
    queryFn: ({ signal }) => fetchJourneyAlerts(page, search, status, purpose, signal),
    enabled: allowed,
  })

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  if (!allowed) return <p role="alert" className="text-sm text-[#a43229]">You do not have permission to view journey alerts.</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#07845f] to-[#0c6b7e] p-6 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><BellRing className="size-6 text-[#ffcf4d]" /><h2 className="font-brand text-xl font-bold">Journey alerts</h2></div>
          <p className="mt-1 text-sm text-white/80">Customers waiting for Hajj package opening or Target Savings availability.</p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching} className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 lg:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input aria-label="Search alerts by customer name or email" type="search" maxLength={254} placeholder="Search name or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <Button type="submit" className="bg-[#07845f] text-white hover:bg-[#0c6b50]"><Search className="size-4" /> Search</Button>
        </form>
        <div className="flex items-center gap-2 sm:w-56">
          <span className="text-sm text-[#68716d]">Alert</span>
          <AppSelect value={purpose} onValueChange={(value) => { setPurpose(value); setPage(1) }} options={[{ value: "all", label: "All alerts" }, { value: "HAJJ_OPENING", label: "Hajj opening" }, { value: "TARGET_SAVINGS", label: "Target Savings" }]} />
        </div>
        <div className="flex items-center gap-2 sm:w-52">
          <span className="text-sm text-[#68716d]">Status</span>
          <AppSelect value={status} onValueChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: "all", label: "All subscribers" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
        </div>
      </div>

      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Retry</Button>
        </div>
      )}

      {query.isPending ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[#68716d]"><Loader2 className="size-5 animate-spin" /> Loading journey alerts...</div>
      ) : !query.isError && query.data && (
        <div className="overflow-hidden rounded-xl border border-[#d9dfdc] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] px-5 py-4">
            <h3 className="text-sm font-bold text-[#36413d]">{query.data.total.toLocaleString()} {query.data.total === 1 ? "subscription" : "subscriptions"}</h3>
            <p className="mt-1 text-xs text-[#68716d]">Newest activations first. Admin emails are delivered through Notification Service.</p>
          </div>
          {query.data.entries.length === 0 ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-[#68716d]">{search || status !== "all" || purpose !== "all" ? "No alert subscriptions match your filters." : "No journey alerts yet."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7faf9] text-xs text-[#68716d]">
                  <tr>{["Customer", "Alert", "Phone", "Status", "Activated", "Customer notified"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {query.data.entries.map((entry) => {
                    const customerName = [entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Unnamed customer"
                    return (
                      <tr key={entry.id}>
                        <td className="px-5 py-4"><p className="font-medium text-[#36413d]">{customerName}</p><p className="mt-0.5 text-xs text-[#68716d]">{entry.email}</p></td>
                        <td className="px-5 py-4 font-medium text-[#36413d]">{purposeLabel(entry.purpose)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{entry.phone || "—"}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.active ? "bg-[#eaf9f3] text-[#0c6b50]" : "bg-[#f1f3f2] text-[#68716d]"}`}>{entry.active ? "Active" : "Inactive"}</span></td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{formatDate(entry.createdAt)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{entry.notifiedAt ? formatDate(entry.notifiedAt) : "Not yet notified"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBar page={page} totalPages={query.data.totalPages} total={query.data.total} limit={PAGE_SIZE} onPageChange={setPage} isFetching={query.isFetching} />
        </div>
      )}
    </div>
  )
}
