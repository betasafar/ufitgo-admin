"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCan } from "@/components/auth/permission-gate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const SCHEDULE_PRESETS = [
  { value: "* * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 8 * * *", label: "Every day at 8:00 AM" },
  { value: "0 8 * * 1", label: "Every Monday at 8:00 AM" },
] as const

const TIME_ZONES = ["Africa/Lagos", "UTC", "Europe/London", "Europe/Berlin", "America/New_York"] as const

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

type Job = {
  key: string
  name: string
  description?: string
  cronExpression: string
  timeZone: string
  enabled: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  lastStatus?: "success" | "failed"
}

type JobRun = {
  id: string
  trigger: "scheduled" | "manual"
  status: "running" | "success" | "failed"
  createdAt: string
  finishedAt?: string
  error?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/scheduler/jobs${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || "Scheduler request failed.")
  return payload as T
}

function date(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled"
}

function scheduleSummary(expression: string) {
  const preset = SCHEDULE_PRESETS.find((item) => item.value === expression)
  if (preset) return preset.label
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.trim().split(/\s+/)
  if (![minute, hour, dayOfMonth, month, dayOfWeek].every(Boolean)) {
    return "Enter a five-part cron expression"
  }
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every minute"
  }
  if (/^\*\/\d+$/.test(minute) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${minute.slice(2)} minutes`
  }
  if (/^\d+$/.test(minute) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every hour at :${minute.padStart(2, "0")}`
  }
  if (/^\d+$/.test(minute) && /^\*\/\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${hour.slice(2)} hours at :${minute.padStart(2, "0")}`
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every day at ${formatTime(hour, minute)}`
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dayOfMonth === "*" && month === "*" && /^\d$/.test(dayOfWeek)) {
    return `Every ${DAYS_OF_WEEK[Number(dayOfWeek) % 7]} at ${formatTime(hour, minute)}`
  }
  return `Custom schedule: ${expression || "enter a five-part cron expression"}`
}

function formatTime(hour: string, minute: string) {
  const numericHour = Number(hour)
  const suffix = numericHour >= 12 ? "PM" : "AM"
  return `${numericHour % 12 || 12}:${minute.padStart(2, "0")} ${suffix}`
}

function ScheduleEditor({ job, saving, onSave }: { job: Job; saving: boolean; onSave: (schedule: { cronExpression: string; timeZone: string }) => void }) {
  const [cronExpression, setCronExpression] = useState(job.cronExpression)
  const [timeZone, setTimeZone] = useState(job.timeZone)
  const [advanced, setAdvanced] = useState(!SCHEDULE_PRESETS.some((item) => item.value === job.cronExpression))
  const [customTimeZone, setCustomTimeZone] = useState(!TIME_ZONES.includes(job.timeZone as typeof TIME_ZONES[number]))
  const changed = cronExpression !== job.cronExpression || timeZone !== job.timeZone

  return <div className="space-y-2">
    <p className="font-medium text-foreground">{scheduleSummary(cronExpression)}</p>
    <label className="block text-xs text-muted-foreground">Frequency
      <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={advanced ? "custom" : cronExpression} onChange={(event) => {
        setAdvanced(event.target.value === "custom")
        if (event.target.value !== "custom") setCronExpression(event.target.value)
      }}>
        {SCHEDULE_PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        <option value="custom">Advanced cron expression</option>
      </select>
    </label>
    {advanced && <label className="block text-xs text-muted-foreground">Cron expression
      <Input className="mt-1" aria-label={`${job.name} cron expression`} value={cronExpression} placeholder="minute hour day-of-month month day-of-week" onChange={(event) => setCronExpression(event.target.value)} />
      <span className="mt-1 block">Five fields: minute, hour, day of month, month, day of week.</span>
    </label>}
    <label className="block text-xs text-muted-foreground">Time zone
      <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground" value={customTimeZone ? "custom" : timeZone} onChange={(event) => {
        setCustomTimeZone(event.target.value === "custom")
        if (event.target.value !== "custom") setTimeZone(event.target.value)
      }}>
        {TIME_ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        <option value="custom">Custom IANA time zone</option>
      </select>
    </label>
    {customTimeZone && <Input aria-label={`${job.name} custom time zone`} value={timeZone} placeholder="Continent/City" onChange={(event) => setTimeZone(event.target.value)} />}
    <Button size="sm" variant="outline" disabled={!changed || saving} onClick={() => onSave({ cronExpression, timeZone })}>Save schedule</Button>
  </div>
}

export default function SchedulerPage() {
  const can = useCan()
  const allowed = can(["settings.manage"])
  const client = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState("")
  const jobs = useQuery({ queryKey: ["scheduler-jobs"], queryFn: () => request<Job[]>("") })
  const runs = useQuery({
    queryKey: ["scheduler-runs", selected],
    queryFn: () => request<JobRun[]>(`/${selected}/runs`),
    enabled: Boolean(selected),
  })
  const mutate = useMutation({
    mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) =>
      request<Job>(path, { method, body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => {
      setNotice("Scheduler updated.")
      client.invalidateQueries({ queryKey: ["scheduler-jobs"] })
      client.invalidateQueries({ queryKey: ["scheduler-runs"] })
    },
    onError: (error: Error) => setNotice(error.message),
  })

  if (!allowed) return <main className="p-6"><h1 className="text-2xl font-bold">Scheduler</h1><p className="mt-3 text-sm text-muted-foreground">You do not have permission to manage scheduled jobs.</p></main>

  return <main className="space-y-6 p-6">
    <header>
      <h1 className="text-2xl font-bold">Scheduler</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enable approved jobs, change their schedules, run them manually, and review execution history. A Render Cron Job invokes due jobs every minute.</p>
    </header>
    {notice && <p role="status" className="rounded-md border p-3 text-sm">{notice}</p>}
    {jobs.isPending && <p>Loading scheduled jobs…</p>}
    {jobs.error && <p role="alert" className="text-sm text-red-700">{jobs.error.message}</p>}
    <section className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-muted/50"><tr><th className="p-3">Job</th><th className="p-3">Schedule</th><th className="p-3">Status</th><th className="p-3">Next run</th><th className="p-3">Actions</th></tr></thead>
        <tbody>
          {jobs.data?.map((job) => <tr key={job.key} className="border-t align-top">
            <td className="p-3"><p className="font-medium">{job.name}</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">{job.description}</p></td>
            <td className="p-3"><ScheduleEditor key={`${job.key}:${job.cronExpression}:${job.timeZone}`} job={job} saving={mutate.isPending} onSave={(schedule) => mutate.mutate({ path: `/${job.key}`, method: "PATCH", body: schedule })} /></td>
            <td className="p-3"><span className={job.enabled ? "font-medium text-emerald-700" : "text-muted-foreground"}>{job.enabled ? "Enabled" : "Disabled"}{job.lastStatus ? ` · last ${job.lastStatus}` : ""}</span></td>
            <td className="p-3">{date(job.nextRunAt)}<br/><span className="text-xs text-muted-foreground">Last: {date(job.lastRunAt)}</span></td>
            <td className="flex flex-wrap gap-2 p-3">
              <Button size="sm" variant="outline" disabled={mutate.isPending} onClick={() => mutate.mutate({ path: `/${job.key}`, method: "PATCH", body: { enabled: !job.enabled } })}>{job.enabled ? "Disable" : "Enable"}</Button>
              <Button size="sm" disabled={mutate.isPending} onClick={() => mutate.mutate({ path: `/${job.key}/run`, method: "POST" })}>Run now</Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(job.key)}>History</Button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </section>
    {selected && <section className="rounded-xl border p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Run history</h2><Button size="sm" variant="outline" onClick={() => setSelected(null)}>Close</Button></div>
      {runs.isPending && <p className="mt-3 text-sm">Loading history…</p>}
      <ul className="mt-3 space-y-2">{runs.data?.map((run) => <li key={run.id} className="rounded border p-3 text-sm"><span className="font-medium">{run.status}</span> · {run.trigger} · {date(run.createdAt)}{run.error && <p className="mt-1 text-red-700">{run.error}</p>}</li>)}</ul>
    </section>}
  </main>
}
