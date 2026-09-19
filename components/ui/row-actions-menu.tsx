"use client"

import type { ReactNode } from "react"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type RowAction = {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}

// Replaces bare icon-only buttons (which force users to guess what each icon does)
// with a single "Actions" trigger that opens a menu of clearly labeled options.
export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#36413d] transition hover:bg-[#f7f9f8]"
        onClick={(event) => event.stopPropagation()}
      >
        Actions <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[190px] border border-[#dbe2de] bg-white p-1 shadow-lg">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            disabled={action.disabled}
            onClick={(event) => { event.stopPropagation(); action.onClick() }}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-semibold text-[#36413d] focus:bg-[#eaf9f3] focus:text-[#0d7d5f]",
              action.destructive && "text-[#a43229] focus:bg-[#fff0ee] focus:text-[#a43229]",
            )}
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
