import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { BrandMark } from "@/components/brand/brand-mark"
import type { AdminProfile } from "@/lib/auth/types"

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
    <main className="min-h-dvh bg-[#f4f7f5] p-6 sm:p-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#d9dfdc] pb-6">
        <BrandMark />
        <div className="text-right">
          <p className="text-sm font-bold text-[#17201c]">{admin?.name || "Administrator"}</p>
          <p className="text-xs text-[#77807c]">{admin?.role?.replaceAll("_", " ") || "Admin"}</p>
        </div>
      </header>
      <section className="mx-auto max-w-6xl py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#07845f]">Migration workspace</p>
        <h1 className="font-brand mt-3 text-4xl font-bold text-[#17201c]">Dashboard foundation ready</h1>
        <p className="mt-4 max-w-xl text-[#68716d]">Authentication is connected. The remaining admin modules can now be migrated into this protected shell.</p>
      </section>
    </main>
  )
}
