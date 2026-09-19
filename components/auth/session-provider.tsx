"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { SessionTimeoutDialog } from "@/components/auth/session-timeout-dialog"
import { logoutCurrentSession, refreshAccessToken, touchCurrentSession } from "@/lib/auth/session-client"

const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_MS = 2 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 60 * 1000
const REFRESH_INTERVAL_MS = 10 * 60 * 1000
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const

interface SessionContextValue {
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const lastActivity = useRef(Date.now())
  const lastHeartbeat = useRef(0)
  const lastRefresh = useRef(Date.now())
  const absoluteExpiry = useRef<number | null>(null)
  const logoutStarted = useRef(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(WARNING_MS / 1000))
  const [isContinuing, setIsContinuing] = useState(false)

  const finishLogout = useCallback(async () => {
    if (logoutStarted.current) return
    logoutStarted.current = true
    try { await logoutCurrentSession() } catch { /* cookies are cleared by the gateway whenever possible */ }
    router.replace("/login?reason=session-expired")
    router.refresh()
  }, [router])

  const continueSession = useCallback(async () => {
    setIsContinuing(true)
    try {
      const session = await touchCurrentSession()
      lastActivity.current = Date.now()
      lastHeartbeat.current = Date.now()
      absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
      setWarningOpen(false)
    } catch {
      await finishLogout()
    } finally {
      setIsContinuing(false)
    }
  }, [finishLogout])

  useEffect(() => {
    let disposed = false

    const registerActivity = () => {
      const now = Date.now()
      lastActivity.current = now
      setWarningOpen(false)
      if (now - lastHeartbeat.current >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat.current = now
        touchCurrentSession()
          .then((session) => { absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime() })
          .catch(() => finishLogout())
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, registerActivity, { passive: true }))
    touchCurrentSession()
      .then((session) => {
        if (!disposed) absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
      })
      .catch(() => finishLogout())

    const clock = window.setInterval(() => {
      const now = Date.now()
      if (absoluteExpiry.current && now >= absoluteExpiry.current) {
        void finishLogout()
        return
      }
      const remaining = IDLE_TIMEOUT_MS - (now - lastActivity.current)
      if (remaining <= 0) {
        void finishLogout()
      } else if (remaining <= WARNING_MS) {
        setSecondsRemaining(Math.max(0, Math.ceil(remaining / 1000)))
        setWarningOpen(true)
      }
    }, 1000)

    const refreshClock = window.setInterval(() => {
      refreshAccessToken()
        .then(({ session }) => {
          lastRefresh.current = Date.now()
          absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
        })
        .catch(() => finishLogout())
    }, REFRESH_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current >= REFRESH_INTERVAL_MS) {
        refreshAccessToken()
          .then(({ session }) => {
            lastRefresh.current = Date.now()
            absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
          })
          .catch(() => finishLogout())
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      disposed = true
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, registerActivity))
      document.removeEventListener("visibilitychange", handleVisibility)
      window.clearInterval(clock)
      window.clearInterval(refreshClock)
    }
  }, [finishLogout])

  return (
    <SessionContext.Provider value={{ logout: finishLogout }}>
      {children}
      <SessionTimeoutDialog
        open={warningOpen}
        secondsRemaining={secondsRemaining}
        isContinuing={isContinuing}
        onContinue={() => void continueSession()}
        onLogout={() => void finishLogout()}
      />
    </SessionContext.Provider>
  )
}

export function useAdminSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error("useAdminSession must be used within SessionProvider")
  return context
}
