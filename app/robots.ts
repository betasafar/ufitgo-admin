import type { MetadataRoute } from "next"

// Internal admin console — block all crawlers outright, not just via meta tags.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  }
}
