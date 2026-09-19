import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { AdminProfile } from "@/lib/auth/types"
import Link from "next/link"

function profileFromCookie(value?: string): AdminProfile | null {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as AdminProfile
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  if (!cookieStore.has("ufitgo_admin_access")) redirect("/login")
  const admin = profileFromCookie(cookieStore.get("ufitgo_admin_profile")?.value)

  return (
    <main className="p-5 sm:p-8">
      <section className="mx-auto max-w-6xl py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#07845f]">Migration workspace</p>
        <h1 className="font-brand mt-3 text-4xl font-bold text-[#17201c]">Welcome, {admin?.name || "Administrator"}</h1>
        <p className="mt-4 max-w-xl text-[#68716d]">Authentication is connected. The remaining admin modules can now be migrated into this protected shell.</p>
        <Link href="/dashboard/sessions" className="mt-7 inline-flex h-11 items-center rounded-lg border border-[#b9c8c1] bg-white px-5 text-sm font-bold text-[#075f48] hover:bg-[#edf3f0]">Manage active sessions</Link>
      </section>
    </main>
  )
}
