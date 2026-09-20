"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AtSign, Bell, Calendar, CheckCircle2, CircleAlert, Clock, LoaderCircle, Mail, MapPin, Send, Sparkles, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppSelect } from "@/components/ui/app-select"
import { PermissionGate } from "@/components/auth/permission-gate"

interface EmailTemplate {
  slug: string
  subject: string
  htmlBody: string
  textBody?: string
}

interface ScheduledBroadcast {
  id: string
  title: string
  targetType: string
  channel: string
  scheduledAt: string
  status: string
}

const FALLBACK_TEMPLATES: EmailTemplate[] = [
  { slug: "lead_early_savings", subject: "🕋 Start Your Hajj & Umrah Journey Early: Smart Savings Tips", htmlBody: "Salam! Fulfilling your dream of visiting the Holy Land begins with small, consistent steps today. Set up an EasySavings goal on UfitGo and save gradually at your own pace." },
  { slug: "lead_trending_packages", subject: "✨ Top-Rated Hajj & Umrah Packages This Month", htmlBody: "Discover our top-rated travel packages from verified, NAHCON-licensed tour operators! Explore verified packages on UfitGo today." },
  { slug: "lead_hajj_checklist", subject: "📋 Essential Checklist for First-Time Pilgrims", htmlBody: "Preparing for your first Hajj or Umrah? Check out our essential guide on packing, health tips, and spiritual preparation on UfitGo." },
]

const CHANNELS = [
  { id: "email", label: "Email only", icon: Mail },
  { id: "push", label: "Push notification", icon: Bell },
  { id: "both", label: "Both (email + push)", icon: Sparkles },
] as const

const LOCATIONS = ["", "Lagos", "Abuja", "Kano", "Ibadan"]

const EMPTY_FORM = {
  targetType: "users",
  specificEmail: "",
  location: "",
  channel: "email" as "email" | "push" | "both",
  title: "",
  body: "",
  actionUrl: "",
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || payload?.error || "Broadcast request failed.")
  return payload as T
}

export default function BroadcastPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now")
  const [scheduledAt, setScheduledAt] = useState("")
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const templatesQuery = useQuery({
    queryKey: ["notification-templates"],
    queryFn: () => apiRequest<EmailTemplate[]>("/api/admin/notifications/templates"),
  })
  const templates = templatesQuery.data && templatesQuery.data.length > 0 ? templatesQuery.data : FALLBACK_TEMPLATES

  const scheduledQuery = useQuery({
    queryKey: ["scheduled-broadcasts"],
    queryFn: () => apiRequest<{ data: ScheduledBroadcast[] }>("/api/admin/notifications/scheduled"),
  })
  const scheduledBroadcasts = scheduledQuery.data?.data || []

  function resetForm() {
    setForm(EMPTY_FORM)
    setSelectedTemplateSlug("")
    setScheduledAt("")
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {
      targetType: form.targetType,
      location: form.location,
      channel: form.channel,
      title: form.title,
      body: form.body,
      actionUrl: form.actionUrl,
    }

    const rawEmails = form.specificEmail.trim()
    if (rawEmails) {
      const cleaned = rawEmails.replace(/@gmail,com/gi, "@gmail.com").replace(/@yahoo,com/gi, "@yahoo.com").replace(/@outlook,com/gi, "@outlook.com")
      const emails = cleaned.split(",").map((email) => email.trim()).filter(Boolean)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalid = emails.find((email) => !emailRegex.test(email))
      if (invalid) throw new Error(`Invalid email format: "${invalid}". Please enter a valid address like user@example.com`)
      payload.recipients = emails.map((email) => ({ email }))
      payload.targetType = "specific"
    }

    return payload
  }

  const sendMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest<{ success: boolean; targetsReached?: number; pushError?: string | null }>("/api/admin/notifications/broadcast", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (result, payload) => {
      const recipients = payload.recipients as Array<unknown> | undefined
      const count = recipients?.length ?? result.targetsReached ?? 0
      setNotice(`Broadcast sent to ${count} recipient(s).`)
      window.setTimeout(() => setNotice(""), 6000)
      if (result.pushError) setError(`Push notification failed: ${result.pushError}`)
      resetForm()
    },
    onError: (requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to send broadcast."),
  })

  const scheduleMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest<{ success: boolean }>("/api/admin/notifications/schedule", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      setNotice("Broadcast scheduled successfully.")
      window.setTimeout(() => setNotice(""), 6000)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ["scheduled-broadcasts"] })
    },
    onError: (requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to schedule broadcast."),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ success: boolean }>(`/api/admin/notifications/scheduled/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-broadcasts"] }),
  })

  function handleTemplateSelect(slug: string) {
    setSelectedTemplateSlug(slug)
    if (!slug) return
    const tmpl = templates.find((t) => t.slug === slug)
    if (!tmpl) return
    setForm((current) => ({ ...current, title: tmpl.subject, body: tmpl.textBody || tmpl.htmlBody.replace(/<[^>]*>?/gm, "") }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const payload = buildPayload()
      if (sendMode === "schedule") {
        if (!scheduledAt) return setError("Please select a scheduled date and time.")
        payload.scheduledAt = new Date(scheduledAt).toISOString()
        scheduleMutation.mutate(payload)
      } else {
        sendMutation.mutate(payload)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to process broadcast.")
    }
  }

  const busy = sendMutation.isPending || scheduleMutation.isPending
  const previewTitle = form.title || "Notification title"
  const previewBody = form.body || "Your message preview will appear here..."

  const targetOptions = useMemo(() => ([
    { value: "users", label: "All pilgrims (users)" },
    { value: "operators", label: "All travel operators" },
  ]), [])
  const locationOptions = useMemo(() => LOCATIONS.map((loc) => ({ value: loc, label: loc || "National (all locations)" })), [])

  return (
    <PermissionGate permissions={["marketing.manage"]} fallback={<p className="text-sm text-[#a43229]">You do not have permission to send broadcasts.</p>}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="font-brand text-3xl font-bold text-[#17201c]">Broadcast messenger</h1>
          <p className="mt-1 text-sm text-[#68716d]">Send immediate or scheduled announcements to pilgrims and operators via email and push.</p>
        </div>

        {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]"><CircleAlert className="size-4 shrink-0" /> {error}</p>}
        {notice && <p role="status" className="flex items-center gap-2 rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-4 py-3 text-sm text-[#0c6b50]"><CheckCircle2 className="size-4 shrink-0" /> {notice}</p>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[#d9dfdc] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between border-b border-[#eef2f0] pb-4">
                <div>
                  <h2 className="flex items-center font-brand text-lg font-bold text-[#17201c]"><Send className="mr-2 size-4 text-[#07845f]" /> Compose broadcast</h2>
                  <p className="mt-0.5 text-xs text-[#68716d]">Choose a target audience, channel, and message.</p>
                </div>
                <div className="flex rounded-xl bg-[#f2f5f3] p-1">
                  <button type="button" onClick={() => setSendMode("now")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sendMode === "now" ? "bg-white text-[#17201c] shadow-sm" : "text-[#68716d] hover:text-[#17201c]"}`}>Send now</button>
                  <button type="button" onClick={() => setSendMode("schedule")} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${sendMode === "schedule" ? "bg-[#07845f] text-white shadow-sm" : "text-[#68716d] hover:text-[#17201c]"}`}><Clock className="size-3.5" /> Schedule</button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 rounded-xl border-2 border-[#bfe6cf] bg-[#eaf9f3] p-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0c6b50]"><AtSign className="size-4" /> Send to specific email(s) (optional test / direct send)</label>
                  <Input value={form.specificEmail} onChange={(event) => setForm((current) => ({ ...current, specificEmail: event.target.value }))} placeholder="e.g. name@example.com (leave empty to send to audience below)" className="h-11 bg-white text-sm" />
                  <p className="text-[11px] font-medium text-[#0c6b50]">Type one or more comma-separated emails to send directly, bypassing the audience filters below.</p>
                </div>

                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${form.specificEmail.trim() ? "pointer-events-none opacity-50" : ""}`}>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#68716d]"><span className="mb-2 flex items-center gap-1"><Users className="size-3.5 text-[#07845f]" /> Target audience</span>
                    <AppSelect value={form.targetType} onValueChange={(value) => setForm((current) => ({ ...current, targetType: value }))} options={targetOptions} className="bg-white" />
                  </label>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#68716d]"><span className="mb-2 flex items-center gap-1"><MapPin className="size-3.5 text-[#9aa19e]" /> Locality / state</span>
                    <AppSelect value={form.location} onValueChange={(value) => setForm((current) => ({ ...current, location: value }))} options={locationOptions} className="bg-white" />
                  </label>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#68716d]">Delivery channel</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {CHANNELS.map((ch) => {
                      const Icon = ch.icon
                      const checked = form.channel === ch.id
                      return (
                        <label key={ch.id} className="flex-1">
                          <input type="radio" name="channel" value={ch.id} className="sr-only" checked={checked} onChange={() => setForm((current) => ({ ...current, channel: ch.id }))} />
                          <div className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition ${checked ? "border-[#07845f] bg-[#eaf9f3]" : "border-[#d9dfdc] hover:bg-[#f7faf9]"}`}>
                            <Icon className="size-4 text-[#07845f]" />
                            <span className="text-xs font-semibold text-[#17201c]">{ch.label}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[#f1d9a8] bg-[#fff8e6] p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8a6500]"><Sparkles className="size-4" /> Load template preset</label>
                    {templatesQuery.isFetching && <span className="flex items-center gap-1 text-[10px] font-semibold text-[#8a6500]"><LoaderCircle className="size-3 animate-spin" /> Fetching...</span>}
                  </div>
                  <AppSelect
                    value={selectedTemplateSlug}
                    onValueChange={handleTemplateSelect}
                    options={[{ value: "", label: "-- Choose a template preset --" }, ...templates.map((t) => ({ value: t.slug, label: `[${t.slug}] ${t.subject}` }))]}
                    className="bg-white"
                  />
                </div>

                {sendMode === "schedule" && (
                  <div className="space-y-2 rounded-xl border border-[#c7d9ef] bg-[#eaf3fd] p-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1d5fa8]"><Calendar className="size-4" /> Dispatch date & time</label>
                    <Input type="datetime-local" required value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-11 bg-white text-sm" />
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#68716d]">Subject / title
                    <Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Start your Hajj & Umrah journey early" className="mt-2 h-11 bg-white" />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#68716d]">Message content
                    <textarea required rows={5} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} placeholder="Write your message body here..." className="mt-2 w-full rounded-lg border border-[#d3dad7] bg-white px-3 py-3 text-sm outline-none focus:border-[#0d7d5f]" />
                  </label>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#68716d]">Action URL / link (optional)
                    <Input value={form.actionUrl} onChange={(event) => setForm((current) => ({ ...current, actionUrl: event.target.value }))} placeholder="e.g. https://ufitgo.ng/wallet" className="mt-2 h-11 bg-white" />
                  </label>
                </div>

                <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl bg-[#07845f] text-sm font-bold text-white hover:bg-[#066c4e]">
                  {busy ? <LoaderCircle className="size-4 animate-spin" /> : sendMode === "schedule" ? <Clock className="size-4" /> : <Send className="size-4" />}
                  {sendMode === "schedule" ? "Schedule broadcast" : "Send broadcast now"}
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl border-2 border-dashed border-[#d9dfdc] bg-[#f7faf9] p-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#9aa19e]">Mobile preview</h3>
              <div className="relative aspect-[9/18.5] overflow-hidden rounded-[40px] border-[8px] border-[#17201c] bg-white p-4 shadow-2xl">
                <div className="absolute left-1/2 top-0 z-10 h-6 w-1/3 -translate-x-1/2 rounded-b-2xl bg-[#17201c]" />
                <div className="mt-12 rounded-2xl border border-[#eef2f0] bg-[#f7faf9] p-3 shadow-sm">
                  <div className="mb-2 flex items-center">
                    <div className="grid size-6 place-items-center rounded-lg bg-[#07845f]"><Bell className="size-3 text-white" /></div>
                    <span className="ml-2 text-[10px] font-bold uppercase text-[#68716d]">UfitGo</span>
                  </div>
                  <h4 className="truncate text-xs font-bold text-[#17201c]">{previewTitle}</h4>
                  <p className="mt-1 line-clamp-3 text-[10px] text-[#68716d]">{previewBody}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#d9dfdc] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-brand text-lg font-bold text-[#17201c]"><Clock className="size-4 text-[#07845f]" /> Upcoming & past scheduled broadcasts</h3>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["scheduled-broadcasts"] })} className="text-xs font-semibold text-[#07845f] hover:underline">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#eef2f0] font-semibold text-[#68716d]">
                <tr>
                  <th className="px-4 py-3">Subject / title</th>
                  <th className="px-4 py-3">Audience</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Scheduled for</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f0]">
                {scheduledQuery.isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-[#9aa19e]">Loading scheduled broadcasts...</td></tr>
                ) : scheduledBroadcasts.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-[#9aa19e]">No scheduled broadcasts found.</td></tr>
                ) : (
                  scheduledBroadcasts.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f7faf9]">
                      <td className="px-4 py-3 font-semibold text-[#17201c]">{item.title}</td>
                      <td className="px-4 py-3 capitalize text-[#68716d]">{item.targetType}</td>
                      <td className="px-4 py-3 text-xs font-bold uppercase text-[#9aa19e]">{item.channel}</td>
                      <td className="px-4 py-3 text-[#68716d]">{new Date(item.scheduledAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "pending" ? "bg-[#fff2d9] text-[#8a6500]" : item.status === "sent" ? "bg-[#dff7ee] text-[#0c6b50]" : "bg-[#f0f1f0] text-[#737a77]"}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.status === "pending" && (
                          <Button variant="outline" size="icon" title="Cancel scheduled broadcast" aria-label="Cancel scheduled broadcast" className="border-[#f4c7c3] text-[#a43229] hover:bg-[#fff4f2]" onClick={() => cancelMutation.mutate(item.id)} disabled={cancelMutation.isPending}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PermissionGate>
  )
}
