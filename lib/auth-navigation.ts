const PRODUCTION_SITE_URL = "https://ufitgo.ng"

export function getSignOutCallbackUrl(path = "/") {
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  const baseUrl = isLocalhost ? window.location.origin : PRODUCTION_SITE_URL

  return new URL(path, `${baseUrl}/`).toString()
}

export function resolveAuthRedirect(url: string, baseUrl: string) {
  const canonicalBaseUrl =
    process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : baseUrl

  if (url.startsWith("/")) {
    return new URL(url, canonicalBaseUrl).toString()
  }

  try {
    const redirectUrl = new URL(url)
    if (
      redirectUrl.origin === canonicalBaseUrl ||
      redirectUrl.origin === baseUrl
    ) {
      return redirectUrl.toString()
    }
  } catch {
    return canonicalBaseUrl
  }

  return canonicalBaseUrl
}