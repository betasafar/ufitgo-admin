import { NextResponse, type NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  if (request.cookies.has("ufitgo_admin_access")) return NextResponse.next()

  if (request.cookies.has("ufitgo_admin_refresh")) {
    const resumeUrl = new URL("/api/auth/resume", request.url)
    resumeUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(resumeUrl)
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
  ]
}
