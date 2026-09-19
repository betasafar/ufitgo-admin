import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"

function messageFrom(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Unable to reset password."
  const message = (payload as { message?: unknown }).message
  if (typeof message === "string") return message
  if (Array.isArray(message)) return message.join(" ")
  return "Unable to reset password."
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.token || !body?.password) {
    return NextResponse.json({ message: "Reset token and password are required." }, { status: 400 })
  }

  try {
    const upstream = await fetch(getAdminApiUrl("/admin/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: body.token, password: body.password }),
      cache: "no-store",
    })
    const payload = await upstream.json().catch(() => null)
    return NextResponse.json(
      { success: upstream.ok, message: upstream.ok ? payload?.message || "Password reset successfully." : messageFrom(payload) },
      { status: upstream.status },
    )
  } catch (error) {
    console.error("Reset-password gateway error", error)
    return NextResponse.json({ message: "Password recovery is temporarily unavailable." }, { status: 503 })
  }
}
