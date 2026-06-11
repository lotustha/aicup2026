import Link from "next/link";
import { getTeams } from "@/lib/site-data";
import type { Team } from "@/lib/site-data";
import { TeamCrest, SectionHeader, EmptyState } from "@/components/site/ui";

export const dynamic = "force-dynamic";

const OTHER = "Other";

export default async function Page() {
  const teams = await getTeams();

  // Group teams by their group letter, preserving the name-sorted order from
  // getTeams(). Teams without a group fall under "Other".
  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const key = t.group ?? OTHER;
    const list = byGroup.get(key);
    if (list) list.push(t);
    else byGroup.set(key, [t]);
  }

  // Order: real group letters A→Z first, "Other" always last.
  const groups = Array.from(byGroup.keys()).sort((a, b) => {
    if (a === OTHER) return 1;
    if (b === OTHER) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="w-full pb-4">
      {/* AppBar-style title */}
      <header className="sticky top-0 z-10 -mx-4 mb-1 border-b border-border bg-bg/85 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-black tracking-tight text-tprimary">
          Teams
        </h1>
      </header>

      {teams.length === 0 ? (
        <div className="pt-4">
          <EmptyState
            title="No teams yet"
            message="Teams will appear here once they are added."
          />
        </div>
      ) : (
        groups.map((g) => (
          <section key={g}>
            <SectionHeader
              title={g === OTHER ? "Other" : `Group ${g}`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {byGroup.get(g)!.map((t) => (
                <Link
                  key={t.id}
                  href={`/teams/${t.id}`}
                  className="card flex flex-col items-center gap-2 px-3 py-4 text-center transition-colors hover:border-primary/50"
                >
                  <TeamCrest
                    url={t.crestUrl}
                    label={t.code ?? t.name}
                    size={40}
                  />
                  <span className="truncate w-full text-sm font-semibold text-tprimary">
                    {t.name}
                  </span>
                  {t.code && (
                    <span className="text-[11px] font-bold tracking-wide text-ttertiary">
                      {t.code}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
