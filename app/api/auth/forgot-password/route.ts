import { NextResponse } from "next/server"
import { getAdminApiUrl } from "@/lib/auth/config"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.email) return NextResponse.json({ message: "Email is required." }, { status: 400 })

  try {
    const upstream = await fetch(getAdminApiUrl("/admin/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(body.email).trim().toLowerCase() }),
      cache: "no-store",
    })
    const payload = await upstream.json().catch(() => null)
    return NextResponse.json(
      { message: payload?.message || "If an active administrator account exists for that email, a reset link has been sent.", success: upstream.ok },
      { status: upstream.status },
    )
  } catch (error) {
    console.error("Forgot-password gateway error", error)
    return NextResponse.json({ message: "Password recovery is temporarily unavailable." }, { status: 503 })
  }
}
