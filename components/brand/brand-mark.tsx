import { cn } from "@/lib/utils"

interface BrandMarkProps {
  className?: string
  inverse?: boolean
  showName?: boolean
}

export function BrandMark({ className, inverse = false, showName = true }: BrandMarkProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <span className="relative grid size-10 place-items-center">
        <svg viewBox="-4 -3 40 40" aria-hidden="true" className="size-10">
          <path d="M27 21 A 14 14 0 1 1 11 5 A 11 11 0 1 0 27 21 Z" fill="#e6b91e" />
          <path d="M10 29 V 17 C 10 9, 18 7, 18 2 C 18 7, 26 9, 26 17 V 29 Z" fill={inverse ? "#d8fff0" : "#0b6b50"} />
          <rect x="8" y="29" width="20" height="3" fill={inverse ? "#d8fff0" : "#0b6b50"} />
        </svg>
        <span className="absolute right-0 top-0 size-3 rounded-full border-2 border-current bg-[#ef3340]" />
      </span>
      {showName && <span className={cn("font-brand text-xl font-bold", inverse ? "text-white" : "text-[#10251d]")}>UfitGo</span>}
    </div>
  )
}
