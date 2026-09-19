import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage() {
  const cookieStore = await cookies()
  if (cookieStore.has("ufitgo_admin_access")) redirect("/dashboard")

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  )
}
