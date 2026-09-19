"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CircleCheck, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/forms/form-field"
import { AuthRequestError, resetAdminPassword } from "@/lib/auth/client"

interface ResetPasswordFormProps {
  token: string
}

const passwordPattern = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [complete, setComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return setError("This reset link is incomplete. Request a new link.")
    if (password.length < 8 || !passwordPattern.test(password)) {
      return setError("Use at least 8 characters with uppercase, lowercase, and a number or symbol.")
    }
    if (password !== confirmation) return setError("Passwords do not match.")

    setError("")
    setIsSubmitting(true)
    try {
      await resetAdminPassword(token, password)
      setComplete(true)
    } catch (requestError) {
      setError(requestError instanceof AuthRequestError ? requestError.message : "Unable to reset password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (complete) {
    return (
      <div>
        <div className="grid size-12 place-items-center rounded-lg bg-[#dff7ee] text-[#07845f]"><CircleCheck className="size-6" /></div>
        <h1 className="font-brand mt-6 text-4xl font-bold text-[#17201c]">Password updated</h1>
        <p className="mt-4 text-base leading-7 text-[#68716d]">Your password has been changed and existing admin sessions were signed out.</p>
        <Link href="/login" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#07845f] px-6 text-sm font-bold text-white hover:bg-[#066c4e]">
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#68716d] hover:text-[#07845f]">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0b8060]">Secure reset</p>
      <h1 className="font-brand text-4xl font-bold text-[#17201c]">Choose a new password</h1>
      <p className="mt-3 text-base leading-6 text-[#6f7773]">Use a strong password you have not used for this admin account before.</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-6" noValidate>
        <FormField id="password" label="New password">
          <div className="group relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9aa39f] group-focus-within:text-[#07845f]" />
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} className="h-14 rounded-lg border-[#d9dfdc] bg-white pl-12 pr-12 text-base shadow-none focus-visible:border-[#07845f] focus-visible:ring-[#07845f]/15" />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[#79817d] hover:bg-[#edf3f0]">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
        <FormField id="confirmation" label="Confirm new password" error={error}>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9aa39f]" />
            <Input id="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={isSubmitting} aria-invalid={Boolean(error)} aria-describedby={error ? "confirmation-error" : undefined} className="h-14 rounded-lg border-[#d9dfdc] bg-white pl-12 text-base shadow-none focus-visible:border-[#07845f] focus-visible:ring-[#07845f]/15" />
          </div>
        </FormField>
        <p className="text-xs leading-5 text-[#818985]">At least 8 characters with uppercase, lowercase, and a number or symbol.</p>
        <Button type="submit" disabled={isSubmitting || !token} className="h-14 w-full rounded-lg bg-[#08ad80] text-base font-bold text-white hover:bg-[#078c69]">
          {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" /> Updating password…</> : "Reset password"}
        </Button>
        {!token && <p role="alert" className="text-sm font-medium text-[#b42318]">This reset link is incomplete. Request a new one.</p>}
      </form>
    </div>
  )
}
