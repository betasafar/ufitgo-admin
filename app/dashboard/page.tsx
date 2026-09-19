import { DashboardOverview } from "@/components/dashboard/dashboard-overview"

export default function DashboardPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <DashboardOverview />
      </div>
    </main>
  )
}
