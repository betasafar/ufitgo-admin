import Link from "next/link"
import { ShieldX } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f7f5] p-5">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[#fff0ee] text-[#a43229]"><ShieldX className="size-7" /></div>
        <h1 className="font-brand mt-6 text-3xl font-bold text-[#17201c]">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-[#68716d]">Your administrator role does not include permission to open this area.</p>
        <Link href="/dashboard" className="mt-7 inline-flex h-11 items-center rounded-lg bg-[#07845f] px-5 text-sm font-bold text-white hover:bg-[#066c4e]">Return to dashboard</Link>
      </section>
    </main>
  )
}
