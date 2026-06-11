import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/site-data";
import type { TeamFull } from "@/lib/site-data";
import { TeamCrest, StatusPill, SectionHeader } from "@/components/site/ui";

export const dynamic = "force-dynamic";

type Player = TeamFull["squad"][number];

// Squad sections in canonical pitch order; anything else buckets under "Other".
const POSITION_ORDER = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Attacker",
] as const;
const OTHER = "Other";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isInteger(teamId)) notFound();

  const team = await getTeam(teamId);
  if (!team) notFound();

  // Bucket the squad by position, preserving the number-sorted order from
  // getTeam(). Unknown / null positions go under "Other".
  const byPosition = new Map<string, Player[]>();
  for (const p of team.squad) {
    const key =
      p.position && (POSITION_ORDER as readonly string[]).includes(p.position)
        ? p.position
        : OTHER;
    const list = byPosition.get(key);
    if (list) list.push(p);
    else byPosition.set(key, [p]);
  }

  const sections = [...POSITION_ORDER, OTHER].filter((pos) =>
    byPosition.has(pos)
  );

  return (
    <div className="w-full pb-4">
      {/* Back link */}
      <div className="pt-4">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1 text-sm font-semibold text-tsecondary transition-colors hover:text-tprimary"
        >
          ← Back to teams
        </Link>
      </div>

      {/* Hero header */}
      <header className="hero-gradient mt-3 flex flex-col items-center gap-3 rounded-card border border-border px-6 py-8 text-center">
        <TeamCrest url={team.crestUrl} label={team.code ?? team.name} size={72} />
        <h1 className="text-2xl font-extrabold tracking-tight text-tprimary">
          {team.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <StatusPill tone="primary">
            {team.group ? `Group ${team.group}` : "No group"}
          </StatusPill>
          {team.coach && <StatusPill tone="accent">Coach: {team.coach}</StatusPill>}
        </div>
      </header>

      {/* Squad */}
      <SectionHeader title="Squad" />
      {sections.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-tsecondary">
          No squad information available.
        </div>
      ) : (
        sections.map((pos) => (
          <section key={pos} className="mb-5">
            <h3 className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-ttertiary">
              {pos === OTHER ? "Other" : `${pos}s`}
            </h3>
            <div className="space-y-2">
              {byPosition.get(pos)!.map((p) => (
                <div
                  key={p.id}
                  className="card flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-sm font-extrabold text-tsecondary">
                    {p.number ?? "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-tprimary">
                      {p.name}
                    </p>
                    <p className="text-xs text-tsecondary">
                      {p.position ?? "Unknown"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
