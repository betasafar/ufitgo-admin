"use client"

import { useEffect, useState } from "react"
import { Info, Loader2, Mail, Plus, Save, Trash2, X } from "lucide-react"

const MAX_CONTACTS = 3

type Contacts = { accountEmail: string | null; documentNotificationEmails: string[]; effectiveRecipients: string[] }

/** Admin-managed emails that hear about traveller documents being released to this operator. */
export function OperatorDocumentContacts({ operatorId }: { operatorId: string }) {
  const [contacts, setContacts] = useState<Contacts | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  const load = async () => {
    const response = await fetch(`/api/admin/operator-auth/operators/${operatorId}/document-contacts`, { cache: "no-store" })
    const payload = await response.json().catch(() => null)
    if (response.ok) setContacts(payload?.data || payload)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/operator-auth/operators/${operatorId}/document-contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: draft.map((email) => email.trim()).filter(Boolean) }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message = payload?.message
        throw new Error(Array.isArray(message) ? message.join(" ") : message || "Unable to save emails")
      }
      setContacts(payload?.data || payload)
      setEditing(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save emails")
    } finally {
      setSaving(false)
    }
  }

  const configured = contacts?.documentNotificationEmails || []

  return (
    <section className="rounded-2xl border border-[#dbe2de] bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-brand text-lg font-bold text-[#17201c]">Document notifications</h3>
        <button type="button" onClick={() => setHelpOpen(true)} aria-label="How document notifications work" className="inline-flex size-7 items-center justify-center rounded-full text-[#68716d] hover:bg-[#eef3f1] hover:text-[#0d7d5f]">
          <Info className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#68716d]">Who we email when we release travellers&apos; documents to this operator for visa processing.</p>

      {!contacts ? (
        <Loader2 className="mt-4 size-4 animate-spin text-[#0d7d5f]" />
      ) : editing ? (
        <div className="mt-4 space-y-2">
          {draft.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(event) => setDraft((current) => current.map((value, i) => (i === index ? event.target.value : value)))}
                placeholder="visa-team@operator.com"
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#d3dad7] bg-[#f8faf9] px-3 text-sm outline-none focus:border-[#0d7d5f]"
              />
              <button type="button" aria-label="Remove email" onClick={() => setDraft((current) => current.filter((_, i) => i !== index))} className="text-[#a43229]"><Trash2 className="size-4" /></button>
            </div>
          ))}
          {draft.length < MAX_CONTACTS && (
            <button type="button" onClick={() => setDraft((current) => [...current, ""])} className="inline-flex items-center gap-1 text-xs font-bold text-[#0d7d5f]"><Plus className="size-3.5" /> Add email</button>
          )}
          <p className="text-[11px] text-[#7b8580]">Up to {MAX_CONTACTS}. Leave empty to use the account email ({contacts.accountEmail || "none on file"}).</p>
          {error && <p className="text-xs font-semibold text-[#a43229]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0d7d5f] px-3 text-xs font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
            </button>
            <button type="button" onClick={() => { setEditing(false); setError(null) }} className="h-9 rounded-lg border border-[#d3dad7] px-3 text-xs font-bold text-[#68716d]">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-[#68716d]">
          {contacts.effectiveRecipients.length === 0 ? (
            <p className="rounded-lg border border-[#f3dfb0] bg-[#fff8e6] px-3 py-2 text-xs font-semibold text-[#8a5a00]">No email on file. The operator will only see releases inside their portal.</p>
          ) : (
            contacts.effectiveRecipients.map((email) => (
              <div key={email} className="flex items-start gap-3"><Mail className="mt-0.5 size-4 text-[#66716c]" /><span className="break-all">{email}</span></div>
            ))
          )}
          {configured.length === 0 && contacts.effectiveRecipients.length > 0 && (
            <p className="text-[11px] text-[#7b8580]">Using the account email. Add the operator&apos;s visa team for faster processing.</p>
          )}
          <button type="button" onClick={() => { setDraft(configured.length ? configured : [""]); setEditing(true) }} className="text-xs font-bold text-[#0d7d5f] hover:underline">
            {configured.length ? "Change emails" : "Set up notification emails"}
          </button>
        </div>
      )}

      {helpOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5" role="dialog" aria-modal="true" aria-label="How document notifications work" onClick={() => setHelpOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#07845f]">Staff guide</p>
                <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">Document notification emails</h2>
              </div>
              <button type="button" aria-label="Close" onClick={() => setHelpOpen(false)} className="text-[#68716d]"><X className="size-5" /></button>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#4b5551]">
              <li>When staff release, update or withdraw a booking&apos;s documents, these addresses get an email and the operator sees a notification in their portal.</li>
              <li>Ask the operator for the people who handle visas, e.g. their visa officer and operations manager. Up to {MAX_CONTACTS} addresses.</li>
              <li>If none are set, we email the operator&apos;s account email.</li>
              <li>The email never contains the documents or a link to them. Recipients must log in to the operator portal, where every file opened is recorded.</li>
              <li>Only UfitGo staff can change these addresses. If the operator&apos;s team changes, update them here.</li>
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
