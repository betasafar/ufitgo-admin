"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { SessionTimeoutDialog } from "@/components/auth/session-timeout-dialog"
import { logoutCurrentSession, refreshAccessToken, SessionRequestError, touchCurrentSession } from "@/lib/auth/session-client"
import type { AdminProfile } from "@/lib/auth/types"
import { hasAllPermissions, hasAnyPermission, type Permission } from "@/lib/rbac/permissions"

const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_MS = 2 * 60 * 1000
const HEARTBEAT_INTERVAL_MS = 60 * 1000
const REFRESH_INTERVAL_MS = 10 * 60 * 1000
const RETRY_INTERVAL_MS = 10 * 1000
const CALL_ACTIVITY_INTERVAL_MS = 30 * 1000
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const

interface SessionContextValue {
  admin: AdminProfile
  can: (permissions: readonly Permission[], mode?: "all" | "any") => boolean
  logout: () => Promise<void>
  setCallActive: (active: boolean) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children, initialAdmin }: { children: ReactNode; initialAdmin: AdminProfile }) {
  const router = useRouter()
  const lastActivity = useRef(Date.now())
  const lastHeartbeat = useRef(0)
  const lastRefresh = useRef(Date.now())
  const lastActivityBroadcast = useRef(0)
  const callActive = useRef(false)
  const touchPending = useRef(false)
  const refreshPending = useRef(false)
  const connectionProblems = useRef({ touch: false, refresh: false })
  const absoluteExpiry = useRef<number | null>(null)
  const logoutStarted = useRef(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(WARNING_MS / 1000))
  const [isContinuing, setIsContinuing] = useState(false)
  const [connectionProblem, setConnectionProblem] = useState(false)
  const activityKey = `ufitgo-admin-activity-${initialAdmin.id}`
  const updateConnectionProblem = useCallback((kind: "touch" | "refresh", failed: boolean) => {
    connectionProblems.current[kind] = failed
    setConnectionProblem(connectionProblems.current.touch || connectionProblems.current.refresh)
  }, [])
  const recordActivity = useCallback(() => {
    const now = Date.now()
    lastActivity.current = now
    setWarningOpen(false)
    if (now - lastActivityBroadcast.current >= 1000) {
      lastActivityBroadcast.current = now
      try {
        localStorage.setItem(activityKey, String(now))
      } catch (error) {
        console.error("Unable to share admin session activity between tabs", error)
      }
    }
  }, [activityKey])

  const finishLogout = useCallback(async () => {
    if (logoutStarted.current) return
    logoutStarted.current = true
    try { await logoutCurrentSession() } catch (error) { console.error("Unable to revoke admin session", error) }
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
      updateConnectionProblem("touch", false)
    } catch (error) {
      if (error instanceof SessionRequestError && error.status === 401) await finishLogout()
      else {
        console.error("Unable to continue admin session", error)
        updateConnectionProblem("touch", true)
      }
    } finally {
      setIsContinuing(false)
    }
  }, [finishLogout, updateConnectionProblem])

  useEffect(() => {
    let disposed = false

    const handleFailure = (kind: "touch" | "refresh", error: unknown) => {
      if (disposed) return
      if (error instanceof SessionRequestError && error.status === 401) {
        void finishLogout()
      } else {
        console.error("Admin session update failed", error)
        updateConnectionProblem(kind, true)
      }
    }

    const heartbeat = () => {
      if (touchPending.current) return
      touchPending.current = true
      lastHeartbeat.current = Date.now()
      touchCurrentSession()
        .then((session) => {
          if (disposed) return
          absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
          updateConnectionProblem("touch", false)
        })
        .catch((error) => handleFailure("touch", error))
        .finally(() => { touchPending.current = false })
    }

    const refresh = () => {
      if (refreshPending.current) return
      refreshPending.current = true
      lastRefresh.current = Date.now()
      refreshAccessToken()
        .then(({ session }) => {
          if (disposed) return
          absoluteExpiry.current = new Date(session.absoluteExpiresAt).getTime()
          updateConnectionProblem("refresh", false)
        })
        .catch((error) => {
          lastRefresh.current = Date.now() - REFRESH_INTERVAL_MS + RETRY_INTERVAL_MS
          handleFailure("refresh", error)
        })
        .finally(() => { refreshPending.current = false })
    }

    const registerActivity = () => {
      recordActivity()
      if (Date.now() - lastHeartbeat.current >= HEARTBEAT_INTERVAL_MS) heartbeat()
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== activityKey || !event.newValue) return
      const timestamp = Number(event.newValue)
      if (Number.isFinite(timestamp) && timestamp > lastActivity.current && timestamp <= Date.now()) {
        lastActivity.current = timestamp
        setWarningOpen(false)
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, registerActivity, { passive: true, capture: true }))
    window.addEventListener("storage", handleStorage)
    heartbeat()

    const clock = window.setInterval(() => {
      const now = Date.now()
      if (absoluteExpiry.current && now >= absoluteExpiry.current) {
        void finishLogout()
        return
      }
      if (callActive.current && now - lastActivity.current >= CALL_ACTIVITY_INTERVAL_MS) recordActivity()
      const remaining = IDLE_TIMEOUT_MS - (now - lastActivity.current)
      if (remaining <= 0) {
        void finishLogout()
      } else if (remaining <= WARNING_MS) {
        setSecondsRemaining(Math.max(0, Math.ceil(remaining / 1000)))
        setWarningOpen(true)
      }
      if (remaining > 0 && now - lastHeartbeat.current >= (connectionProblems.current.touch ? RETRY_INTERVAL_MS : HEARTBEAT_INTERVAL_MS) &&
          (connectionProblems.current.touch || callActive.current || now - lastActivity.current < HEARTBEAT_INTERVAL_MS)) heartbeat()
      if (remaining > 0 && now - lastRefresh.current >= REFRESH_INTERVAL_MS) refresh()
    }, 1000)

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current >= REFRESH_INTERVAL_MS) {
        refresh()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      disposed = true
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, registerActivity, true))
      window.removeEventListener("storage", handleStorage)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.clearInterval(clock)
    }
  }, [activityKey, finishLogout, recordActivity, updateConnectionProblem])

  const setCallActive = useCallback((active: boolean) => {
    if (active || callActive.current) recordActivity()
    callActive.current = active
  }, [recordActivity])

  return (
    <SessionContext.Provider value={{
      admin: initialAdmin,
      can: (permissions, mode = "all") => mode === "all"
        ? hasAllPermissions(initialAdmin, permissions)
        : hasAnyPermission(initialAdmin, permissions),
      logout: finishLogout,
      setCallActive,
    }}>
      {children}
      {connectionProblem && (
        <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-amber-100 p-4 text-sm text-amber-950 shadow-lg">
          Unable to keep your session updated. Check your connection; we’ll retry. Your session may expire if the connection is not restored.
        </div>
      )}
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
