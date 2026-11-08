"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Phone, PhoneOff } from "lucide-react"

interface ActiveCallItem {
  callId: string
  userId: string
  pilgrimName: string
  pilgrimPhone?: string | null
  reason?: string
  direction: "ADMIN_TO_PILGRIM" | "PILGRIM_TO_ADMIN"
  status: "RINGING" | "ACCEPTED" | "DECLINED" | "ENDED" | "MISSED"
}

export function AdminIncomingCallBanner() {
  const pathname = usePathname()
  const router = useRouter()
  const [inboundCall, setInboundCall] = useState<ActiveCallItem | null>(null)

  useEffect(() => {
    let active = true
    const checkQueue = async () => {
      try {
        const res = await fetch("/api/admin/customers/calls/queue", {
          cache: "no-store",
        })
        const payload = await res.json().catch(() => null)
        const list: ActiveCallItem[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        if (!active) return

        const ringingInbound = list.find(
          (item) =>
            item.direction === "PILGRIM_TO_ADMIN" && item.status === "RINGING",
        )
        setInboundCall(ringingInbound || null)
      } catch {
        // ignore transient polling errors
      }
    }

    void checkQueue()
    const timer = window.setInterval(checkQueue, 3500)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  if (!inboundCall) return null
  if (pathname?.startsWith(`/dashboard/calls/${inboundCall.callId}`)) {
    return null
  }

  const handleAnswer = () => {
    router.push(`/dashboard/calls/${encodeURIComponent(inboundCall.callId)}`)
  }

  const handleDecline = async () => {
    const id = inboundCall.callId
    setInboundCall(null)
    await fetch(`/api/admin/customers/call/${encodeURIComponent(id)}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    }).catch(() => undefined)
  }

  return (
    <div className="sticky top-[72px] z-40 flex flex-wrap items-center justify-between gap-4 border-b border-[#0f5338] bg-[#063722] px-6 py-3 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <span className="grid size-9 animate-bounce place-items-center rounded-full bg-[#10b981] text-white">
          <Phone className="size-4" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#fde68a]">
            Incoming Pilgrim Concierge Call
          </p>
          <p className="text-sm font-semibold text-white">
            {inboundCall.pilgrimName}{" "}
            {inboundCall.reason ? `· ${inboundCall.reason}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleAnswer}
          className="inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#059669]"
        >
          <Phone className="size-3.5" /> Answer &amp; Open Record Sheet
        </button>
        <button
          type="button"
          onClick={() => void handleDecline()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#ef4444] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#dc2626]"
        >
          <PhoneOff className="size-3.5" /> Decline
        </button>
      </div>
    </div>
  )
}
