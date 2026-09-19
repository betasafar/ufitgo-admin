import type { ReactNode } from "react"
import { CircleCheck } from "lucide-react"
import { BrandMark } from "@/components/brand/brand-mark"

const governancePoints = [
  ["Operations overview", "Track platform activity, service health, and operational signals globally."],
  ["Streamlined controls", "Manage customers, operators, inventory, and payments in one workspace."],
  ["Verified trust", "Oversee platform integrity and publish changes with accountable access."],
]

interface AuthShellProps {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[#f4f7f5] lg:grid lg:grid-cols-[minmax(420px,40%)_1fr]">
      <aside className="relative hidden min-h-dvh overflow-hidden bg-[#071e16] px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
        <div className="absolute inset-0 bg-[url('/images/mecca-skyline.png')] bg-cover bg-center opacity-[0.12]" />
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(4,30,21,0.98)_10%,rgba(4,30,21,0.88)_58%,rgba(4,30,21,0.96)_100%)]" />
        <div className="relative z-10"><BrandMark inverse /></div>

        <div className="relative z-10 my-auto max-w-md py-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#72d7b2]">Administration</p>
          <h1 className="font-brand text-5xl font-bold leading-[1.04] tracking-tight xl:text-6xl">
            Platform<br /><span className="text-[#f4bd16]">Governance</span>
          </h1>
          <p className="mt-7 max-w-sm text-base leading-7 text-white/72">
            The central control system for operating UfitGo safely, clearly, and at scale.
          </p>

          <div className="mt-11 space-y-7">
            {governancePoints.map(([title, description]) => (
              <div key={title} className="flex gap-4">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-[#20c997]" strokeWidth={2.2} />
                <div>
                  <h2 className="text-sm font-bold text-white">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-white/58">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/35">© {new Date().getFullYear()} UfitGo. Internal access only.</p>
      </aside>

      <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:px-16">
        <div className="absolute -right-28 -top-28 size-80 rounded-full bg-[#cce9dc]/45 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-72 rounded-full bg-[#f1d672]/20 blur-3xl" />
        <div className="relative z-10 w-full max-w-[470px]">
          <div className="mb-10 lg:hidden"><BrandMark /></div>
          {children}
        </div>
      </section>
    </main>
  )
}
