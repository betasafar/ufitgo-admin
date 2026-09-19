"use client"

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" aria-busy="true" className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-[#dce5e1]" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-[#dce5e1]" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[#e5ebe8]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl border border-[#dce3df] bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-[#dce3df] bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-[#dce3df] bg-white" />
      </div>
    </div>
  )
}

export function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-[#efcbc7] bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-[#fff1ef] text-[#b2382f]"><AlertTriangle className="size-6" /></span>
      <h2 className="font-brand mt-5 text-2xl font-bold text-[#17201c]">Dashboard unavailable</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68716d]">{message}</p>
      <Button onClick={onRetry} className="mt-6 h-10 rounded-lg bg-[#07845f] px-5 text-white hover:bg-[#066c4e]"><RefreshCw className="size-4" /> Try again</Button>
    </section>
  )
}

export function DashboardEmpty({ message }: { message: string }) {
  return (
    <section className="rounded-xl border border-dashed border-[#cbd5d0] bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-[#edf3f0] text-[#60706a]"><Inbox className="size-6" /></span>
      <h2 className="font-brand mt-5 text-2xl font-bold text-[#17201c]">Nothing to report yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68716d]">{message}</p>
    </section>
  )
}
