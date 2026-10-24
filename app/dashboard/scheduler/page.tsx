"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCan } from "@/components/auth/permission-gate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
            <td className="space-y-2 p-3">
              <Input aria-label={`${job.name} cron expression`} defaultValue={job.cronExpression} onBlur={(event) => {
                if (event.target.value !== job.cronExpression) mutate.mutate({ path: `/${job.key}`, method: "PATCH", body: { cronExpression: event.target.value } })
              }} />
              <Input aria-label={`${job.name} time zone`} defaultValue={job.timeZone} onBlur={(event) => {
                if (event.target.value !== job.timeZone) mutate.mutate({ path: `/${job.key}`, method: "PATCH", body: { timeZone: event.target.value } })
              }} />
            </td>
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
