"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

type Toast = { id: number; message: string; tone: "success" | "error" }
type ToastContextValue = { toast: (message: string, tone?: Toast["tone"]) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 6000)
  }, [])

  return <ToastContext.Provider value={{ toast }}>
    {children}
    <div aria-live="polite" className="fixed right-4 top-4 z-100 space-y-2">
      {toasts.map((item) => <div key={item.id} role={item.tone === "error" ? "alert" : "status"} className={`max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${item.tone === "success" ? "bg-[#0c6b50] text-white" : "bg-[#9f261f] text-white"}`}>{item.message}</div>)}
    </div>
  </ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider.")
  return context
}
