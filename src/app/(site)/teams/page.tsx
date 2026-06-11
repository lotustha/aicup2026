import Link from "next/link";
import { getTeams } from "@/lib/site-data";
import type { Team } from "@/lib/site-data";
import { TeamCrest, SectionHeader, EmptyState } from "@/components/site/ui";

export const dynamic = "force-dynamic";

const OTHER = "Other";

// A single team tile: centered crest, name, code. Sized to read well in a dense
// multi-column grid on desktop while staying tappable on mobile.
function TeamTile({ t }: { t: Team }) {
  return (
    <Link
      href={`/teams/${t.id}`}
      className="card flex flex-col items-center gap-2 px-3 py-5 text-center transition-colors hover:border-primary/50"
    >
      <TeamCrest url={t.crestUrl} label={t.code ?? t.name} size={48} />
      <span className="line-clamp-2 w-full text-sm font-semibold leading-tight text-tprimary">
        {t.name}
      </span>
      {t.code && (
        <span className="text-[11px] font-bold tracking-wide text-ttertiary">
          {t.code}
        </span>
      )}
    </Link>
  );
}

export default async function Page() {
  const teams = await getTeams();

  // Bucket by group letter, preserving the (group, name) order from getTeams().
  // Teams without a group fall under "Other".
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

  // "Meaningful" grouping only when there's more than one real group bucket.
  // A single shared label (or all-null) collapses to one dense grid.
  const realGroups = groups.filter((g) => g !== OTHER);
  const showGroups = realGroups.length > 1;

  const gridClass =
    "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6";

  return (
    <div className="w-full pb-4">
      {/* AppBar-style title */}
      <header className="sticky top-0 z-10 -mx-4 mb-1 border-b border-border bg-bg/85 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <h1 className="text-2xl font-black tracking-tight text-tprimary md:text-3xl">
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
      ) : showGroups ? (
        groups.map((g) => (
          <section key={g}>
            <SectionHeader title={g === OTHER ? "Other" : `Group ${g}`} />
            <div className={gridClass}>
              {byGroup.get(g)!.map((t) => (
                <TeamTile key={t.id} t={t} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className={`${gridClass} pt-4`}>
          {teams.map((t) => (
            <TeamTile key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
