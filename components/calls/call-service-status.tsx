"use client"

import { useCallback, useEffect, useState } from "react"

interface CallServiceStatusData {
  callsEnabled: boolean
  appIdConfigured: boolean
  providerBillingStatus: "unknown"
  periodStart: string
  periodEnd: string
  completedCallCount: number
  recordedDurationSeconds: number
}

export function CallServiceStatus() {
  const [status, setStatus] = useState<CallServiceStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/admin/customers/calls/service/status", { cache: "no-store", signal })
      if (!response.ok) throw new Error(`Status request failed (${response.status}).`)
      const payload: { data?: CallServiceStatusData } = await response.json()
      if (!payload.data) throw new Error("Status response was incomplete.")
      setStatus(payload.data)
    } catch (err) {
      if (signal?.aborted) return
      setStatus(null)
      setError(err instanceof Error ? err.message : "Could not load call service status.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  return <CallServiceStatusView status={status} error={error} loading={loading} onRefresh={() => void refresh()} />
}

export function CallServiceStatusView({ status, error, loading, onRefresh }: {
  status: CallServiceStatusData | null
  error: string
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <section className="rounded-xl border border-[#dbe2de] bg-white p-4 text-sm text-[#35443e]" aria-label="Agora call service status">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#17201c]">Agora call service</h2>
        <button type="button" onClick={onRefresh} disabled={loading} className="text-xs font-bold text-[#07845f] underline disabled:opacity-50">Refresh</button>
      </div>
      {loading && <p className="mt-2 text-xs">Loading status…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">Could not check call status: {error}</p>}
      {!loading && status && (
        <div className="mt-2 space-y-2 text-xs leading-5">
          <p>New calls: <strong>{status.callsEnabled ? "Enabled" : "Off — new calls blocked"}</strong></p>
          <p>Agora App ID: <strong>{status.appIdConfigured ? "Configured" : "Not configured — new calls blocked"}</strong></p>
          <p className="font-semibold text-amber-800">Agora balance and service availability: unknown. Configuration does not confirm the service is working.</p>
          <p>
            Calls ended this UTC month: <strong>{status.completedCallCount}</strong>; recorded call duration:{" "}
            <strong>{(status.recordedDurationSeconds / 60).toFixed(1)} minutes</strong>.
            This excludes ongoing calls and is not Agora billable participant minutes or remaining credit.
          </p>
          <p>
            Check billing and usage in{" "}
            <a href="https://console.agora.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#07845f] underline">Agora Console</a>.
            A Super Admin can turn off new calls in Settings if service is unavailable.
          </p>
        </div>
      )}
    </section>
  )
}
