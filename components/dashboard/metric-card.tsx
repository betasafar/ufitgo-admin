import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const tones = {
  green: { icon: "bg-[#e1f5ed] text-[#07845f]", accent: "bg-[#07845f]" },
  gold: { icon: "bg-[#fff3cf] text-[#8a6500]", accent: "bg-[#d9a900]" },
  blue: { icon: "bg-[#e5f0ff] text-[#2762a8]", accent: "bg-[#3478c5]" },
  red: { icon: "bg-[#fff0ee] text-[#b2382f]", accent: "bg-[#c34b42]" },
} as const

export type MetricTone = keyof typeof tones

interface MetricCardProps {
  label: string
  value: string
  description: string
  icon: LucideIcon
  tone?: MetricTone
}

export function MetricCard({ label, value, description, icon: Icon, tone = "green" }: MetricCardProps) {
  const style = tones[tone]
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-[#dbe2de] bg-white p-5 shadow-[0_1px_2px_rgba(10,35,25,0.03)]">
      <span className={cn("absolute inset-y-0 left-0 w-1", style.accent)} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#78817d]">{label}</p>
          <p className="mt-3 truncate text-3xl font-bold tracking-tight text-[#17201c]">{value}</p>
          <p className="mt-2 text-xs leading-5 text-[#87908c]">{description}</p>
        </div>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-lg", style.icon)}><Icon className="size-5" /></span>
      </div>
    </article>
  )
}
