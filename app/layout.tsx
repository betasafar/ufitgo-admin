import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { AppProviders } from "./providers"

const siteUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.ufitgo.ng"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "UfitGo Admin",
    template: "%s | UfitGo Admin",
  },
  description: "Internal governance and operations console for the UfitGo platform: partners, packages, bookings, payments, and compliance in one place.",
  applicationName: "UfitGo Admin",
  // Internal tool — must never be indexed or surfaced in search results.
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  themeColor: "#071e16",
  colorScheme: "light",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  )
}
