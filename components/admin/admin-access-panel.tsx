"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Network,
  Plus,
  Search,
  Settings,
  Trash2,
  UserCog,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PermissionGate } from "@/components/auth/permission-gate"
import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFAULT_PERMISSIONS,
  type AdminRole,
  type PermissionDefinition,
  type RoleDefinition,
} from "@/lib/rbac/permissions"
import type { AdminProfile } from "@/lib/auth/types"

interface ManagedAdmin extends AdminProfile {
  isActive: boolean
  createdAt: string
  activatedAt?: string
}

interface PermissionCatalog {
  roles: AdminRole[]
  roleDefinitions?: RoleDefinition[]
  groups: Record<string, string[]>
  definitions?: PermissionDefinition[]
}

interface InviteEditorState {
  name: string
  email: string
  role: string
  permissions: string[]
}

interface RoleFormState {
  id?: number
  name: string
  slug: string
  description: string
  permissions: string[]
  syncMembers: boolean
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

const FALLBACK_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    slug: "SUPER_ADMIN",
    name: "Owner",
    description: "Full platform owner with unrestricted access across all modules and settings.",
    permissions: ["*"],
    isSystem: true,
  },
  {
    slug: "MANAGING_DIRECTOR",
    name: "Admin",
    description: "Executive administrator with full access across dashboard features and analytics.",
    permissions: ["*"],
    isSystem: true,
  },
  {
    slug: "HEAD_OF_OPERATIONS",
    name: "Head of Operations",
    description: "Leads B2B Operator/BDC partnerships, B2C Mosque onboarding, and bookings.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.HEAD_OF_OPERATIONS || [])],
    isSystem: true,
  },
  {
    slug: "B2B_ONBOARDING_LEAD",
    name: "B2B Operator & BDC Lead",
    description: "Secures appointments and onboards NAHCON tour operators and licensed BDCs.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.B2B_ONBOARDING_LEAD || [])],
    isSystem: true,
  },
  {
    slug: "B2B_SUPPORT",
    name: "B2B Engagement Support",
    description: "Assists operators with package uploads, slot updates, and BDC rate updates.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.B2B_SUPPORT || [])],
    isSystem: true,
  },
  {
    slug: "B2C_ONBOARDING_LEAD",
    name: "B2C Pilgrim Onboarding Lead",
    description: "Leads Mosque activations, cooperative WefitSave drives, and pilgrim onboarding.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.B2C_ONBOARDING_LEAD || [])],
    isSystem: true,
  },
  {
    slug: "B2C_SUPPORT",
    name: "B2C Onboarding Support",
    description: "Guides pilgrims through KYC verification, savings setup, and booking support.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.B2C_SUPPORT || [])],
    isSystem: true,
  },
  {
    slug: "COMPLIANCE",
    name: "Fintech Reconciliation & KYC",
    description: "Reviews pilgrim KYC/utility bills, operator KYB, and daily BaaS reconciliation.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.COMPLIANCE || [])],
    isSystem: true,
  },
  {
    slug: "FINANCE",
    name: "Finance & Treasury",
    description: "Manages CASA float, operator escrow settlements, and commission configurations.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.FINANCE || [])],
    isSystem: true,
  },
  {
    slug: "TECHNICAL",
    name: "Developer",
    description: "Full-stack & mobile engineering, BaaS webhook diagnostics, and cron monitoring.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.TECHNICAL || [])],
    isSystem: true,
  },
  {
    slug: "SUPPORT",
    name: "Support Member",
    description: "Customer concierge and booking support representative.",
    permissions: [...(ROLE_DEFAULT_PERMISSIONS.SUPPORT || [])],
    isSystem: true,
  },
]

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Administrator request failed.")
  return payload as T
}

export function AdminAccessPanel() {
  const queryClient = useQueryClient()

  // Search & View state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null)
  const [memberDraftName, setMemberDraftName] = useState("")
  const [memberDraftRole, setMemberDraftRole] = useState("")
  const [memberDraftPermissions, setMemberDraftPermissions] = useState<string[]>([])

  // Modals
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [roleForm, setRoleForm] = useState<RoleFormState | null>(null)
  const [inviteEditor, setInviteEditor] = useState<InviteEditorState | null>(null)
  const [passwordEditor, setPasswordEditor] = useState<PasswordEditorState | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const [passwordError, setPasswordError] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const adminsQuery = useQuery({
    queryKey: ["admins"],
    queryFn: () => apiRequest<ManagedAdmin[]>("/api/admin/auth/admins"),
  })
  const catalogQuery = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => apiRequest<PermissionCatalog>("/api/admin/auth/permissions"),
  })

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["admins"] })
    void queryClient.invalidateQueries({ queryKey: ["permission-catalog"] })
  }

  const allPermissionDefs = useMemo<PermissionDefinition[]>(() => {
    if (catalogQuery.data?.definitions && catalogQuery.data.definitions.length > 0) {
      return catalogQuery.data.definitions
    }
    return PERMISSION_DEFINITIONS
  }, [catalogQuery.data?.definitions])

  const allPermissionKeys = useMemo(
    () => allPermissionDefs.map((d) => d.key),
    [allPermissionDefs],
  )

  const roleDefinitions = useMemo<RoleDefinition[]>(() => {
    if (catalogQuery.data?.roleDefinitions && catalogQuery.data.roleDefinitions.length > 0) {
      return catalogQuery.data.roleDefinitions
    }
    return FALLBACK_ROLE_DEFINITIONS
  }, [catalogQuery.data?.roleDefinitions])

  const getRoleDisplayName = (slug: string, email?: string) => {
    if (email === "admin@ufitgo.ng" || slug === "SUPER_ADMIN") return "Owner"
    const match = roleDefinitions.find((r) => r.slug === slug)
    if (match) return match.name
    return slug.replaceAll("_", " ")
  }

  const getRoleDefaultPermissions = (slug: string): string[] => {
    const match = roleDefinitions.find((r) => r.slug === slug)
    const raw = match?.permissions || ROLE_DEFAULT_PERMISSIONS[slug] || []
    if (raw.includes("*")) {
      return [...allPermissionKeys]
    }
    return [...raw]
  }

  const expandPermissions = (perms: string[] = []): string[] => {
    if (perms.includes("*")) return [...allPermissionKeys]
    return [...perms]
  }

  const selectedAdmin = useMemo(
    () => adminsQuery.data?.find((a) => a.id === selectedAdminId) || null,
    [adminsQuery.data, selectedAdminId],
  )

  const openManageMember = (admin: ManagedAdmin) => {
    setSelectedAdminId(admin.id)
    setMemberDraftName(admin.name)
    setMemberDraftRole(admin.role)
    setMemberDraftPermissions(expandPermissions(admin.permissions))
    setError("")
  }

  const mutation = useMutation({
    mutationFn: ({
      url,
      method = "POST",
      body,
    }: {
      url: string
      method?: string
      body?: unknown
    }) => apiRequest(url, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      refreshAll()
      setShowPermissionsModal(false)
      setInviteEditor(null)
      setRoleForm(null)
      setConfirmState(null)
      setError("")
      setNotice("Changes saved successfully.")
      window.setTimeout(() => setNotice(""), 4500)
    },
    onError: (requestError) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete request.",
      ),
  })

  const setPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      apiRequest<{ message: string }>(`/api/admin/auth/admins/${id}/set-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
    onSuccess: (payload, variables) => {
      setPasswordEditor(null)
      setPasswordError("")
      setNotice(payload?.message || `Password updated for admin #${variables.id}.`)
      window.setTimeout(() => setNotice(""), 6000)
    },
    onError: (requestError) =>
      setPasswordError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update password.",
      ),
  })

  function confirmPendingAction() {
    if (!confirmState) return
    if (confirmState.type === "delete") {
      mutation.mutate({
        url: `/api/admin/auth/admins/${confirmState.id}`,
        method: "DELETE",
      })
      if (selectedAdminId === confirmState.id) {
        setSelectedAdminId(null)
      }
    } else {
      mutation.mutate({
        url: `/api/admin/auth/admins/${confirmState.id}/toggle-status`,
      })
    }
  }

  function handleRoleChangeForMember(newRoleSlug: string) {
    setMemberDraftRole(newRoleSlug)
    setMemberDraftPermissions(getRoleDefaultPermissions(newRoleSlug))
  }

  function toggleMemberPermission(permKey: string) {
    setMemberDraftPermissions((prev) =>
      prev.includes(permKey)
        ? prev.filter((k) => k !== permKey)
        : [...prev, permKey],
    )
  }

  function saveMemberChanges() {
    if (!selectedAdmin) return
    const isFullWildcard =
      memberDraftRole === "SUPER_ADMIN" ||
      memberDraftPermissions.length >= allPermissionKeys.length
    mutation.mutate({
      url: `/api/admin/auth/admins/${selectedAdmin.id}`,
      method: "POST",
      body: {
        name: memberDraftName.trim() || selectedAdmin.name,
        email: selectedAdmin.email,
        role: memberDraftRole,
        permissions: isFullWildcard ? ["*"] : memberDraftPermissions,
      },
    })
  }

  function submitInvite() {
    if (!inviteEditor) return
    if (!inviteEditor.name.trim() || !inviteEditor.email.trim()) {
      return setError("Name and email are required.")
    }
    const isWildcard =
      inviteEditor.role === "SUPER_ADMIN" ||
      inviteEditor.permissions.length >= allPermissionKeys.length
    mutation.mutate({
      url: "/api/admin/auth/invite",
      method: "POST",
      body: {
        name: inviteEditor.name.trim(),
        email: inviteEditor.email.trim().toLowerCase(),
        role: inviteEditor.role,
        permissions: isWildcard ? ["*"] : inviteEditor.permissions,
      },
    })
  }

  function submitRoleForm() {
    if (!roleForm) return
    if (!roleForm.name.trim()) {
      return setError("Role name is required.")
    }
    const isWildcard = roleForm.permissions.length >= allPermissionKeys.length
    const capabilities = allPermissionDefs
      .filter((d) => isWildcard || roleForm.permissions.includes(d.key))
      .map((d) => d.capability)
      .slice(0, 8)

    mutation.mutate({
      url: roleForm.id
        ? `/api/admin/auth/roles/${roleForm.id}`
        : "/api/admin/auth/roles",
      method: "POST",
      body: {
        name: roleForm.name.trim(),
        slug: roleForm.slug.trim() || undefined,
        description: roleForm.description.trim(),
        permissions: isWildcard ? ["*"] : roleForm.permissions,
        capabilities,
        syncMembers: roleForm.syncMembers,
      },
    })
  }

  function submitPassword() {
    if (!passwordEditor) return
    if (
      passwordEditor.password.length < 8 ||
      !PASSWORD_RULE.test(passwordEditor.password)
    ) {
      return setPasswordError(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number or special character.",
      )
    }
    if (passwordEditor.password !== passwordEditor.confirm) {
      return setPasswordError("Passwords do not match.")
    }
    setPasswordMutation.mutate({
      id: passwordEditor.id,
      password: passwordEditor.password,
    })
  }

  // Compute human-readable capabilities for the currently selected member (Screenshot 2 right card)
  const activeMemberCapabilities = useMemo(() => {
    const matchedRole = roleDefinitions.find((r) => r.slug === memberDraftRole)
    const isWildcard =
      memberDraftRole === "SUPER_ADMIN" ||
      memberDraftPermissions.length >= allPermissionKeys.length
    if (isWildcard && matchedRole?.capabilities?.length) {
      return matchedRole.capabilities
    }
    const fromToggles = allPermissionDefs
      .filter((d) => isWildcard || memberDraftPermissions.includes(d.key))
      .map((d) => d.capability)
    if (fromToggles.length > 0) return fromToggles
    return matchedRole?.capabilities || [
      "Can access and update their personal information in their Profile",
    ]
  }, [
    memberDraftRole,
    memberDraftPermissions,
    roleDefinitions,
    allPermissionDefs,
    allPermissionKeys.length,
  ])

  const filteredAdmins = useMemo(() => {
    const list = adminsQuery.data || []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        getRoleDisplayName(a.role, a.email).toLowerCase().includes(q),
    )
  }, [adminsQuery.data, searchQuery, roleDefinitions])

  const loading = adminsQuery.isLoading || catalogQuery.isLoading
  const totalAdmins = adminsQuery.data?.length || 0

  return (
    <PermissionGate
      permissions={["settings.manage"]}
      fallback={
        <p className="text-sm text-[#a43229]">
          You do not have permission to manage team roles and access.
        </p>
      }
    >
      <div>
        {/* Top Settings Tab Header (Matching Screenshot 1 & 2) */}
        <div className="mb-6 border-b border-[#e2e8e5]">
          <h1 className="font-brand text-2xl font-bold text-[#17201c]">Settings</h1>
          <div className="mt-4 flex gap-8 text-sm font-semibold">
            <span className="border-b-2 border-[#07845f] pb-3 text-[#07845f]">
              Team Roles &amp; Access
            </span>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-4 py-3 text-sm text-[#9f261f]"
          >
            <CircleAlert className="size-4 shrink-0" /> {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg border border-[#cfeee0] bg-[#eaf9f3] px-4 py-3 text-sm text-[#0c6b50]"
          >
            <CheckCircle2 className="size-4 shrink-0" /> {notice}
          </p>
        )}

        {/* =====================================================================
            VIEW 2: MANAGE INDIVIDUAL TEAM MEMBER (Matches Screenshot 2)
           ===================================================================== */}
        {selectedAdmin ? (
          <div>
            <button
              type="button"
              onClick={() => setSelectedAdminId(null)}
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#07845f] hover:underline"
            >
              <ArrowLeft className="size-4" /> Go Back To Team Members
            </button>

            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              {/* Left Column: Member Role & Permission Actions */}
              <div className="space-y-8">
                <section className="rounded-2xl border border-[#e2e8e5] bg-white p-6 shadow-xs">
                  <h2 className="font-brand text-xl font-bold text-[#17201c]">
                    Manage team member
                  </h2>
                  <p className="mt-1.5 text-sm text-[#68716d]">
                    Here you can change this team member&apos;s role and grant them
                    additional permissions.
                  </p>

                  <div className="mt-6 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#68716d]">
                        Team member&apos;s full name
                      </label>
                      <Input
                        value={memberDraftName}
                        onChange={(e) => setMemberDraftName(e.target.value)}
                        disabled={selectedAdmin.email === "admin@ufitgo.ng"}
                        className="mt-2 h-11 bg-[#f8faf9]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#68716d]">
                        Team member&apos;s role
                      </label>
                      <select
                        value={memberDraftRole}
                        onChange={(e) => handleRoleChangeForMember(e.target.value)}
                        disabled={selectedAdmin.email === "admin@ufitgo.ng"}
                        className="mt-2 h-11 w-full rounded-lg border border-[#d9dfdc] bg-white px-3 text-sm font-medium text-[#17201c] focus:border-[#07845f] focus:outline-none disabled:bg-[#f3f5f4]"
                      >
                        {roleDefinitions.map((r) => (
                          <option key={r.slug} value={r.slug}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedAdmin.email !== "admin@ufitgo.ng" && (
                      <div className="flex justify-end">
                        <Button
                          onClick={saveMemberChanges}
                          disabled={mutation.isPending}
                          className="h-10 rounded-lg bg-[#07845f] px-6 text-white hover:bg-[#066c4e]"
                        >
                          {mutation.isPending ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="my-7 border-t border-[#edf1ef]" />

                  <div>
                    <h3 className="font-brand text-base font-bold text-[#17201c]">
                      Manage team member roles and permissions
                    </h3>
                    <p className="mt-1 text-sm text-[#68716d]">
                      Here you can change this team member&apos;s roles and
                      permissions. You can also grant them additional permissions.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        onClick={() => setShowPermissionsModal(true)}
                        disabled={selectedAdmin.email === "admin@ufitgo.ng"}
                        className="h-10 rounded-lg bg-[#07845f] px-4 text-white hover:bg-[#066c4e]"
                      >
                        <UserCog className="mr-2 size-4" />
                        Manage Roles And Permissions
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() =>
                          setPasswordEditor({
                            id: selectedAdmin.id,
                            name: selectedAdmin.name,
                            password: "",
                            confirm: "",
                            showPassword: false,
                          })
                        }
                        className="h-10 rounded-lg border-[#d9dfdc] text-[#17201c]"
                      >
                        <KeyRound className="mr-2 size-4 text-[#07845f]" />
                        Set Password
                      </Button>

                      {selectedAdmin.email !== "admin@ufitgo.ng" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setConfirmState({
                                type: "toggle",
                                id: selectedAdmin.id,
                                name: selectedAdmin.name,
                                isActive: selectedAdmin.isActive,
                              })
                            }
                            className="h-10 rounded-lg border-[#f1d9a8] text-[#8a6500] hover:bg-[#fff6e0]"
                          >
                            {selectedAdmin.isActive ? (
                              <>
                                <Ban className="mr-2 size-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 size-4" /> Activate
                              </>
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() =>
                              setConfirmState({
                                type: "delete",
                                id: selectedAdmin.id,
                                name: selectedAdmin.name,
                              })
                            }
                            className="h-10 rounded-lg border-[#f4c7c3] text-[#a43229] hover:bg-[#fff0ee]"
                          >
                            <Trash2 className="mr-2 size-4" /> Remove
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: "The [Role] can access:" Green Summary Card (Screenshot 2) */}
              <aside className="overflow-hidden rounded-2xl border border-[#d6ebe1] bg-white shadow-xs">
                <div className="bg-[#dff7ee] px-6 py-4">
                  <h3 className="text-sm font-bold text-[#0c6b50]">
                    The {getRoleDisplayName(memberDraftRole, selectedAdmin.email)} can
                    access:
                  </h3>
                </div>
                <div className="divide-y divide-[#edf2ef] px-6">
                  {activeMemberCapabilities.map((item, idx) => (
                    <div
                      key={`${idx}-${item}`}
                      className="py-4 text-sm leading-relaxed text-[#25312c]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          /* =====================================================================
              VIEW 1: TEAM MEMBERS DIRECTORY TABLE (Matches Screenshot 1)
             ===================================================================== */
          <div>
            <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <h2 className="font-brand text-xl font-bold text-[#17201c]">
                Manage Team Members ({totalAdmins}/25)
              </h2>
            </div>

            {/* Search Bar + View Roles + Invite Member */}
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8d9692]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search using team member's name"
                  className="h-11 rounded-lg border-[#d9dfdc] bg-white pl-10 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRolesModal(true)
                    setRoleForm(null)
                  }}
                  className="h-11 rounded-lg border-[#07845f] bg-white px-4 font-semibold text-[#07845f] hover:bg-[#eaf9f3]"
                >
                  <Network className="mr-2 size-4" />
                  View Roles ({roleDefinitions.length})
                </Button>

                <Button
                  onClick={() =>
                    setInviteEditor({
                      name: "",
                      email: "",
                      role: "HEAD_OF_OPERATIONS",
                      permissions: getRoleDefaultPermissions("HEAD_OF_OPERATIONS"),
                    })
                  }
                  className="h-11 rounded-lg bg-[#07845f] px-5 font-semibold text-white hover:bg-[#066c4e]"
                >
                  <Plus className="mr-2 size-4" />
                  Invite Team Member
                </Button>
              </div>
            </div>

            {/* Team Members Table */}
            {loading ? (
              <div className="grid min-h-48 place-items-center rounded-2xl border border-[#e2e8e5] bg-white">
                <LoaderCircle className="size-6 animate-spin text-[#07845f]" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#e2e8e5] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e8eeeb] bg-[#fbfcfb] text-xs font-bold text-[#17201c]">
                        <th className="px-6 py-4">Team Member</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2ef]">
                      {filteredAdmins.map((admin) => {
                        const isOwner = admin.email === "admin@ufitgo.ng"
                        return (
                          <tr
                            key={admin.id}
                            className="transition-colors hover:bg-[#f8fbf9]"
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-[#17201c]">
                                {admin.name}
                              </div>
                              <div className="text-xs text-[#68716d]">
                                {admin.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#25312c]">
                              {getRoleDisplayName(admin.role, admin.email)}
                            </td>
                            <td className="px-6 py-4">
                              {admin.isActive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84c5ab] bg-[#f2fbf7] px-3 py-1 text-xs font-semibold text-[#07845f]">
                                  Active <CheckCircle2 className="size-3.5" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9dfdc] bg-[#f4f6f5] px-3 py-1 text-xs font-semibold text-[#68716d]">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isOwner ? (
                                <span className="text-xs font-semibold text-[#68716d]">
                                  Full Owner Access
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => openManageMember(admin)}
                                  className="h-9 rounded-lg border-[#84c5ab] bg-white px-3.5 text-xs font-semibold text-[#07845f] hover:bg-[#eaf9f3]"
                                >
                                  <Settings className="mr-1.5 size-3.5" />
                                  Manage
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            VIEW 3: ROLE & GRANULAR PERMISSIONS TOGGLE MODAL (Screenshot 3)
           ===================================================================== */}
        {showPermissionsModal && selectedAdmin && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-[#17201c]/40 backdrop-blur-[1px]"
            role="dialog"
            aria-modal="true"
            aria-label="Manage Roles and Permissions"
          >
            <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#e8eeeb] px-6 py-5">
                <div>
                  <h2 className="font-brand text-lg font-bold text-[#17201c]">
                    {selectedAdmin.name}
                  </h2>
                  <p className="text-xs text-[#68716d]">{selectedAdmin.email}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setShowPermissionsModal(false)}
                  className="rounded-lg p-1 text-[#68716d] hover:bg-[#f2f5f3]"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Scrollable Body: Role Dropdown + Toggle Switches */}
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#17201c]">
                    Role
                  </label>
                  <select
                    value={memberDraftRole}
                    onChange={(e) => handleRoleChangeForMember(e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-[#d9dfdc] bg-white px-3 text-sm font-medium text-[#17201c] focus:border-[#07845f] focus:outline-none"
                  >
                    {roleDefinitions.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-[#68716d]">
                    Selecting a role pre-fills its default permissions below. Toggle
                    any switch to grant or remove individual permissions for{" "}
                    {selectedAdmin.name}.
                  </p>
                </div>

                {/* Permission Toggle Switches */}
                <div className="divide-y divide-[#edf2ef] rounded-xl border border-[#e2e8e5] bg-white">
                  {allPermissionDefs.map((perm) => {
                    const enabled =
                      memberDraftRole === "SUPER_ADMIN" ||
                      memberDraftPermissions.includes(perm.key)
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between gap-4 px-4 py-3.5"
                      >
                        <div>
                          <div className="text-sm font-medium text-[#17201c]">
                            {perm.label}
                          </div>
                          <div className="text-xs text-[#68716d]">
                            {perm.group} · {perm.key}
                          </div>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => toggleMemberPermission(perm.key)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            enabled ? "bg-[#07845f]" : "bg-[#d5dcd9]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                              enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end gap-3 border-t border-[#e8eeeb] bg-[#fbfcfb] px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPermissionsModal(false)}
                  className="h-10 rounded-lg border-[#07845f] px-5 text-[#07845f]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMemberChanges}
                  disabled={mutation.isPending}
                  className="h-10 rounded-lg bg-[#07845f] px-6 text-white hover:bg-[#066c4e]"
                >
                  {mutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            VIEW ROLES & CREATE/EDIT CUSTOM ROLE MODAL
           ===================================================================== */}
        {showRolesModal && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Manage Roles"
          >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e8eeeb] px-6 py-4">
                <div>
                  <h2 className="font-brand text-xl font-bold text-[#17201c]">
                    {roleForm
                      ? roleForm.id
                        ? `Edit Role: ${roleForm.name}`
                        : "Create Custom Role"
                      : "Organization Roles & Default Permissions"}
                  </h2>
                  <p className="text-xs text-[#68716d]">
                    Create custom roles for your departments and configure their default
                    permissions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRolesModal(false)
                    setRoleForm(null)
                  }}
                >
                  <X className="size-5 text-[#68716d]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {roleForm ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#68716d]">
                          Role Title
                        </label>
                        <Input
                          value={roleForm.name}
                          onChange={(e) =>
                            setRoleForm({ ...roleForm, name: e.target.value })
                          }
                          placeholder="e.g. Regional B2B Manager"
                          className="mt-1.5 h-10 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#68716d]">
                          Description
                        </label>
                        <Input
                          value={roleForm.description}
                          onChange={(e) =>
                            setRoleForm({
                              ...roleForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="What this role is responsible for"
                          className="mt-1.5 h-10 bg-white"
                        />
                      </div>
                    </div>

                    {roleForm.id && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#0c6b50]">
                        <input
                          type="checkbox"
                          checked={roleForm.syncMembers}
                          onChange={(e) =>
                            setRoleForm({
                              ...roleForm,
                              syncMembers: e.target.checked,
                            })
                          }
                        />
                        Also update existing team members currently assigned to this
                        role
                      </label>
                    )}

                    <div className="divide-y divide-[#edf2ef] rounded-xl border border-[#e2e8e5]">
                      {allPermissionDefs.map((perm) => {
                        const checked = roleForm.permissions.includes(perm.key)
                        return (
                          <div
                            key={perm.key}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div>
                              <div className="text-sm font-medium text-[#17201c]">
                                {perm.label}
                              </div>
                              <div className="text-xs text-[#68716d]">
                                {perm.capability}
                              </div>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={checked}
                              onClick={() =>
                                setRoleForm((prev) => {
                                  if (!prev) return prev
                                  const next = prev.permissions.includes(perm.key)
                                    ? prev.permissions.filter((k) => k !== perm.key)
                                    : [...prev.permissions, perm.key]
                                  return { ...prev, permissions: next }
                                })
                              }
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                                checked ? "bg-[#07845f]" : "bg-[#d5dcd9]"
                              }`}
                            >
                              <span
                                className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition ${
                                  checked ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <Button
                        onClick={() =>
                          setRoleForm({
                            name: "",
                            slug: "",
                            description: "",
                            permissions: ["users.manage", "bookings.manage"],
                            syncMembers: true,
                          })
                        }
                        className="h-9 rounded-lg bg-[#07845f] px-4 text-xs font-semibold text-white"
                      >
                        <Plus className="mr-1.5 size-4" /> Create New Role
                      </Button>
                    </div>

                    {roleDefinitions.map((r) => (
                      <div
                        key={r.slug}
                        className="flex flex-col justify-between gap-3 rounded-xl border border-[#e2e8e5] p-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#17201c]">
                              {r.name}
                            </span>
                            <span className="rounded bg-[#f0f4f2] px-2 py-0.5 text-[11px] font-semibold text-[#5a6560]">
                              {r.slug}
                            </span>
                          </div>
                          {r.description && (
                            <p className="mt-1 text-xs text-[#68716d]">
                              {r.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs font-semibold text-[#07845f]">
                            {r.permissions.includes("*")
                              ? "All platform permissions"
                              : `${r.permissions.length} default permissions`}
                          </p>
                        </div>

                        {r.slug !== "SUPER_ADMIN" && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                setRoleForm({
                                  id: r.id,
                                  name: r.name,
                                  slug: r.slug,
                                  description: r.description || "",
                                  permissions: r.permissions.includes("*")
                                    ? [...allPermissionKeys]
                                    : [...r.permissions],
                                  syncMembers: true,
                                })
                              }
                              className="h-8 rounded-lg px-3 text-xs"
                            >
                              Edit Permissions
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#e8eeeb] bg-[#fbfcfb] px-6 py-4">
                {roleForm ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRoleForm(null)}
                      className="h-10 rounded-lg"
                    >
                      Back to Roles
                    </Button>
                    <Button
                      onClick={submitRoleForm}
                      disabled={mutation.isPending}
                      className="h-10 rounded-lg bg-[#07845f] px-5 text-white"
                    >
                      {mutation.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        "Save Role"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowRolesModal(false)}
                    className="h-10 rounded-lg"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INVITE NEW TEAM MEMBER MODAL
           ===================================================================== */}
        {inviteEditor && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Invite Team Member"
          >
            <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#dbe2de] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e8eeeb] px-6 py-4">
                <div>
                  <h2 className="font-brand text-xl font-bold text-[#17201c]">
                    Invite Team Member
                  </h2>
                  <p className="text-xs text-[#68716d]">
                    Assign a role and customize their permissions before sending the
                    invite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteEditor(null)}
                  className="text-[#68716d]"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#68716d]">
                      Full Name
                    </label>
                    <Input
                      value={inviteEditor.name}
                      onChange={(e) =>
                        setInviteEditor({ ...inviteEditor, name: e.target.value })
                      }
                      placeholder="e.g. Ade Atinuke"
                      className="mt-1.5 h-10 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#68716d]">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={inviteEditor.email}
                      onChange={(e) =>
                        setInviteEditor({ ...inviteEditor, email: e.target.value })
                      }
                      placeholder="name@ufitgo.ng"
                      className="mt-1.5 h-10 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#68716d]">
                    Role
                  </label>
                  <select
                    value={inviteEditor.role}
                    onChange={(e) => {
                      const nextRole = e.target.value
                      setInviteEditor({
                        ...inviteEditor,
                        role: nextRole,
                        permissions: getRoleDefaultPermissions(nextRole),
                      })
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-[#d9dfdc] bg-white px-3 text-sm font-medium text-[#17201c]"
                  >
                    {roleDefinitions.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="divide-y divide-[#edf2ef] rounded-xl border border-[#e2e8e5]">
                  {allPermissionDefs.map((perm) => {
                    const checked = inviteEditor.permissions.includes(perm.key)
                    return (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-[#17201c]">
                            {perm.label}
                          </div>
                          <div className="text-xs text-[#68716d]">
                            {perm.group}
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          onClick={() =>
                            setInviteEditor((prev) => {
                              if (!prev) return prev
                              const next = prev.permissions.includes(perm.key)
                                ? prev.permissions.filter((k) => k !== perm.key)
                                : [...prev.permissions, perm.key]
                              return { ...prev, permissions: next }
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            checked ? "bg-[#07845f]" : "bg-[#d5dcd9]"
                          }`}
                        >
                          <span
                            className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition ${
                              checked ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#e8eeeb] bg-[#fbfcfb] px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => setInviteEditor(null)}
                  className="h-10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitInvite}
                  disabled={mutation.isPending}
                  className="h-10 rounded-lg bg-[#07845f] px-5 text-white"
                >
                  {mutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Set Password Modal */}
        {passwordEditor && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Set administrator password"
          >
            <div className="w-full max-w-md rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#07845f]">
                    Set password
                  </p>
                  <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">
                    {passwordEditor.name}
                  </h2>
                </div>
                <button
                  aria-label="Close"
                  onClick={() => {
                    setPasswordEditor(null)
                    setPasswordError("")
                  }}
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-[#68716d]">
                This immediately replaces the administrator&apos;s current password
                and signs them out of all active sessions.
              </p>
              {passwordError && (
                <p
                  role="alert"
                  className="mt-3 flex items-center gap-2 rounded-lg border border-[#f4c7c3] bg-[#fff4f2] px-3 py-2 text-xs text-[#9f261f]"
                >
                  <CircleAlert className="size-4 shrink-0" /> {passwordError}
                </p>
              )}
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#68716d]">
                New password
                <div className="relative mt-2">
                  <Input
                    type={passwordEditor.showPassword ? "text" : "password"}
                    value={passwordEditor.password}
                    onChange={(event) =>
                      setPasswordEditor({
                        ...passwordEditor,
                        password: event.target.value,
                      })
                    }
                    className="h-11 bg-white pr-10"
                  />
                  <button
                    type="button"
                    aria-label={
                      passwordEditor.showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() =>
                      setPasswordEditor({
                        ...passwordEditor,
                        showPassword: !passwordEditor.showPassword,
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa19e]"
                  >
                    {passwordEditor.showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </label>
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#68716d]">
                Confirm password
                <Input
                  type={passwordEditor.showPassword ? "text" : "password"}
                  value={passwordEditor.confirm}
                  onChange={(event) =>
                    setPasswordEditor({
                      ...passwordEditor,
                      confirm: event.target.value,
                    })
                  }
                  className="mt-2 h-11 bg-white"
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPasswordEditor(null)
                    setPasswordError("")
                  }}
                  className="h-10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitPassword}
                  disabled={setPasswordMutation.isPending}
                  className="h-10 rounded-lg bg-[#07845f] px-5 text-white"
                >
                  {setPasswordMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    "Update password"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Deactivate / Delete Modal */}
        {confirmState && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-[#17201c]/35 p-5"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm action"
          >
            <div className="w-full max-w-md rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-[11px] font-bold uppercase tracking-[0.1em] ${
                      confirmState.type === "delete"
                        ? "text-[#a43229]"
                        : "text-[#8a6500]"
                    }`}
                  >
                    {confirmState.type === "delete"
                      ? "Remove team member"
                      : confirmState.isActive
                        ? "Deactivate team member"
                        : "Activate team member"}
                  </p>
                  <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">
                    {confirmState.name}
                  </h2>
                </div>
                <button
                  aria-label="Close"
                  onClick={() => setConfirmState(null)}
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-[#68716d]">
                {confirmState.type === "delete"
                  ? "This permanently removes the administrator account and cannot be undone."
                  : confirmState.isActive
                    ? "This immediately signs them out and blocks access until reactivated."
                    : "This restores their access to the admin dashboard."}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setConfirmState(null)}
                  className="h-10 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmPendingAction}
                  disabled={mutation.isPending}
                  className={`h-10 rounded-lg px-5 text-white ${
                    confirmState.type === "delete"
                      ? "bg-[#a43229] hover:bg-[#8c2a22]"
                      : "bg-[#07845f] hover:bg-[#066c4e]"
                  }`}
                >
                  {mutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : confirmState.type === "delete" ? (
                    "Remove"
                  ) : confirmState.isActive ? (
                    "Deactivate"
                  ) : (
                    "Activate"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}

