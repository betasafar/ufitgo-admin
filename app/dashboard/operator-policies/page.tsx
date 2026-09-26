"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Eye,
  FileText,
  PencilLine,
  Send,
  X,
} from "lucide-react";
import { RichPolicyEditor } from "@/components/policies/rich-policy-editor";

type Policy = {
  id: string;
  title: string;
  version: number;
  content: string;
  contentFormat?: "plain_text" | "rich_text";
  status: "draft" | "published" | "archived";
  operatorId?: number | null;
  ownerType: "platform" | "operator";
};

type Operator = {
  id: string | number;
  companyName?: string;
  tradingName?: string;
  email?: string;
  isActive?: boolean;
};
type PolicyTemplate = {
  id: string;
  name: string;
  scenario: string;
  titleTemplate: string;
  contentTemplate: string;
  version: number;
};
type PolicyDraft = {
  id: string;
  title: string;
  operatorId: number;
  status: string;
  revision: number;
};
type DraftAccess = {
  id: string;
  accessScope: "restricted" | "operator_organisation";
  permission: "view" | "edit";
  acceptedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
};
type DraftApproval = {
  id: string;
  revision: number;
  contentHash: string;
  signatoryName: string;
  signatoryRole: string;
  createdAt: string;
};

type PolicyWorkspaceTab = "create" | "templates" | "drafts" | "published";

const MARKETPLACE_TEMPLATE = `UfitGo Marketplace Disclaimer

1. UfitGo's role
UfitGo provides a marketplace and payment-facilitation platform. The named operator sells and fulfils each package.

2. Operator policy and booking acceptance
Before payment, customers must review and accept the operator's cancellation and refund policy.

3. Support and escalation
Customers can contact UfitGo for marketplace support and escalation.`;

const TEMPLATE_SUMMARIES: Record<string, string> = {
  flexible_cancellation: "Flexible foundation with a clear refund timetable.",
  strict_supplier_costs:
    "Strict foundation for committed supplier costs and limited refund windows.",
  promotional_final_sale:
    "Promotional and final-sale terms with required exceptions.",
  visa_flight_multi_supplier:
    "Travel foundation for visa, flight, hotel, and supplier outcomes.",
};

function defaultInviteExpiry() {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function operatorLegalName(operator?: Operator) {
  return operator?.companyName || operator?.tradingName || "";
}

function expandOperatorPlaceholders(value: string, operator?: Operator) {
  const legalName = operatorLegalName(operator);
  return legalName ? value.replaceAll("[Operator legal name]", legalName) : value;
}

function activityActor(event: { actorType?: string; actorId?: string | null }) {
  if (event.actorType === "operator") return "Operator";
  if (event.actorType === "admin") return event.actorId?.replace(/^admin:/, "") || "UfitGo Admin";
  return "UfitGo system";
}

function relativeActivityTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function OperatorPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [drafts, setDrafts] = useState<PolicyDraft[]>([]);
  const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [kind, setKind] = useState<"operator" | "platform">("operator");
  const [activeTab, setActiveTab] = useState<PolicyWorkspaceTab>("create");
  const [operatorId, setOperatorId] = useState("");
  const [operatorQuery, setOperatorQuery] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<PolicyTemplate | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editorDocumentKey, setEditorDocumentKey] = useState(0);
  const [form, setForm] = useState({ title: "", content: "", contentFormat: "plain_text" as "plain_text" | "rich_text" });
  const [editingDraft, setEditingDraft] = useState<{ id: string; revision: number } | null>(null);
  const [draftChangeSummary, setDraftChangeSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    content: string;
    contentFormat: "plain_text" | "rich_text";
    ownerType: "operator" | "platform";
    operatorId?: number | null;
  } | null>(null);
  const [correction, setCorrection] = useState<{
    policy: Policy;
    title: string;
    content: string;
    contentFormat: "plain_text" | "rich_text";
    reason: string;
  } | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [publishingDraft, setPublishingDraft] = useState(false);
  const [sharing, setSharing] = useState<{
    draft: PolicyDraft;
    accessScope: "restricted" | "operator_organisation";
    permission: "view" | "edit";
    expiresAt: string;
    access: DraftAccess[];
    activity: Array<{ id: string; eventType: string; actorType?: string; actorId?: string | null; createdAt: string; metadata?: { revision?: number; changeSummary?: string | null } }>;
    approvals: DraftApproval[];
    reviewUrl?: string;
  } | null>(null);

  const selectedOperator = operators.find(
    (operator) => String(operator.id) === operatorId,
  );
  const matchedOperators = useMemo(() => {
    const query = operatorQuery.trim().toLowerCase();
    return operators
      .filter(
        (operator) =>
          !query ||
          [operator.companyName, operator.tradingName, operator.email].some(
            (value) => value?.toLowerCase().includes(query),
          ),
      )
      .slice(0, 8);
  }, [operators, operatorQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const [
        policyResponse,
        draftResponse,
        templateResponse,
        operatorResponse,
      ] = await Promise.all([
        fetch("/api/admin/operator-policies", { cache: "no-store" }),
        fetch("/api/admin/operator-policy-drafts", { cache: "no-store" }),
        fetch("/api/admin/operator-policy-templates", { cache: "no-store" }),
        fetch("/api/admin/operator-auth/operators?limit=100", {
          cache: "no-store",
        }),
      ]);
      const [policyPayload, draftPayload, templatePayload, operatorPayload] =
        await Promise.all([
          policyResponse.json(),
          draftResponse.json(),
          templateResponse.json(),
          operatorResponse.json(),
        ]);
      setPolicies(Array.isArray(policyPayload?.data) ? policyPayload.data : []);
      setDrafts(Array.isArray(draftPayload?.data) ? draftPayload.data : []);
      setTemplates(
        Array.isArray(templatePayload?.data) ? templatePayload.data : [],
      );
      const list = Array.isArray(operatorPayload?.data)
        ? operatorPayload.data
        : Array.isArray(operatorPayload)
          ? operatorPayload
          : [];
      setOperators(
        list.filter((operator: Operator) => operator.isActive !== false),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function selectKind(nextKind: "operator" | "platform") {
    setKind(nextKind);
    setEditingDraft(null);
    setDraftChangeSummary("");
    setTemplateId("");
    setForm(
      nextKind === "platform"
        ? {
            title: "UfitGo Marketplace Disclaimer",
            content: MARKETPLACE_TEMPLATE,
            contentFormat: "plain_text",
          }
        : { title: "", content: "", contentFormat: "plain_text" },
    );
    setEditorDocumentKey((current) => current + 1);
  }

  function applyTemplate(template: PolicyTemplate) {
    setTemplateId(template.id);
    setForm({
      title: expandOperatorPlaceholders(template.titleTemplate, selectedOperator),
      content: expandOperatorPlaceholders(template.contentTemplate, selectedOperator),
      contentFormat: "plain_text",
    });
    setEditorDocumentKey((current) => current + 1);
  }

  function startBlankDraft() {
    setEditingDraft(null);
    setDraftChangeSummary("");
    setTemplateId("");
    setForm({ title: "", content: "", contentFormat: "plain_text" });
    setEditorDocumentKey((current) => current + 1);
  }

  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault();
    if (!editingTemplate) return;
    setSavingTemplate(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/operator-policy-templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTemplate.name,
          titleTemplate: editingTemplate.titleTemplate,
          contentTemplate: editingTemplate.contentTemplate,
          expectedVersion: editingTemplate.version,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to update policy template");
      setEditingTemplate(null);
      setMessage("Policy template updated. New drafts will use the revised wording.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update policy template");
    } finally {
      setSavingTemplate(false);
    }
  }

  function useAsTemplate(policy: Policy) {
    setActiveTab("create");
    setKind(policy.ownerType);
    setOperatorId(policy.operatorId ? String(policy.operatorId) : "");
    setTemplateId("");
    setForm({ title: policy.title, content: policy.content, contentFormat: policy.contentFormat || "plain_text" });
    setEditorDocumentKey((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (kind === "operator" && !operatorId) {
      setMessage("Choose the operator this policy belongs to.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const isOperator = kind === "operator";
      const response = await fetch(
        editingDraft
          ? `/api/admin/operator-policy-drafts/${editingDraft.id}`
          : isOperator
            ? "/api/admin/operator-policy-drafts"
          : "/api/admin/operator-policies",
        {
          method: editingDraft ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingDraft
              ? {
                  title: form.title,
                  content: form.content,
                  contentFormat: form.contentFormat,
                  expectedRevision: editingDraft.revision,
                  changeSummary: draftChangeSummary,
                }
              : isOperator
              ? {
                  operatorId: Number(operatorId),
                  title: form.title,
                  content: form.content,
                  contentFormat: form.contentFormat,
                  sourceTemplateId: templateId || undefined,
                }
              : {
                  title: form.title,
                  content: form.content,
                  contentFormat: form.contentFormat,
                  ownerType: "platform",
                  policyType: "ufitgo_marketplace_terms",
                },
          ),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to save policy");
      setMessage(
        editingDraft
          ? "Draft revision saved and recorded in the audit history."
          : isOperator
          ? "Operator policy draft saved. Sharing and operator approval are the next workflow phase."
          : "UfitGo disclaimer draft saved. Preview it before publishing.",
      );
      setTemplateId("");
      setEditingDraft(null);
      setDraftChangeSummary("");
      setForm(
        isOperator
          ? { title: "", content: "", contentFormat: "plain_text" }
          : { title: "", content: MARKETPLACE_TEMPLATE, contentFormat: "plain_text" },
      );
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save policy",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishPolicy(id: string) {
    const response = await fetch(`/api/admin/operator-policies/${id}/publish`, {
      method: "PATCH",
    });
    if (response.ok) await loadData();
  }

  async function openSharing(draft: PolicyDraft) {
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/operator-policy-drafts/${draft.id}`,
        { cache: "no-store" },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to load sharing settings");
      setSharing({
        draft: payload?.data?.draft || draft,
        accessScope: "restricted",
        permission: "edit",
        expiresAt: defaultInviteExpiry(),
        access: Array.isArray(payload?.data?.access) ? payload.data.access : [],
        activity: Array.isArray(payload?.data?.auditEvents) ? payload.data.auditEvents : [],
        approvals: Array.isArray(payload?.data?.approvals) ? payload.data.approvals : [],
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load sharing settings",
      );
    }
  }

  async function editDraft(draft: PolicyDraft) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/operator-policy-drafts/${draft.id}`, { cache: "no-store" });
      const payload = await response.json();
      const current = payload?.data?.draft;
      if (!response.ok || !current) throw new Error(payload?.message || "Unable to load policy draft");
      setKind("operator");
      setOperatorId(String(current.operatorId));
      setOperatorQuery("");
      setTemplateId(current.sourceTemplateId || "");
      setForm({ title: current.title, content: current.content, contentFormat: current.contentFormat || "plain_text" });
      setEditingDraft({ id: current.id, revision: current.revision });
      setDraftChangeSummary("");
      setEditorDocumentKey((key) => key + 1);
      setActiveTab("create");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load policy draft");
    }
  }

  async function shareDraft() {
    if (!sharing) return;
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/operator-policy-drafts/${sharing.draft.id}/share`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessScope: sharing.accessScope,
            permission: sharing.permission,
            expiresAt: sharing.expiresAt
              ? new Date(`${sharing.expiresAt}T23:59:59`).toISOString()
              : null,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to share draft");
      setSharing((current) => current ? { ...current, reviewUrl: payload?.data?.reviewUrl } : current);
      setMessage(
        `Draft shared for ${sharing.permission === "edit" ? "editing" : "viewing"}. The operator received a secure portal notification and email.`,
      );
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to share draft",
      );
    }
  }

  async function copyReviewLink() {
    if (!sharing?.reviewUrl || sharing.accessScope !== "restricted") return;
    try {
      await navigator.clipboard.writeText(sharing.reviewUrl);
      setMessage("Secure review link copied. It still requires the invited operator to sign in.");
    } catch {
      setMessage("Unable to copy the secure review link.");
    }
  }

  async function revokeDraftAccess(accessId: string) {
    if (!sharing) return;
    const response = await fetch(
      `/api/admin/operator-policy-drafts/${sharing.draft.id}/access/${accessId}/revoke`,
      { method: "PATCH" },
    );
    if (!response.ok) {
      setMessage("Unable to revoke access");
      return;
    }
    await openSharing(sharing.draft);
    setMessage("Operator access revoked.");
  }

  async function requestChanges() {
    if (!sharing) return;
    const response = await fetch(`/api/admin/operator-policy-drafts/${sharing.draft.id}/request-changes`, { method: "POST" });
    if (!response.ok) {
      setMessage("Unable to request policy changes.");
      return;
    }
    setSharing(null);
    setMessage("Changes requested from the operator.");
    await loadData();
  }

  async function publishApprovedDraft() {
    if (!sharing || !window.confirm("Publish this approved policy? Published wording will become immutable.")) return;
    setPublishingDraft(true);
    try {
      const response = await fetch(`/api/admin/operator-policy-drafts/${sharing.draft.id}/publish`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Unable to publish approved policy");
      setSharing(null);
      setMessage("Approved operator policy published as an immutable version.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish approved policy");
    } finally {
      setPublishingDraft(false);
    }
  }

  async function archivePolicy(policy: Policy) {
    if (
      !window.confirm(
        `Archive ${policy.title} v${policy.version}? Existing booking evidence will remain unchanged.`,
      )
    )
      return;
    const response = await fetch(
      `/api/admin/operator-policies/${policy.id}/archive`,
      { method: "PATCH" },
    );
    if (!response.ok) setMessage("Unable to archive policy");
    else {
      setMessage("Policy archived.");
      await loadData();
    }
  }

  async function submitCorrection(event: React.FormEvent) {
    event.preventDefault();
    if (!correction) return;
    setCorrecting(true);
    try {
      const response = await fetch(
        `/api/admin/operator-policies/${correction.policy.id}/correct`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: correction.title,
            content: correction.content,
            contentFormat: correction.contentFormat,
            correctionReason: correction.reason,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.message || "Unable to publish correction");
      setCorrection(null);
      setMessage(
        `Correction published. ${payload?.data?.reassignedPackageCount || 0} package assignment(s) moved to the new version.`,
      );
      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to publish correction",
      );
    } finally {
      setCorrecting(false);
    }
  }

  return (
    <main className="space-y-7 p-4 sm:p-8">
      <header className="max-w-5xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">
          Administration
        </p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">
          Operator policies
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68716d]">
          Create marketplace disclaimers and mobile-friendly operator policy
          drafts. Operator drafts will be shared for review and approval before
          Admin publication.
        </p>
      </header>

      <nav className="flex max-w-5xl gap-1 overflow-x-auto border-b border-[#dbe2de]" aria-label="Policy workspace">
        {([
          ["create", "Create policy"],
          ["templates", "Templates"],
          ["drafts", "Drafts and review"],
          ["published", "Published policies"],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold ${activeTab === tab ? "border-[#0d7d5f] text-[#0d7d5f]" : "border-transparent text-[#52605a] hover:text-[#17201c]"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "create" && <section className="max-w-5xl bg-white px-0 py-1 sm:px-0">
        <div>
          <h2 className="font-brand text-xl font-bold text-[#17201c]">Create a policy</h2>
          <p className="mt-1 text-sm text-[#68716d]">Choose the policy owner, then use a starting point or author from scratch.</p>
          {editingDraft && <p className="mt-3 bg-[#eaf9f3] px-3 py-2 text-sm text-[#17201c]">Editing draft revision {editingDraft.revision}. Saving creates a new auditable revision.</p>}
        </div>
        <div
          className="mt-5 inline-flex rounded-lg bg-[#edf3f0] p-1"
          role="group"
          aria-label="Policy type"
        >
          <button
            type="button"
            onClick={() => selectKind("operator")}
            className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${kind === "operator" ? "bg-white text-[#0d7d5f] shadow-sm" : "text-[#52605a] hover:text-[#17201c]"}`}
          >
            Operator policy
          </button>
          <button
            type="button"
            onClick={() => selectKind("platform")}
            className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${kind === "platform" ? "bg-white text-[#0d7d5f] shadow-sm" : "text-[#52605a] hover:text-[#17201c]"}`}
          >
            UfitGo disclaimer
          </button>
        </div>

        <form onSubmit={saveDraft} className="mt-6 grid max-w-4xl gap-7">
          {kind === "operator" && (
            <div className="grid gap-3">
              <label className="text-sm font-bold text-[#35443e]">
                Choose operator
                <input
                  value={operatorQuery}
                  onChange={(event) => setOperatorQuery(event.target.value)}
                  placeholder="Search company, trading name, or email"
                  className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]"
                />
              </label>
              {operatorQuery && (
                <div className="max-h-52 overflow-y-auto border border-[#dbe2de] bg-white">
                  {matchedOperators.map((operator) => (
                    <button
                      key={operator.id}
                      type="button"
                      onClick={() => {
                        setOperatorId(String(operator.id));
                        setOperatorQuery("");
                        setForm((current) => ({
                          ...current,
                          title: expandOperatorPlaceholders(current.title, operator),
                          content: expandOperatorPlaceholders(current.content, operator),
                        }));
                        setEditorDocumentKey((current) => current + 1);
                      }}
                      className="block w-full border-b border-[#eef2f0] px-3 py-3 text-left text-sm hover:bg-[#eaf9f3]"
                    >
                      <span className="block font-bold text-[#17201c]">
                        {operator.companyName ||
                          operator.tradingName ||
                          `Operator ${operator.id}`}
                      </span>
                      <span className="text-xs text-[#68716d]">
                        {operator.email || `ID ${operator.id}`}
                      </span>
                    </button>
                  ))}
                  {!matchedOperators.length && (
                    <p className="p-3 text-sm text-[#68716d]">
                      No active operator found.
                    </p>
                  )}
                </div>
              )}
              {selectedOperator && (
                <p className="bg-[#eaf9f3] px-3 py-2.5 text-sm text-[#17201c]">
                  Draft for{" "}
                  <strong>
                    {selectedOperator.companyName ||
                      selectedOperator.tradingName ||
                      `Operator ${selectedOperator.id}`}
                  </strong>{" "}
                  <button
                    type="button"
                    onClick={() => setOperatorId("")}
                    className="ml-2 underline"
                  >
                    Change
                  </button>
                </p>
              )}
            </div>
          )}

          {kind === "operator" && (
            <fieldset>
              <legend className="text-sm font-bold text-[#35443e]">
                Start from template
              </legend>
              <p className="mt-1 text-sm text-[#68716d]">
                Choose the closest scenario. The policy remains editable before
                review.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={startBlankDraft}
                  className={`min-h-28 rounded-lg p-4 text-left transition-colors ${!templateId ? "bg-[#eaf9f3] ring-1 ring-inset ring-[#0d7d5f]" : "bg-[#f4f7f5] hover:bg-[#edf3f0]"}`}
                >
                  <p className="font-bold text-[#17201c]">Blank draft</p>
                  <p className="mt-2 text-xs leading-5 text-[#68716d]">
                    Start with an empty policy and write the wording yourself.
                  </p>
                </button>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`min-h-28 rounded-lg p-4 text-left transition-colors ${templateId === template.id ? "bg-[#eaf9f3] ring-1 ring-inset ring-[#0d7d5f]" : "bg-[#f4f7f5] hover:bg-[#edf3f0]"}`}
                  >
                    <p className="font-bold text-[#17201c]">{template.name}</p>
                    <p className="mt-2 text-xs leading-5 text-[#68716d]">
                      {TEMPLATE_SUMMARIES[template.scenario]}
                    </p>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <label className="text-sm font-bold text-[#35443e]">
            Policy title
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder={
                kind === "operator"
                  ? "2027 Hajj Cancellation & Refund Policy"
                  : "UfitGo Marketplace Disclaimer"
              }
              className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]"
            />
          </label>
          <div className="text-sm font-bold text-[#35443e]">
            Policy text
            <RichPolicyEditor
              key={editorDocumentKey}
              value={form.content}
              contentFormat={form.contentFormat}
              onChange={(content) => setForm((current) => ({ ...current, content, contentFormat: "rich_text" }))}
            />
          </div>
          {editingDraft && <label className="text-sm font-bold text-[#35443e]">What changed?<input required value={draftChangeSummary} onChange={(event) => setDraftChangeSummary(event.target.value)} placeholder="For example: clarified supplier cancellation fees" className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]" /></label>}
          <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-3 border-t border-[#dbe2de] bg-white p-4 sm:mx-0 sm:justify-end sm:border-0 sm:px-0">
            <button
              type="button"
              onClick={() =>
                setPreview({
                  title: form.title || "Untitled policy",
                  content: form.content,
                  contentFormat: form.contentFormat,
                  ownerType: kind,
                  operatorId: operatorId ? Number(operatorId) : null,
                })
              }
              className="inline-flex h-11 items-center gap-2 border border-[#0d7d5f] px-4 text-sm font-bold text-[#0d7d5f]"
            >
              <Eye className="size-4" />
              Preview
            </button>
            <button
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 bg-[#0d7d5f] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <FileText className="size-4" />
              {saving ? "Saving..." : editingDraft ? "Save revision" : "Save draft"}
            </button>
          </div>
          {message && <div role="status" className="border-l-4 border-[#0d7d5f] bg-[#eaf9f3] px-4 py-3 text-base font-semibold leading-6 text-[#17201c]">{message}</div>}
        </form>
      </section>}

      {activeTab === "templates" && <section className="border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-brand text-lg font-bold text-[#17201c]">Manage policy templates</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#68716d]">Edit the reusable starting wording here. Existing drafts and published policies are not changed.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {templates.map((template) => <button key={template.id} type="button" onClick={() => setEditingTemplate({ ...template })} className="border border-[#dbe2de] bg-[#f8faf9] p-4 text-left hover:border-[#0d7d5f]"><p className="font-bold text-[#17201c]">{template.name}</p><p className="mt-1 text-xs text-[#68716d]">Version {template.version} · Edit reusable wording</p></button>)}
        </div>
      </section>}

      {activeTab === "drafts" && <section className="border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-brand text-lg font-bold text-[#17201c]">
          Operator policy drafts
        </h2>
        <p className="mt-1 text-sm text-[#68716d]">
          Share a protected portal review with the selected operator. The invite
          is tied to their signed-in account, not a public link.
        </p>
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-[#68716d]">Loading drafts...</p>
          ) : !drafts.length ? (
            <p className="text-sm text-[#68716d]">
              No operator policy drafts yet.
            </p>
          ) : (
            drafts.map((draft) => (
              <article
                key={draft.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[#dbe2de] bg-[#f8faf9] p-3"
              >
                <div>
                  <p className="font-bold text-[#17201c]">{draft.title}</p>
                  <p className="mt-1 text-xs text-[#68716d]">
                    Operator {draft.operatorId} · Revision {draft.revision} ·{" "}
                    {draft.status.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void editDraft(draft)} className="inline-flex h-10 items-center gap-2 border border-[#d3dad7] px-3 text-sm font-bold text-[#35443e]"><FileText className="size-4" />Edit draft</button>
                  <button type="button" onClick={() => void openSharing(draft)} className="inline-flex h-10 items-center gap-2 border border-[#0d7d5f] px-3 text-sm font-bold text-[#0d7d5f]"><Send className="size-4" />Manage access</button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>}

      {activeTab === "published" && <section className="border border-[#dbe2de] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-brand text-lg font-bold text-[#17201c]">
          Policy versions
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#68716d]">
          Published wording is permanent. Use an existing version as a starting
          point, or correct a material error without changing booking evidence.
        </p>
        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-[#68716d]">Loading policies...</p>
          ) : (
            policies.map((policy) => (
              <article
                key={policy.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-[#dbe2de] bg-[#f8faf9] p-4"
              >
                <div>
                  <p className="font-bold text-[#17201c]">
                    {policy.title}{" "}
                    <span className="text-sm text-[#68716d]">
                      v{policy.version}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-[#68716d]">
                    {policy.ownerType === "platform"
                      ? "UfitGo marketplace disclaimer"
                      : `Operator ${policy.operatorId}`}{" "}
                    · {policy.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        title: policy.title,
                        content: policy.content,
                        contentFormat: policy.contentFormat || "plain_text",
                        ownerType: policy.ownerType,
                        operatorId: policy.operatorId,
                      })
                    }
                    className="inline-flex h-9 items-center gap-2 border border-[#d3dad7] px-3 text-sm font-bold text-[#52605a]"
                  >
                    <Eye className="size-4" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => useAsTemplate(policy)}
                    className="inline-flex h-9 items-center gap-2 border border-[#d3dad7] px-3 text-sm font-bold text-[#52605a]"
                  >
                    <FileText className="size-4" />
                    Use as template
                  </button>
                  {policy.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void publishPolicy(policy.id)}
                      className="inline-flex h-9 items-center gap-2 border border-[#0d7d5f] px-3 text-sm font-bold text-[#0d7d5f]"
                    >
                      <Send className="size-4" />
                      Publish
                    </button>
                  ) : policy.status === "published" ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0d7d5f]">
                        <CheckCircle2 className="size-4" />
                        Published
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCorrection({
                            policy,
                            title: policy.title,
                            content: policy.content,
                            contentFormat: policy.contentFormat || "plain_text",
                            reason: "",
                          })
                        }
                        className="inline-flex h-9 items-center gap-2 border border-[#2c6e9e] px-3 text-sm font-bold text-[#215b87]"
                      >
                        <PencilLine className="size-4" />
                        Correct wording
                      </button>
                      <button
                        type="button"
                        onClick={() => void archivePolicy(policy)}
                        className="inline-flex h-9 items-center gap-2 border border-[#a74b4b] px-3 text-sm font-bold text-[#9f3434]"
                      >
                        <Archive className="size-4" />
                        Archive
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Policy preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201c]/45 p-3"
        >
          <section className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#dbe2de] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
                  {preview.ownerType === "platform"
                    ? "UfitGo marketplace disclaimer"
                    : `Operator ${preview.operatorId || ""} policy`}
                </p>
                <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">
                  {preview.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
                className="grid size-11 place-items-center text-[#52605a]"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-5 text-sm leading-7 text-[#33413a]">
              {preview.contentFormat === "rich_text" ? <div dangerouslySetInnerHTML={{ __html: preview.content }} /> : <div className="whitespace-pre-wrap">{preview.content}</div>}
            </div>
          </section>
        </div>
      )}
      {editingTemplate && <div role="dialog" aria-modal="true" aria-label="Edit policy template" className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201c]/45 p-3"><form onSubmit={saveTemplate} className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-[#dbe2de] px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">Reusable template · Version {editingTemplate.version}</p><h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">Edit policy template</h2><p className="mt-2 text-sm leading-6 text-[#68716d]">Use the approved wording from the template reference. Keep placeholders in square brackets where operators must supply information.</p></div><button type="button" onClick={() => setEditingTemplate(null)} aria-label="Close template editor" className="grid size-11 place-items-center text-[#52605a]"><X className="size-5" /></button></header><div className="space-y-5 overflow-y-auto px-5 py-5"><label className="block text-sm font-bold text-[#35443e]">Template name<input required value={editingTemplate.name} onChange={(event) => setEditingTemplate({ ...editingTemplate, name: event.target.value })} className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]" /></label><label className="block text-sm font-bold text-[#35443e]">Policy title template<input required value={editingTemplate.titleTemplate} onChange={(event) => setEditingTemplate({ ...editingTemplate, titleTemplate: event.target.value })} className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]" /></label><label className="block text-sm font-bold text-[#35443e]">Policy content template<textarea required value={editingTemplate.contentTemplate} onChange={(event) => setEditingTemplate({ ...editingTemplate, contentTemplate: event.target.value })} className="mt-1.5 min-h-80 w-full border border-[#d3dad7] bg-[#f8faf9] p-3 font-mono text-sm font-normal leading-6 outline-none focus:border-[#0d7d5f]" /></label></div><footer className="flex justify-end gap-3 border-t border-[#dbe2de] px-5 py-4"><button type="button" onClick={() => setEditingTemplate(null)} className="h-11 px-4 text-sm font-bold text-[#52605a]">Cancel</button><button disabled={savingTemplate} className="h-11 bg-[#0d7d5f] px-4 text-sm font-bold text-white disabled:opacity-50">{savingTemplate ? "Saving..." : "Save new template version"}</button></footer></form></div>}
      {sharing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Manage operator draft access"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201c]/45 p-3"
        >
          <section className="w-full max-w-lg bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#dbe2de] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#07845f]">
                  Operator draft access
                </p>
                <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">
                  Share {sharing.draft.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#68716d]">
                  Access always requires operator sign-in. The link alone never grants access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharing(null)}
                aria-label="Close sharing"
                className="grid size-11 place-items-center text-[#52605a]"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="space-y-5 px-5 py-5">
              <fieldset>
                <legend className="text-sm font-semibold text-[#52605a]">Access scope</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSharing({ ...sharing, accessScope: "restricted" })} className={`min-h-12 border px-3 text-sm font-bold ${sharing.accessScope === "restricted" ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d3dad7] text-[#52605a]"}`}>This operator account</button>
                  <button type="button" onClick={() => setSharing({ ...sharing, accessScope: "operator_organisation" })} className={`min-h-12 border px-3 text-sm font-bold ${sharing.accessScope === "operator_organisation" ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d3dad7] text-[#52605a]"}`}>Operator organisation</button>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#68716d]">Organisation access will extend to verified organisation users as those accounts are introduced.</p>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-semibold text-[#52605a]">
                  Permission
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSharing({ ...sharing, permission: "edit" })
                    }
                    className={`min-h-12 border px-3 text-sm font-bold ${sharing.permission === "edit" ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d3dad7] text-[#52605a]"}`}
                  >
                    Can edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSharing({ ...sharing, permission: "view" })
                    }
                    className={`min-h-12 border px-3 text-sm font-bold ${sharing.permission === "view" ? "border-[#0d7d5f] bg-[#eaf9f3] text-[#0d7d5f]" : "border-[#d3dad7] text-[#52605a]"}`}
                  >
                    View only
                  </button>
                </div>
              </fieldset>
              <label className="block text-sm font-semibold text-[#52605a]">
                Expiry <span className="font-normal">(optional)</span>
                <input
                  type="date"
                  value={sharing.expiresAt}
                  onChange={(event) =>
                    setSharing({ ...sharing, expiresAt: event.target.value })
                  }
                  className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal"
                />
              </label>
              <button
                type="button"
                onClick={() => void shareDraft()}
                className="inline-flex h-11 items-center gap-2 bg-[#0d7d5f] px-4 text-sm font-bold text-white"
              >
                <Send className="size-4" />
                Send secure invite
              </button>
              {sharing.accessScope === "restricted" && sharing.reviewUrl && <button type="button" onClick={() => void copyReviewLink()} className="ml-3 inline-flex h-11 items-center border border-[#0d7d5f] px-4 text-sm font-bold text-[#0d7d5f]">Copy review link</button>}
              <div className="border-t border-[#dbe2de] pt-4">
                <p className="text-sm font-semibold text-[#52605a]">
                  Current access
                </p>
                <div className="mt-2 space-y-2">
                  {sharing.access.length ? (
                    sharing.access.map((access) => (
                        <div
                          key={access.id}
                          className="flex items-center justify-between gap-3 bg-[#f8faf9] p-3 text-sm"
                        >
                          <span>
                            {access.accessScope === "operator_organisation" ? "Organisation" : "This operator account"} · {access.permission === "edit" ? "Can edit" : "View only"}
                            {access.revokedAt ? " · Revoked" : access.expiresAt && new Date(access.expiresAt) <= new Date() ? " · Expired" : access.acceptedAt ? ` · Accepted ${new Date(access.acceptedAt).toLocaleDateString()}` : " · Invited"}
                            {access.expiresAt
                              ? ` · expires ${new Date(access.expiresAt).toLocaleDateString()}`
                              : " · no expiry"}
                          </span>
                          {!access.revokedAt && !(access.expiresAt && new Date(access.expiresAt) <= new Date()) && <button type="button" onClick={() => void revokeDraftAccess(access.id)} className="font-bold text-[#9f3434] underline">Revoke</button>}
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-[#68716d]">
                      No active operator access.
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-[#dbe2de] pt-4">
                <p className="text-sm font-semibold text-[#52605a]">Approval status</p>
                {sharing.approvals[0] && sharing.draft.status === "operator_approved" ? <div className="mt-2 bg-[#eaf9f3] p-3 text-sm text-[#17201c]"><strong>Ready to publish</strong><span className="block pt-1">Approved by {sharing.approvals[0].signatoryName}, {sharing.approvals[0].signatoryRole} · Revision {sharing.approvals[0].revision}</span></div> : <p className="mt-2 text-sm text-[#68716d]">Operator approval is required before publication.</p>}
                {sharing.draft.status === "operator_approved" && <button type="button" disabled={publishingDraft} onClick={() => void publishApprovedDraft()} className="mt-3 inline-flex h-11 items-center bg-[#0d7d5f] px-4 text-sm font-bold text-white disabled:opacity-50">{publishingDraft ? "Publishing..." : "Publish approved policy"}</button>}
              </div>
              <div className="border-t border-[#dbe2de] pt-4">
                <p className="text-sm font-semibold text-[#52605a]">Recent activity</p>
                <div className="mt-2 space-y-2">{sharing.activity.slice(0, 5).map((event) => <p key={event.id} className="bg-[#f8faf9] p-3 text-sm text-[#52605a]"><span className="font-semibold text-[#17201c]">{event.eventType === "draft_updated" ? `Edited by ${activityActor(event)}` : event.eventType.replaceAll("_", " ")}</span>{event.metadata?.revision ? ` · Revision ${event.metadata.revision}` : ""}{event.metadata?.changeSummary ? ` · ${event.metadata.changeSummary}` : ""}<span className="block pt-1 text-xs text-[#68716d]">{relativeActivityTime(event.createdAt)}</span></p>)}{!sharing.activity.length && <p className="text-sm text-[#68716d]">No activity recorded yet.</p>}</div>
              </div>
              <button type="button" onClick={() => void requestChanges()} className="min-h-11 text-sm font-bold text-[#215b87] underline">Request changes from operator</button>
            </div>
          </section>
        </div>
      )}
      {correction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Correct published policy"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#17201c]/45 p-3"
        >
          <form
            onSubmit={submitCorrection}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#dbe2de] px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#215b87]">
                  Correcting {correction.policy.title} v
                  {correction.policy.version}
                </p>
                <h2 className="mt-1 font-brand text-xl font-bold text-[#17201c]">
                  Publish corrected policy
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#68716d]">
                  The original remains in booking evidence, is archived, and
                  package assignments move to this replacement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrection(null)}
                aria-label="Close correction"
                className="grid size-11 place-items-center text-[#52605a]"
              >
                <X className="size-5" />
              </button>
            </header>
            <div className="grid gap-4 overflow-y-auto px-5 py-5">
              <label className="text-sm font-semibold text-[#52605a]">
                Correction reason
                <textarea
                  required
                  rows={3}
                  value={correction.reason}
                  onChange={(event) =>
                    setCorrection({ ...correction, reason: event.target.value })
                  }
                  className="mt-1.5 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 py-2 font-normal outline-none focus:border-[#0d7d5f]"
                />
              </label>
              <label className="text-sm font-semibold text-[#52605a]">
                Policy title
                <input
                  required
                  value={correction.title}
                  onChange={(event) =>
                    setCorrection({ ...correction, title: event.target.value })
                  }
                  className="mt-1.5 h-11 w-full border border-[#d3dad7] bg-[#f8faf9] px-3 font-normal outline-none focus:border-[#0d7d5f]"
                />
              </label>
              <div className="text-sm font-semibold text-[#52605a]">
                Corrected policy text
                <RichPolicyEditor
                  value={correction.content}
                  contentFormat={correction.contentFormat}
                  onChange={(content) => setCorrection({ ...correction, content, contentFormat: "rich_text" })}
                />
              </div>
            </div>
            <footer className="flex flex-wrap justify-end gap-3 border-t border-[#dbe2de] px-5 py-4">
              <button
                type="button"
                onClick={() => setCorrection(null)}
                className="h-11 border border-[#d3dad7] px-4 text-sm font-bold text-[#52605a]"
              >
                Cancel
              </button>
              <button
                disabled={correcting}
                className="inline-flex h-11 items-center gap-2 bg-[#215b87] px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                <PencilLine className="size-4" />
                {correcting ? "Publishing..." : "Publish correction"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
