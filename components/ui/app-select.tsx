"use client"

import type { ReactNode } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type AppSelectOption = { value: string; label: string }

interface AppSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: AppSelectOption[]
  placeholder?: string
  className?: string
  icon?: ReactNode
  containerClassName?: string
  disabled?: boolean
}

// Wraps the base-ui Select primitives with the app's filter-input look, replacing native <select> elements
// (which render an unstyled OS popup) with a themed, checkmark-driven dropdown.
export function AppSelect({ value, onValueChange, options, placeholder, className, icon, containerClassName, disabled }: AppSelectProps) {
  const trigger = (
    <SelectTrigger
      disabled={disabled}
      className={cn(
        "h-11 w-full justify-between rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm font-medium text-[#36413d] outline-none transition-colors data-[popup-open]:border-[#0d7d5f] focus-visible:border-[#0d7d5f] focus-visible:ring-0",
        icon && "pl-10",
        className,
      )}
    >
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  )

  return (
    <Select value={value} onValueChange={(next) => onValueChange(next ? String(next) : "")} disabled={disabled}>
      {icon ? (
        <div className={cn("relative", containerClassName)}>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-[#7b8580]">{icon}</span>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <SelectContent className="min-w-[var(--anchor-width)] border border-[#dbe2de] bg-white p-1 shadow-lg">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="cursor-pointer rounded-md px-2.5 py-2 text-sm text-[#36413d] focus:bg-[#eaf9f3] focus:text-[#0d7d5f] data-[selected]:font-semibold data-[selected]:text-[#0d7d5f]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
