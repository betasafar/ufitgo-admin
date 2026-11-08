"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Headphones, Phone } from "lucide-react"

interface ConciergeCallWidgetProps {
  customerId: string
  customerName: string
  customerPhone?: string
  bookingId?: string | number
}

export function ConciergeCallWidget({
  customerId,
  bookingId,
}: ConciergeCallWidgetProps) {
  const router = useRouter()
  const [callsEnabled, setCallsEnabled] = useState(true)

  useEffect(() => {
    let active = true
    fetch("/api/admin/customers/system/config", { cache: "no-store" })
      .then((res) => res.json().catch(() => null))
      .then((payload) => {
        if (!active) return
        const cfg = payload?.data ?? payload
        setCallsEnabled(cfg?.features?.enableConciergeCalls !== false)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  if (!callsEnabled) {
    return null
  }

  const openCallDeskWorkspace = () => {
    const qs = bookingId ? `?bookingId=${encodeURIComponent(String(bookingId))}` : ""
    router.push(`/dashboard/calls/${encodeURIComponent(customerId)}${qs}`)
  }

  return (
    <button
      type="button"
      onClick={openCallDeskWorkspace}
      className="inline-flex items-center gap-2 rounded-lg bg-[#07845f] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#066c4e]"
    >
      <Headphones className="size-4" />
      <span>Open Concierge Call Desk</span>
      <Phone className="size-3.5 opacity-80" />
    </button>
  )
}

