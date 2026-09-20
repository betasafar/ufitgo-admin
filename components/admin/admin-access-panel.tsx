"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, CheckCircle2, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppSelect } from "@/components/ui/app-select"
import { PermissionGate } from "@/components/auth/permission-gate"
import { ADMIN_ROLES, PERMISSION_GROUPS, ROLE_DEFAULT_PERMISSIONS, type AdminRole, type Permission } from "@/lib/rbac/permissions"
import type { AdminProfile } from "@/lib/auth/types"

interface ManagedAdmin extends AdminProfile {
  isActive: boolean
  createdAt: string
  activatedAt?: string
}

interface PermissionCatalog {
  roles: AdminRole[]
  groups: Record<string, Permission[]>
}

interface EditorState {
  id?: number
  name: string
  email: string
  role: AdminRole
  permissions: string[]
}

interface PasswordEditorState {
  id: number
  name: string
  password: string
  confirm: string
  showPassword: boolean
}

interface ConfirmState {
  type: "toggle" | "delete"
  id: number
  name: string
  isActive?: boolean
}

const PASSWORD_RULE = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/

const EMPTY_EDITOR: EditorState = { name: "", email: "", role: "OPERATIONS", permissions: [...ROLE_DEFAULT_PERMISSIONS.OPERATIONS] }

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Administrator request failed.")
  return payload as T
}

export function AdminAccessPanel() {
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [passwordEditor, setPasswordEditor] = useState<PasswordEditorState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [passwordError, setPasswordError] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const adminsQuery = useQuery({ queryKey: ["admins"], queryFn: () => apiRequest<ManagedAdmin[]>("/api/admin/auth/admins") })
  const catalogQuery = useQuery({ queryKey: ["permission-catalog"], queryFn: () => apiRequest<PermissionCatalog>("/api/admin/auth/permissions") })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admins"] })

  const mutation = useMutation({
    mutationFn: ({ url, method = "POST", body }: { url: string; method?: string; body?: unknown }) => apiRequest(url, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => { refresh(); setEditor(null); setConfirmState(null); setError("") },
    onError: (requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to update administrator."),
  })

  function confirmPendingAction() {
    if (!confirmState) return
    if (confirmState.type === "delete") {
      mutation.mutate({ url: `/api/admin/auth/admins/${confirmState.id}`, method: "DELETE" })
    } else {
      mutation.mutate({ url: `/api/admin/auth/admins/${confirmState.id}/toggle-status` })
    }
  }

  const setPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => apiRequest<{ message: string }>(`/api/admin/auth/admins/${id}/set-password`, { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: (payload, variables) => {
      setPasswordEditor(null)
      setPasswordError("")
      setNotice(payload?.message || `Password updated for admin #${variables.id}.`)
      window.setTimeout(() => setNotice(""), 6000)
    },
    onError: (requestError) => setPasswordError(requestError instanceof Error ? requestError.message : "Unable to update password."),
  })

  function setRole(role: AdminRole) {
    setEditor((current) => current ? { ...current, role, permissions: [...ROLE_DEFAULT_PERMISSIONS[role]] } : current)
  }

  function togglePermission(permission: Permission) {
    setEditor((current) => {
      if (!current) return current
      const permissions = current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions.filter((item) => item !== "*"), permission]
      return { ...current, permissions }
    })
  }

  function saveEditor() {
    if (!editor) return
    if (!editor.name.trim() || !editor.email.trim()) return setError("Name and email are required.")
    const body = {
      name: editor.name.trim(),
      email: editor.email.trim().toLowerCase(),
      role: editor.role,
      permissions: editor.permissions,
    }
    mutation.mutate({ url: editor.id ? `/api/admin/auth/admins/${editor.id}` : "/api/admin/auth/invite", body })
  }

  function submitPassword() {
    if (!passwordEditor) return
    if (passwordEditor.password.length < 8 || !PASSWORD_RULE.test(passwordEditor.password)) {
      return setPasswordError("Password must be at least 8 characters and include uppercase, lowercase, and a number or special character.")
    }
    if (passwordEditor.password !== passwordEditor.confirm) {
      return setPasswordError("Passwords do not match.")
    }
    setPasswordMutation.mutate({ id: passwordEditor.id, password: passwordEditor.password })
  }

  const loading = adminsQuery.isLoading || catalogQuery.isLoading
  const groups = catalogQuery.data?.groups || PERMISSION_GROUPS

  return (
    <PermissionGate permissions={["settings.manage"]} fallback={<p className="text-sm text-[#a43229]">You do not have permission to manage administrators.</p>}>
      <div>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><h1 className="font-brand text-3xl font-bold text-[#17201c]">Platform administrators</h1><p className="mt-1 text-sm text-[#68716d]">Assign roles and precise permissions. Backend checks remain authoritative.</p></div>
          <Button onClick={() => setEditor({ ...EMPTY_EDITOR })} className="h-11 rounded-lg bg-[#07845f] px-5 text-white hover:bg-[#066c4e]"><Plus className="size-4" /> Invite administrator</Button>
        </div>

        {error && <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]"><CircleAlert className="size-4" /> {error}</p>}
        {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-4 py-3 text-sm text-[#0c6b50]"><KeyRound className="size-4" /> {notice}</p>}

        {editor && <section className="mb-6 rounded-xl border border-[#d9dfdc] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-brand text-2xl font-bold">{editor.id ? "Edit administrator" : "Invite administrator"}</h2><button aria-label="Close editor" onClick={() => setEditor(null)}><X className="size-5" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#68716d]">Name<Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} className="mt-2 h-11 bg-white" /></label>
            <label className="text-xs font-bold uppercase tracking-wider text-[#68716d]">Email<Input type="email" value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} className="mt-2 h-11 bg-white" /></label>
            <label className="text-xs font-bold uppercase tracking-wider text-[#68716d] sm:col-span-2">Role
              <AppSelect
                value={editor.role}
                onValueChange={(value) => setRole(value as AdminRole)}
                className="mt-2 border-[#d9dfdc]"
                options={(catalogQuery.data?.roles || ADMIN_ROLES).map((role) => ({ value: role, label: role }))}
              />
            </label>
          </div>
          <div className="mt-6 space-y-4">
            {Object.entries(groups).map(([label, permissions]) => <fieldset key={label}><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#68716d]">{label}</legend><div className="flex flex-wrap gap-2">{permissions.map((permission: Permission) => { const checked = editor.permissions.includes("*") || editor.permissions.includes(permission); return <label key={permission} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold ${checked ? "border-[#07845f] bg-[#e5f6ef] text-[#067554]" : "border-[#d9dfdc] text-[#68716d]"}`}><input type="checkbox" className="sr-only" checked={checked} disabled={editor.permissions.includes("*")} onChange={() => togglePermission(permission)} />{permission}</label> })}</div></fieldset>)}
          </div>
          <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setEditor(null)} className="h-10 rounded-lg">Cancel</Button><Button onClick={saveEditor} disabled={mutation.isPending} className="h-10 rounded-lg bg-[#07845f] px-5 text-white">{mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : editor.id ? "Save changes" : "Send invitation"}</Button></div>
        </section>}

        {passwordEditor && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5" role="dialog" aria-modal="true" aria-label="Set administrator password">
            <div className="w-full max-w-md rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#07845f]">Set password</p><h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">{passwordEditor.name}</h2></div>
                <button aria-label="Close" onClick={() => { setPasswordEditor(null); setPasswordError("") }}><X className="size-5" /></button>
              </div>
              <p className="mt-2 text-sm text-[#68716d]">This immediately replaces the administrator's current password and signs them out of all active sessions.</p>
              {passwordError && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-3 py-2 text-xs text-[#9f261f]"><CircleAlert className="size-4 shrink-0" /> {passwordError}</p>}
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#68716d]">New password
                <div className="relative mt-2">
                  <Input type={passwordEditor.showPassword ? "text" : "password"} value={passwordEditor.password} onChange={(event) => setPasswordEditor({ ...passwordEditor, password: event.target.value })} className="h-11 bg-white pr-10" />
                  <button type="button" aria-label={passwordEditor.showPassword ? "Hide password" : "Show password"} onClick={() => setPasswordEditor({ ...passwordEditor, showPassword: !passwordEditor.showPassword })} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa19e]">
                    {passwordEditor.showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#68716d]">Confirm password<Input type={passwordEditor.showPassword ? "text" : "password"} value={passwordEditor.confirm} onChange={(event) => setPasswordEditor({ ...passwordEditor, confirm: event.target.value })} className="mt-2 h-11 bg-white" /></label>
              <p className="mt-2 text-xs text-[#9aa19e]">At least 8 characters, with uppercase, lowercase, and a number or special character.</p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setPasswordEditor(null); setPasswordError("") }} className="h-10 rounded-lg">Cancel</Button>
                <Button onClick={submitPassword} disabled={setPasswordMutation.isPending} className="h-10 rounded-lg bg-[#07845f] px-5 text-white">{setPasswordMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : "Update password"}</Button>
              </div>
            </div>
          </div>
        )}

        {confirmState && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5" role="alertdialog" aria-modal="true" aria-label="Confirm action">
            <div className="w-full max-w-md rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${confirmState.type === "delete" ? "text-[#a43229]" : "text-[#8a6500]"}`}>{confirmState.type === "delete" ? "Delete administrator" : confirmState.isActive ? "Deactivate administrator" : "Activate administrator"}</p>
                  <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">{confirmState.name}</h2>
                </div>
                <button aria-label="Close" onClick={() => setConfirmState(null)}><X className="size-5" /></button>
              </div>
              <p className="mt-2 text-sm text-[#68716d]">
                {confirmState.type === "delete"
                  ? "This permanently removes the administrator account and cannot be undone."
                  : confirmState.isActive
                    ? "This immediately signs them out and blocks access until reactivated."
                    : "This restores their access to the admin dashboard."}
              </p>
              {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-3 py-2 text-xs text-[#9f261f]"><CircleAlert className="size-4 shrink-0" /> {error}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmState(null)} className="h-10 rounded-lg">Cancel</Button>
                <Button onClick={confirmPendingAction} disabled={mutation.isPending} className={`h-10 rounded-lg px-5 text-white ${confirmState.type === "delete" ? "bg-[#a43229] hover:bg-[#8c2a22]" : "bg-[#07845f] hover:bg-[#066c4e]"}`}>
                  {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : confirmState.type === "delete" ? "Delete" : confirmState.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#07845f]" /></div> : <div className="space-y-3">{adminsQuery.data?.map((admin) => <article key={admin.id} className="flex flex-col gap-4 rounded-xl border border-[#d9dfdc] bg-white p-4 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#edf6f2] text-[#07845f]"><ShieldCheck className="size-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-[#17201c]">{admin.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${admin.isActive ? "bg-[#dff7ee] text-[#067554]" : "bg-[#f0f1f0] text-[#737a77]"}`}>{admin.isActive ? "ACTIVE" : "INACTIVE"}</span></div><p className="mt-1 text-sm text-[#68716d]">{admin.email} · {admin.role.replaceAll("_", " ")}</p><p className="mt-1 truncate text-xs text-[#9aa19e]">{admin.permissions.includes("*") ? "Full platform access" : `${admin.permissions.length} permissions`}</p></div><div className="flex gap-2">
              <Button variant="outline" size="icon" title="Edit role and permissions" aria-label="Edit role and permissions" onClick={() => setEditor({ id: admin.id, name: admin.name, email: admin.email, role: admin.role as AdminRole, permissions: [...admin.permissions] })}><Pencil className="size-4" /></Button>
              <Button variant="outline" size="icon" title="Set a new password" aria-label="Set a new password" className="border-[#c7d9ef] text-[#1d5fa8] hover:bg-[#eaf3fd]" onClick={() => setPasswordEditor({ id: admin.id, name: admin.name, password: "", confirm: "", showPassword: false })}><KeyRound className="size-4" /></Button>
              <Button variant="outline" size="icon" title={admin.isActive ? "Deactivate administrator" : "Activate administrator"} aria-label={admin.isActive ? "Deactivate administrator" : "Activate administrator"} className={admin.isActive ? "border-[#f1d9a8] text-[#8a6500] hover:bg-[#fff6e0]" : "border-[#bfe6cf] text-[#0c6b50] hover:bg-[#eaf9f3]"} onClick={() => setConfirmState({ type: "toggle", id: admin.id, name: admin.name, isActive: admin.isActive })}>{admin.isActive ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}</Button>
              <Button variant="destructive" size="icon" title="Delete administrator" aria-label="Delete administrator" onClick={() => setConfirmState({ type: "delete", id: admin.id, name: admin.name })}><Trash2 className="size-4" /></Button>
            </div></article>)}</div>}
      </div>
    </PermissionGate>
  )
}
