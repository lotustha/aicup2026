import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="text-3xl font-semibold text-white">
        {value.toLocaleString()}
      </div>
      <div className="mt-1 text-sm text-slate-400">{label}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [teams, fixtures, liveFixtures, devices, messages] = await Promise.all([
    prisma.team.count(),
    prisma.fixture.count(),
    prisma.fixture.count({ where: { status: { in: ["live", "halfTime"] } } }),
    prisma.device.count(),
    prisma.message.count({ where: { pushed: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-400">
        Overview of tournament data and engagement.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Teams" value={teams} />
        <StatCard label="Fixtures" value={fixtures} />
        <StatCard label="Live now" value={liveFixtures} />
        <StatCard label="Registered devices" value={devices} />
        <StatCard label="Messages sent" value={messages} />
      </div>
    </div>
  );
}
