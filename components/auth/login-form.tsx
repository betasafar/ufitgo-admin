"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/forms/form-field"
import { AuthRequestError, loginAdmin } from "@/lib/auth/client"

interface LoginFormState {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginErrors {
  email?: string
  password?: string
  form?: string
}

function validateLogin(values: LoginFormState): LoginErrors {
  const errors: LoginErrors = {}
  if (!values.email.trim()) errors.email = "Enter your email address."
  else if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address."
  if (!values.password) errors.password = "Enter your password."
  return errors
}

// Next.js inlines process.env.NODE_ENV at build time, so this branch is
// dead-code-eliminated from production bundles (e.g. Vercel builds).
const DEV_DEFAULTS = process.env.NODE_ENV === "development" ? { email: "admin@ufitgo.com", password: "Admin@123" } : { email: "", password: "" }

export function LoginForm() {
  const router = useRouter()
  const [values, setValues] = useState<LoginFormState>({ ...DEV_DEFAULTS, rememberMe: false })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationErrors = validateLogin(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) return

    setIsSubmitting(true)
    try {
      await loginAdmin({ ...values, email: values.email.trim().toLowerCase() })
      router.replace("/dashboard")
      router.refresh()
    } catch (error) {
      setErrors({
        form: error instanceof AuthRequestError ? error.message : "Unable to sign in. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-9">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0b8060]">Secure admin access</p>
        <h1 className="font-brand text-4xl font-bold tracking-tight text-[#17201c]">Welcome back</h1>
        <p className="mt-3 text-base leading-6 text-[#6f7773]">Sign in to access platform operations and governance tools.</p>
      </div>

      {errors.form && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm font-medium text-[#9f261f]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <FormField id="email" label="Email address" error={errors.email}>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9aa39f] transition-colors group-focus-within:text-[#07845f]" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="admin@ufitgo.ng"
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isSubmitting}
              className="h-14 rounded-lg border-[#d9dfdc] bg-white pl-12 pr-4 text-base shadow-none placeholder:text-[#aab1ae] focus-visible:border-[#07845f] focus-visible:ring-[#07845f]/15"
            />
          </div>
        </FormField>

        <FormField id="password" label="Password" error={errors.password}>
          <div className="group relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9aa39f] transition-colors group-focus-within:text-[#07845f]" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              disabled={isSubmitting}
              className="h-14 rounded-lg border-[#d9dfdc] bg-white pl-12 pr-12 text-base shadow-none placeholder:text-[#aab1ae] focus-visible:border-[#07845f] focus-visible:ring-[#07845f]/15"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[#79817d] transition-colors hover:bg-[#edf3f0] hover:text-[#075f48]"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#68716d]">
            <Checkbox
              checked={values.rememberMe}
              onCheckedChange={(checked) => setValues((current) => ({ ...current, rememberMe: checked === true }))}
              disabled={isSubmitting}
              className="border-[#aeb8b3] data-checked:border-[#07845f] data-checked:bg-[#07845f]"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-sm font-semibold text-[#08785a] underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-14 w-full rounded-lg bg-[#08ad80] text-base font-bold text-white shadow-[0_12px_28px_rgba(8,173,128,0.18)] hover:bg-[#078c69]"
        >
          {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>

      <p className="mt-9 text-xs text-[#9ba29f]">© {new Date().getFullYear()} UfitGo — Platform Governance</p>
    </div>
  )
}
