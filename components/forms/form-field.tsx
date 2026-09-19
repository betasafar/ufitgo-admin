import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  id: string
  label: string
  error?: string
  children: ReactNode
  className?: string
}

export function FormField({ id, label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-[0.12em] text-[#68716d]">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  )
}
