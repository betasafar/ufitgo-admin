import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SessionsPanel } from "@/components/auth/sessions-panel"

export default function SessionsPage() {
  return (
    <main className="min-h-dvh bg-[#f4f7f5] px-5 py-8 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68716d] hover:text-[#07845f]"><ArrowLeft className="size-4" /> Dashboard</Link>
        <section className="mt-6 rounded-xl border border-[#d9dfdc] bg-white p-5 shadow-sm sm:p-7">
          <SessionsPanel />
        </section>
      </div>
    </main>
  )
}
