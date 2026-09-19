"use client"

import { Clock3, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SessionTimeoutDialogProps {
  open: boolean
  secondsRemaining: number
  isContinuing: boolean
  onContinue: () => void
  onLogout: () => void
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${String(remainder).padStart(2, "0")}`
}

export function SessionTimeoutDialog({
  open,
  secondsRemaining,
  isContinuing,
  onContinue,
  onLogout,
}: SessionTimeoutDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#071e16]/55 p-5 backdrop-blur-sm" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="session-warning-title" aria-describedby="session-warning-description" className="w-full max-w-md rounded-xl border border-[#d9dfdc] bg-white p-6 shadow-2xl">
        <div className="grid size-11 place-items-center rounded-lg bg-[#fff4d6] text-[#9a6a00]"><Clock3 className="size-5" /></div>
        <h2 id="session-warning-title" className="font-brand mt-5 text-2xl font-bold text-[#17201c]">Your session will expire soon</h2>
        <p id="session-warning-description" className="mt-2 text-sm leading-6 text-[#68716d]">
          You’ll be signed out after inactivity. Continue now to keep your admin session secure.
        </p>
        <p className="mt-5 text-3xl font-bold tabular-nums text-[#9a6a00]" aria-live="polite">{formatRemaining(secondsRemaining)}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onLogout} className="h-11 rounded-lg px-5"><LogOut className="size-4" /> Sign out</Button>
          <Button onClick={onContinue} disabled={isContinuing} className="h-11 rounded-lg bg-[#07845f] px-5 text-white hover:bg-[#066c4e]">
            {isContinuing ? "Continuing…" : "Continue session"}
          </Button>
        </div>
      </section>
    </div>
  )
}
