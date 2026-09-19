"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Laptop, LoaderCircle, LogOut, MonitorSmartphone, ShieldCheck, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listAdminSessions, logoutAllSessions, logoutCurrentSession, revokeAdminSession } from "@/lib/auth/session-client"
import type { AdminSession } from "@/lib/auth/types"

function deviceDetails(userAgent: string) {
  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : /Firefox\//.test(userAgent) ? "Firefox" : "Browser"
  const platform = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Macintosh/.test(userAgent) ? "macOS" : /Windows/.test(userAgent) ? "Windows" : "Unknown OS"
  return { mobile, label: `${browser} on ${platform}` }
}

export function SessionsPanel() {
  const router = useRouter()
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    listAdminSessions()
      .then(setSessions)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load sessions."))
      .finally(() => setLoading(false))
  }, [])

  async function revoke(session: AdminSession) {
    setBusyId(session.id)
    setError("")
    try {
      if (session.current) {
        await logoutCurrentSession()
        router.replace("/login")
        router.refresh()
        return
      }
      await revokeAdminSession(session.id)
      setSessions((current) => current.filter((item) => item.id !== session.id))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to revoke session.")
    } finally {
      setBusyId(null)
    }
  }

  async function logoutAll() {
    setBusyId("all")
    try {
      await logoutAllSessions()
      router.replace("/login")
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign out all devices.")
      setBusyId(null)
    }
  }

  if (loading) return <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="size-6 animate-spin text-[#07845f]" /></div>

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-brand text-2xl font-bold text-[#17201c]">Active sessions</h2>
          <p className="mt-1 text-sm text-[#68716d]">Review devices signed into your administrator account.</p>
        </div>
        <Button variant="outline" onClick={logoutAll} disabled={busyId !== null} className="h-10 rounded-lg border-[#e2aaa5] px-4 text-[#a43229] hover:bg-[#fff3f1]">
          <LogOut className="size-4" /> Sign out all devices
        </Button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]">{error}</p>}
      <div className="space-y-3">
        {sessions.map((session) => {
          const device = deviceDetails(session.userAgent)
          const Icon = device.mobile ? Smartphone : Laptop
          return (
            <article key={session.id} className="flex flex-col gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 sm:flex-row sm:items-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#edf6f2] text-[#07845f]"><Icon className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-[#17201c]">{device.label}</h3>
                  {session.current && <span className="inline-flex items-center gap-1 rounded-full bg-[#dff7ee] px-2 py-0.5 text-xs font-bold text-[#067554]"><ShieldCheck className="size-3" /> Current</span>}
                </div>
                <p className="mt-1 text-xs text-[#78817d]">IP {session.ipAddress} · Last active {new Date(session.lastUsedAt).toLocaleString()}</p>
                <p className="mt-1 truncate text-xs text-[#a0a7a3]" title={session.userAgent}>{session.userAgent}</p>
              </div>
              <Button variant="outline" onClick={() => void revoke(session)} disabled={busyId !== null} className="h-9 rounded-lg px-4">
                {busyId === session.id ? <LoaderCircle className="size-4 animate-spin" /> : <MonitorSmartphone className="size-4" />}
                {session.current ? "Sign out" : "Revoke"}
              </Button>
            </article>
          )
        })}
        {!sessions.length && <p className="rounded-xl border border-dashed border-[#cdd6d1] py-10 text-center text-sm text-[#78817d]">No active sessions found.</p>}
      </div>
    </div>
  )
}
