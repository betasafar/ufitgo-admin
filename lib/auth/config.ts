const DEFAULT_API_URL = "https://api.ufitgo.ng"

export function getAdminApiUrl(path: string): string {
  const configuredUrl = (
    process.env.ADMIN_API_URL ||
    process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
    DEFAULT_API_URL
  ).replace(/\/$/, "")

  const apiBase = configuredUrl.endsWith("/api")
    ? configuredUrl
    : `${configuredUrl}/api`

  return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`
}
