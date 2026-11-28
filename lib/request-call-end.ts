export async function requestCallEnd(id: string): Promise<void> {
  const response = await fetch(`/api/admin/customers/call/${encodeURIComponent(id)}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "end" }),
    keepalive: true,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}
