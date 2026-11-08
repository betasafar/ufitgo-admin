"use client"

export function AdminIncomingCallBanner() {
  // Outbound-only calling model: only Concierge Admins initiate voice calls to pilgrims,
  // so no background polling of /api/admin/customers/calls/queue is needed.
  return null
}
