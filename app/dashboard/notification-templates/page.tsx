"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Code, Eye, FileText, Loader2, Mail, Pencil, Plus, Search, Send, ShieldAlert, Sparkles, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppSelect } from "@/components/ui/app-select"
import { PermissionGate } from "@/components/auth/permission-gate"

interface EmailTemplate {
  slug: string
  category?: string
  subject: string
  htmlBody: string
  textBody?: string
}

type FormState = { slug: string; category: string; subject: string; htmlBody: string; textBody: string }

const SYSTEM_SLUGS = ["welcome", "forgot_password", "password_reset_success", "kyc_approved", "kyc_rejected", "savings_reminder"]

const EMPTY_FORM: FormState = {
  slug: "",
  category: "feature",
  subject: "",
  htmlBody: '<h2 style="color: #0F4C5C;">Hello {{userName}},</h2>\n<p style="color: #4A5568;">Type your email body here...</p>',
  textBody: "",
}

function isSystemTemplate(tmpl: EmailTemplate) {
  return tmpl.category === "system" || SYSTEM_SLUGS.includes(tmpl.slug)
}

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || payload?.message || "Template request failed.")
  return payload as T
}

export default function NotificationTemplatesPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"all" | "system" | "feature">("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview")
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [testEmail, setTestEmail] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const templatesQuery = useQuery({
    queryKey: ["notification-templates"],
    queryFn: () => apiRequest<EmailTemplate[]>("/api/admin/notifications/templates"),
  })
  const templates = templatesQuery.data || []

  function closeModal() {
    setIsCreateOpen(false)
    setEditingSlug(null)
    setError("")
  }

  const saveMutation = useMutation({
    mutationFn: (payload: FormState) => editingSlug
      ? apiRequest(`/api/admin/notifications/templates/${editingSlug}`, { method: "PUT", body: JSON.stringify(payload) })
      : apiRequest("/api/admin/notifications/templates", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      setNotice(editingSlug ? "Template updated successfully." : "Template created successfully.")
      window.setTimeout(() => setNotice(""), 6000)
      closeModal()
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] })
    },
    onError: (requestError) => setError(requestError instanceof Error ? requestError.message : "Failed to save template."),
  })

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => apiRequest(`/api/admin/notifications/templates/${slug}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-templates"] }),
  })

  const testEmailMutation = useMutation({
    mutationFn: () => apiRequest<{ success?: boolean }>("/api/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({ targetType: "specific", channel: "email", title: form.subject || "Test send", body: form.htmlBody, recipients: [{ email: testEmail.trim() }] }),
    }),
    onSuccess: () => {
      setNotice(`Test email sent to ${testEmail.trim()}.`)
      window.setTimeout(() => setNotice(""), 6000)
    },
    onError: () => setError("Failed to send test email."),
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setPreviewMode("preview")
    setIsCreateOpen(true)
  }

  function openEdit(tmpl: EmailTemplate) {
    setForm({ slug: tmpl.slug, category: tmpl.category || "feature", subject: tmpl.subject, htmlBody: tmpl.htmlBody, textBody: tmpl.textBody || "" })
    setPreviewMode("preview")
    setEditingSlug(tmpl.slug)
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!form.slug.trim() || !form.subject.trim() || !form.htmlBody.trim()) {
      return setError("Please fill in all required fields (slug, subject, HTML body).")
    }
    saveMutation.mutate(form)
  }

  function handleSendTest() {
    setError("")
    if (!testEmail.trim() || !testEmail.includes("@")) return setError("Please enter a valid recipient email address.")
    testEmailMutation.mutate()
  }

  const filteredTemplates = useMemo(() => templates.filter((t) => {
    const matchesCategory = activeTab === "all" ? true : activeTab === "system" ? isSystemTemplate(t) : !isSystemTemplate(t)
    const term = searchTerm.toLowerCase()
    const matchesSearch = t.slug.toLowerCase().includes(term) || t.subject.toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  }), [templates, activeTab, searchTerm])

  const systemCount = templates.filter(isSystemTemplate).length
  const featureCount = templates.length - systemCount

  return (
    <PermissionGate permissions={["marketing.manage"]} fallback={<p className="text-sm text-[#a43229]">You do not have permission to manage email templates.</p>}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#07845f] to-[#0c6b7e] p-6 text-white shadow-lg md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2"><Mail className="size-6 text-[#ffcf4d]" /><h2 className="font-brand text-xl font-bold">Email templates & branding</h2></div>
            <p className="mt-1 max-w-xl text-xs text-white/80">Manage uniform email designs across authentication, automated system updates, and marketing lead nurture campaigns.</p>
          </div>
          <Button onClick={openCreate} className="h-11 rounded-xl bg-[#ffcf4d] px-4 text-sm font-bold text-[#07845f] hover:bg-[#ffc22e]"><Plus className="size-4" /> Create new template</Button>
        </div>

        {error && <p role="alert" className="rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-4 py-3 text-sm text-[#0c6b50]">{notice}</p>}

        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 shadow-sm sm:flex-row">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button onClick={() => setActiveTab("all")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "all" ? "bg-[#07845f] text-white shadow-sm" : "text-[#68716d] hover:bg-[#f7faf9]"}`}>All templates ({templates.length})</button>
            <button onClick={() => setActiveTab("system")} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "system" ? "bg-[#07845f] text-white shadow-sm" : "text-[#68716d] hover:bg-[#f7faf9]"}`}><ShieldAlert className="size-4 text-[#f1b34d]" /> System default ({systemCount})</button>
            <button onClick={() => setActiveTab("feature")} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "feature" ? "bg-[#07845f] text-white shadow-sm" : "text-[#68716d] hover:bg-[#f7faf9]"}`}><Sparkles className="size-4 text-[#5aa9e6]" /> Feature & marketing ({featureCount})</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa19e]" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by slug or subject..." className="h-11 bg-white pl-9" />
          </div>
        </div>

        {templatesQuery.isLoading ? (
          <div className="rounded-xl border border-[#d9dfdc] bg-white py-16 text-center"><Loader2 className="mx-auto mb-3 size-8 animate-spin text-[#07845f]" /><p className="text-sm font-medium text-[#68716d]">Loading email templates...</p></div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-[#d9dfdc] bg-white py-16 text-center"><FileText className="mx-auto mb-3 size-12 text-[#d9dfdc]" /><h3 className="text-base font-bold text-[#17201c]">No templates found</h3><p className="mt-1 text-xs text-[#68716d]">Try adjusting your search query or filter tab.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((tmpl) => {
              const isSystem = isSystemTemplate(tmpl)
              return (
                <div key={tmpl.slug} className="flex flex-col justify-between rounded-2xl border border-[#d9dfdc] bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isSystem ? "border border-[#f1d9a8] bg-[#fff8e6] text-[#8a6500]" : "border border-[#cfeee0] bg-[#eaf9f3] text-[#0c6b50]"}`}>{isSystem ? "System default" : "Feature / marketing"}</span>
                      <span className="font-mono text-xs font-medium text-[#9aa19e]">{tmpl.slug}</span>
                    </div>
                    <h3 className="mb-2 line-clamp-1 text-base font-bold text-[#17201c]">{tmpl.subject}</h3>
                    <div className="mb-4 rounded-lg border border-[#eef2f0] bg-[#f7faf9] p-3 font-mono text-xs text-[#68716d] line-clamp-3">
                      {tmpl.htmlBody.replace(/<[^>]*>?/gm, "").trim() || "No preview available"}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#eef2f0] pt-3">
                    <button onClick={() => openEdit(tmpl)} className="inline-flex items-center gap-1 rounded-lg bg-[#eaf9f3] px-3 py-1.5 text-xs font-bold text-[#07845f] hover:bg-[#dcf3e9]"><Pencil className="size-3.5" /> Edit & preview</button>
                    {!isSystem && (
                      <button onClick={() => deleteMutation.mutate(tmpl.slug)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#a43229] hover:bg-[#fff4f2]" title="Delete template"><Trash2 className="size-3.5" /></button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {(isCreateOpen || editingSlug) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#17201c]/50 p-4 backdrop-blur-sm">
            <div className="my-8 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-[#eef2f0] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#17201c]">{editingSlug ? `Edit template: ${editingSlug}` : "Create new email template"}</h3>
                  <p className="text-xs text-[#68716d]">{form.category === "system" ? "System templates handle critical auth and verification flows." : "Feature templates power marketing, reminders, and user engagement."}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setPreviewMode("code")} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${previewMode === "code" ? "bg-[#07845f] text-white" : "bg-[#f2f5f3] text-[#68716d]"}`}><Code className="size-3.5" /> HTML code</button>
                  <button type="button" onClick={() => setPreviewMode("preview")} className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${previewMode === "preview" ? "bg-[#07845f] text-white" : "bg-[#f2f5f3] text-[#68716d]"}`}><Eye className="size-3.5" /> Live preview</button>
                  <button onClick={closeModal} aria-label="Close" className="px-2 text-lg font-bold text-[#9aa19e] hover:text-[#68716d]"><X className="size-5" /></button>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 space-y-4 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="block text-xs font-bold text-[#68716d]">Template slug (unique identifier) *
                    <Input disabled={!!editingSlug} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="e.g. lead_early_savings" className="mt-1 h-10 font-mono text-xs disabled:bg-[#f2f5f3]" required />
                  </label>
                  <label className="block text-xs font-bold text-[#68716d]">Template category *
                    <AppSelect value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))} className="mt-1" options={[{ value: "feature", label: "Feature & marketing email" }, { value: "system", label: "System default email" }]} />
                  </label>
                  <label className="block text-xs font-bold text-[#68716d]">Email subject line *
                    <Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="e.g. Start your Hajj journey early" className="mt-1 h-10 text-xs" required />
                  </label>
                </div>

                <label className="block text-xs font-bold text-[#68716d]">HTML body *
                  {previewMode === "code" ? (
                    <textarea required rows={12} value={form.htmlBody} onChange={(event) => setForm((current) => ({ ...current, htmlBody: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#d3dad7] px-3 py-2 font-mono text-xs outline-none focus:border-[#07845f]" />
                  ) : (
                    <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border border-[#eef2f0] bg-[#f7faf9] p-4" dangerouslySetInnerHTML={{ __html: form.htmlBody || "<p style='color:#9aa19e'>No content yet</p>" }} />
                  )}
                </label>

                <label className="block text-xs font-bold text-[#68716d]">Plain text body (optional fallback)
                  <textarea rows={3} value={form.textBody} onChange={(event) => setForm((current) => ({ ...current, textBody: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#d3dad7] px-3 py-2 text-xs outline-none focus:border-[#07845f]" />
                </label>

                <div className="flex flex-col gap-2 rounded-xl border border-[#eef2f0] bg-[#f7faf9] p-4 sm:flex-row sm:items-center">
                  <Input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} placeholder="Send a test to this email address" className="h-10 flex-1 bg-white text-xs" />
                  <Button type="button" variant="outline" onClick={handleSendTest} disabled={testEmailMutation.isPending} className="h-10 rounded-lg text-xs"><Send className="size-3.5" /> {testEmailMutation.isPending ? "Sending..." : "Send test email"}</Button>
                </div>

                <div className="flex justify-end gap-3 border-t border-[#eef2f0] pt-4">
                  <Button type="button" variant="outline" onClick={closeModal} className="h-10 rounded-lg">Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending} className="h-10 rounded-lg bg-[#07845f] px-5 text-white hover:bg-[#066c4e]">{saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : editingSlug ? "Save changes" : "Create template"}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
