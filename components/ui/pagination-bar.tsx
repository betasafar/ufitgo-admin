"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

export function PaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  isFetching,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  isFetching?: boolean
}) {
  if (total === 0) return null

  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-col gap-3 border-t border-[#edf1ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#7b8580]">
        Showing <span className="font-bold text-[#36413d]">{start}-{end}</span> of <span className="font-bold text-[#36413d]">{total}</span>
        {isFetching && <span className="ml-2 text-[#0d7d5f]">Updating…</span>}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#36413d] hover:bg-[#f7f9f8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" /> Previous
        </button>
        <span className="text-xs font-bold text-[#68716d]">Page {page} of {Math.max(totalPages, 1)}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#36413d] hover:bg-[#f7f9f8] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
