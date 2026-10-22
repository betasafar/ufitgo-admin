"use client"

import { useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, RefreshCw, Search, Users } from "lucide-react"
import { useCan } from "@/components/auth/permission-gate"
import { AppSelect } from "@/components/ui/app-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginationBar } from "@/components/ui/pagination-bar"

interface WaitlistEntry {
  id: string
  email: string
  source: string
  active: boolean
  notifiedAt: string | null
  createdAt: string
}

interface WaitlistResult {
  entries: WaitlistEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const PAGE_SIZE = 20

async function fetchWaitlist(page: number, search: string, status: string, signal: AbortSignal): Promise<WaitlistResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), status })
  if (search) params.set("search", search)
  const response = await fetch(`/api/admin/app-launch-waitlist?${params}`, { cache: "no-store", signal })
  if (!response.ok) throw new Error(`Unable to load the app waitlist (${response.status}). Please try again or contact your administrator.`)
  return response.json()
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

export default function AppWaitlistPage() {
  const can = useCan()
  const allowed = can(["marketing.manage"])
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const query = useQuery({
    queryKey: ["app-launch-waitlist", page, search, status],
    queryFn: ({ signal }) => fetchWaitlist(page, search, status, signal),
    enabled: allowed,
  })

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  if (!allowed) return <p role="alert" className="text-sm text-[#a43229]">You do not have permission to view the app waitlist.</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#07845f] to-[#0c6b7e] p-6 text-white shadow-lg sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><Users className="size-6 text-[#ffcf4d]" /><h2 className="font-brand text-xl font-bold">App launch waitlist</h2></div>
          <p className="mt-1 text-sm text-white/80">People who signed up on the website for UfitGo app-launch updates.</p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching} className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input aria-label="Search waitlist by email" type="search" maxLength={254} placeholder="Search by email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <Button type="submit" className="bg-[#07845f] text-white hover:bg-[#0c6b50]"><Search className="size-4" /> Search</Button>
        </form>
        <div className="flex items-center gap-2 sm:w-64">
          <span className="text-sm text-[#68716d]">Status</span>
          <AppSelect
            value={status}
            onValueChange={(value) => { setStatus(value); setPage(1) }}
            options={[{ value: "all", label: "All subscribers" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
          />
        </div>
      </div>

      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>Retry</Button>
        </div>
      )}

      {query.isPending ? (
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-[#68716d]"><Loader2 className="size-5 animate-spin" /> Loading waitlist...</div>
      ) : !query.isError && query.data && (
        <div className="overflow-hidden rounded-xl border border-[#d9dfdc] bg-white shadow-sm">
          <div className="border-b border-[#edf1ef] px-5 py-4">
            <h3 className="text-sm font-bold text-[#36413d]">{query.data.total.toLocaleString()} {search || status !== "all" ? "matching " : ""}{query.data.total === 1 ? "subscriber" : "subscribers"}</h3>
            <p className="mt-1 text-xs text-[#68716d]">Newest signups first. Viewing this list does not send emails.</p>
          </div>
          {query.data.entries.length === 0 ? (
            <p role="status" className="px-5 py-12 text-center text-sm text-[#68716d]">{search || status !== "all" ? "No subscribers match your filters." : "No app-launch signups yet."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7faf9] text-xs text-[#68716d]">
                  <tr>{["Email", "Source", "Status", "Signed up", "Last notified"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-3 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ef]">
                  {query.data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-5 py-4 font-medium text-[#36413d]">{entry.email}</td>
                      <td className="px-5 py-4 text-[#68716d]">{entry.source}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.active ? "bg-[#eaf9f3] text-[#0c6b50]" : "bg-[#f1f3f2] text-[#68716d]"}`}>{entry.active ? "Active" : "Inactive"}</span></td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{formatDate(entry.createdAt)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#68716d]">{entry.notifiedAt ? formatDate(entry.notifiedAt) : "Not yet notified"}</td>
                    </tr>
                  ))}
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
