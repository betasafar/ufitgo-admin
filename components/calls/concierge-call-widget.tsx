"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Phone } from "lucide-react"

interface ConciergeCallWidgetProps {
  customerId: string
  customerName: string
  customerPhone?: string
  bookingId?: string | number
}

export function ConciergeCallWidget({
  customerId,
  customerName,
  bookingId,
}: ConciergeCallWidgetProps) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
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

  const startAndOpenCallDesk = async () => {
    setStarting(true)
    try {
      const res = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}/call/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callerName: "UfitGo Pilgrim Concierge",
            reason: bookingId
              ? `Concierge support call · Booking #${bookingId}`
              : `Concierge support call for ${customerName}`,
            bookingId,
          }),
        },
      )
      const payload = await res.json().catch(() => null)
      const callData = payload?.data ?? payload
      if (!res.ok || !callData?.callId) {
        throw new Error(
          payload?.details?.message ||
            payload?.message ||
            "Could not start concierge call",
        )
      }
      router.push(`/dashboard/calls/${encodeURIComponent(callData.callId)}`)
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not start concierge call.",
      )
    } finally {
      setStarting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void startAndOpenCallDesk()}
      disabled={starting}
      className="inline-flex items-center gap-2 rounded-lg bg-[#07845f] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#066c4e] disabled:opacity-60"
    >
      {starting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Phone className="size-4" />
      )}
      Call Pilgrim In-App
    </button>
  )
}

