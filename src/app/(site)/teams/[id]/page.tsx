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

const SECTION_LABEL: Record<string, string> = {
  Goalkeeper: "Goalkeepers",
  Defender: "Defenders",
  Midfielder: "Midfielders",
  Attacker: "Attackers",
  Other: "Other",
};

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

      {/* Hero header — fills the width with crest + identity on the left and the
          group/coach pills, so the page reads well on a wide desktop. */}
      <header className="hero-gradient mt-3 flex flex-col items-center gap-4 rounded-card border border-border px-6 py-8 text-center sm:flex-row sm:items-center sm:gap-6 sm:px-8 sm:text-left">
        <TeamCrest url={team.crestUrl} label={team.code ?? team.name} size={88} />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <h1 className="text-2xl font-extrabold tracking-tight text-tprimary md:text-3xl">
            {team.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <StatusPill tone="primary">
              {team.group ? `Group ${team.group}` : "No group"}
            </StatusPill>
            {team.coach && (
              <StatusPill tone="accent">Coach: {team.coach}</StatusPill>
            )}
          </div>
        </div>
      </header>

      {/* Squad — responsive columns of position groups, each a card. */}
      <SectionHeader title="Squad" />
      {sections.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-tsecondary">
          No squad information available.
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {sections.map((pos) => (
            <section key={pos} className="card overflow-hidden">
              <h3 className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-ttertiary">
                {SECTION_LABEL[pos]}
              </h3>
              <ul className="divide-y divide-divider">
                {byPosition.get(pos)!.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
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
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
