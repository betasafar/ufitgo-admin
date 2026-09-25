import { AlertTriangle, Clock3, Database, ShieldCheck } from "lucide-react"
import { requirePermissions } from "@/lib/rbac/server"

type Job = {
  name: string
  schedule: string
  owner: string
  purpose: string
  safety: string
  financial?: boolean
}

const jobs: Job[] = [
  {
    name: "Auto-debit worker",
    schedule: "Daily at 01:00 Africa/Lagos",
    owner: "EventBridge Scheduler launches a one-off payment-service ECS task",
    purpose: "Finds due Target Savings plans and charges the approved wallet or card source.",
    safety: "Uses a per-goal, per-day idempotency reference. When Target Savings is off, the worker receives no due debits.",
    financial: true,
  },
  {
    name: "Savings reminders",
    schedule: "Daily at 08:00 Africa/Lagos",
    owner: "EventBridge Scheduler calls the protected User API task endpoint",
    purpose: "Sends reminder notifications for savings plans due today.",
    safety: "Requires a system key and a database lock. It skips entirely when Target Savings is off.",
    financial: true,
  },
  {
    name: "Savings schedule audit",
    schedule: "Daily at midnight Africa/Lagos",
    owner: "User API",
    purpose: "Records missed savings milestones and applies the configured grace-period and drop rules.",
    safety: "Uses a database lock and skips entirely when Target Savings is off.",
    financial: true,
  },
  {
    name: "Booking reservation expiry",
    schedule: "Every 10 minutes",
    owner: "User API",
    purpose: "Releases package slots that were reserved but not paid within their allowed time.",
    safety: "Uses a database lock. It does not move money.",
  },
  {
    name: "Availability alerts and Hajj waitlists",
    schedule: "Every hour, Africa/Lagos",
    owner: "User API",
    purpose: "Notifies customers about newly available packages and Hajj campaign updates.",
    safety: "Uses database locks. Target Savings waitlist notices are sent only when Target Savings is enabled.",
  },
  {
    name: "KYC balance monitor",
    schedule: "Daily at midnight Africa/Lagos",
    owner: "User API",
    purpose: "Checks KYC-related balance limits.",
    safety: "Uses a database lock. It does not charge customers.",
  },
  {
    name: "Referral hold maturation",
    schedule: "Every hour",
    owner: "User API",
    purpose: "Releases eligible referral discounts after the anti-fraud holding period.",
    safety: "Uses a database lock and only changes non-cash referral credit status.",
  },
  {
    name: "Operator maintenance",
    schedule: "Hourly, daily, or monthly depending on the task",
    owner: "Operator API",
    purpose: "Refreshes analytics, promotion status, operator tiers, trust scores, and monthly limits.",
    safety: "Each task uses a database lock. It does not debit customers.",
  },
  {
    name: "Advisor demand report",
    schedule: "Monday at 08:00 Africa/Lagos",
    owner: "Admin API",
    purpose: "Emails the weekly advisor-demand summary.",
    safety: "Uses a database lock to prevent duplicate reports.",
  },
  {
    name: "Scheduled broadcasts and retries",
    schedule: "Checks every minute",
    owner: "Notification service",
    purpose: "Delivers scheduled email and push broadcasts, retrying failed deliveries with backoff.",
    safety: "Atomically claims each delivery before sending it.",
  },
  {
    name: "BaaS reconciliation and provider health",
    schedule: "Runs continuously at its configured intervals",
    owner: "BaaS service",
    purpose: "Re-checks pending bank-transfer records and monitors provider availability.",
    safety: "Uses a database lock and reconciles the original provider record; it never creates a second transfer.",
    financial: true,
  },
]

export default async function ArchitecturePage() {
  await requirePermissions(["settings.manage"])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07845f]">Administration</p>
        <h1 className="mt-2 font-brand text-3xl font-bold text-[#17201c]">System architecture</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68716d]">A plain-language record of the services that run in the background and the protections around them.</p>
      </header>

      <section className="rounded-xl border border-[#e9bc72] bg-[#fff8e8] p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#a95b00]" />
          <div>
            <h2 className="font-brand text-lg font-bold text-[#5f4300]">Before Target Savings launches</h2>
            <p className="mt-1 text-sm leading-6 text-[#76591d]">Keep <strong>Target savings</strong> off in Platform settings. This prevents automatic savings debits, reminder messages, and missed-payment schedule changes. Existing balances and records are preserved.</p>
            <p className="mt-2 text-sm leading-6 text-[#76591d]">To eliminate the small cost of the daily worker as well, disable the two AWS schedules named <strong>ufitgo-auto-debit-worker-daily</strong> and <strong>ufitgo-savings-reminders-daily</strong>. Re-enable both before launch after a controlled test run.</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Clock3 className="size-5 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">Background jobs</h2></div>
        <div className="mt-5 space-y-3">
          {jobs.map((job) => (
            <article key={job.name} className="rounded-lg border border-[#dbe2de] bg-[#f8faf9] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-[#17201c]">{job.name}</h3><p className="mt-1 text-xs font-semibold text-[#0d7d5f]">{job.schedule}</p></div>{job.financial && <span className="inline-flex items-center gap-1 rounded-md bg-[#fff1df] px-2 py-1 text-xs font-bold text-[#955600]"><ShieldCheck className="size-3.5" /> Financial control</span>}</div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a9590]">Runs in</dt><dd className="mt-1 text-[#42504a]">{job.owner}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a9590]">What it does</dt><dd className="mt-1 text-[#42504a]">{job.purpose}</dd></div><div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#8a9590]">Protection</dt><dd className="mt-1 text-[#42504a]">{job.safety}</dd></div></dl>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><Database className="size-5 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">How duplicate work is prevented</h2></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#68716d]">Most API jobs use a PostgreSQL advisory lock: one running service acquires the lock and the others safely skip. The auto-debit worker also uses a unique reference for each savings goal and date, so a retry cannot create a second charge for the same cycle.</p>
      </section>

      <section className="rounded-xl border border-[#dbe2de] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#0d7d5f]" /><h2 className="font-brand text-lg font-bold text-[#17201c]">Package policy lifecycle</h2></div>
        <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-6 text-[#42504a]">
          <li>In <strong>Operator policies</strong>, create a draft. Leave Operator ID blank for the UfitGo marketplace disclaimer; enter the operator ID for an operator cancellation and refund policy.</li>
          <li>Use Preview to check the wording, then publish the approved version. Published text is immutable because bookings retain the exact accepted version.</li>
          <li>In the package editor, assign the published operator policy. New bookings then require acceptance of that policy and the current UfitGo marketplace disclaimer.</li>
          <li>For a normal update, create and publish a replacement version, move affected packages to it, then archive the old version. Archived versions cannot be assigned to future packages; existing booking evidence remains intact.</li>
          <li>For a material published-wording error, use <strong>Correct wording</strong>. Record the reason and corrected text. The system publishes an auditable replacement, archives the flawed version, and moves its package assignments. Existing booking snapshots are never changed.</li>
        </ol>
      </section>
    </main>
  )
}