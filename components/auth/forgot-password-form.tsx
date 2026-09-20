"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CircleCheck, LoaderCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/forms/form-field"
import { AuthRequestError, requestPasswordReset } from "@/lib/auth/client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.")
      return
    }

    setError("")
    setIsSubmitting(true)
    try {
      const result = await requestPasswordReset(normalizedEmail)
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError instanceof AuthRequestError ? requestError.message : "Unable to request a reset link.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (message) {
    return (
      <div>
        <div className="grid size-12 place-items-center rounded-lg bg-[#dff7ee] text-[#07845f]">
          <CircleCheck className="size-6" />
        </div>
        <h1 className="font-brand mt-6 text-4xl font-bold text-[#17201c]">Check your email</h1>
        <p className="mt-4 text-base leading-7 text-[#68716d]">{message}</p>
        <p className="mt-3 text-sm leading-6 text-[#8a928e]">The secure link expires after 30 minutes. Check spam or junk folders if it does not arrive.</p>
        <Link href="/login" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#07845f] px-6 text-sm font-bold text-white transition-colors hover:bg-[#066c4e]">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#68716d] hover:text-[#07845f]">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#0b8060]">Account recovery</p>
      <h1 className="font-brand text-4xl font-bold text-[#17201c]">Forgot password?</h1>
      <p className="mt-3 max-w-md text-base leading-6 text-[#6f7773]">Enter your administrator email and we’ll send a secure, one-time reset link.</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-6" noValidate>
        <FormField id="email" label="Email address" error={error}>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9aa39f] group-focus-within:text-[#07845f]" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@ufitgo.ng"
              disabled={isSubmitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "email-error" : undefined}
              className="h-14 rounded-lg border-[#d9dfdc] bg-white pl-12 text-base shadow-none focus-visible:border-[#07845f] focus-visible:ring-[#07845f]/15"
            />
          </div>
        </FormField>
        <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-lg bg-[#08ad80] text-base font-bold text-white hover:bg-[#078c69]">
          {isSubmitting ? <><LoaderCircle className="size-5 animate-spin" /> Sending link…</> : "Send reset link"}
        </Button>
      </form>
    </div>
  )
}
