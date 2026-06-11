import Link from "next/link";
import { getFixtures } from "@/lib/site-data";
import type { Fixture } from "@/lib/site-data";
import {
  SectionHeader,
  MatchCard,
  StatusPill,
  EmptyState,
} from "@/components/site/ui";
import { dayLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const active = group?.toUpperCase() ?? null;

  const fixtures = await getFixtures();

  // Group letters that actually appear in the data, in canonical A–L order.
  const present = GROUPS.filter((g) => fixtures.some((f) => f.group === g));

  // A selected group is only honoured when it actually exists in the data;
  // anything else falls back to showing every fixture ("All").
  const activeGroup = active && present.includes(active) ? active : null;

  const filtered = activeGroup
    ? fixtures.filter((f) => f.group === activeGroup)
    : fixtures;

  // Group filtered fixtures by date label. getFixtures() returns rows ordered
  // by kickoff ascending, so the Map's insertion order is chronological.
  const byDate = new Map<string, Fixture[]>();
  for (const f of filtered) {
    const key = dayLabel(f.kickoff);
    const list = byDate.get(key);
    if (list) list.push(f);
    else byDate.set(key, [f]);
  }

  const totalDays = byDate.size;
  const totalMatches = filtered.length;

  return (
    <div className="pb-10 pt-6">
      {/* Title */}
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Fixtures
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-tprimary md:text-4xl">
            Schedule
          </h1>
        </div>
        {totalMatches > 0 && (
          <p className="text-sm font-medium text-tsecondary">
            {totalMatches} {totalMatches === 1 ? "match" : "matches"}
            {activeGroup ? ` • Group ${activeGroup}` : ""}
          </p>
        )}
      </header>

      {/* Group filter chips — omitted entirely when the data has no groups. */}
      {present.length > 0 && (
        <nav className="mt-5 overflow-x-auto pb-1">
          <div className="flex w-max items-center gap-2">
            <Link
              href="/schedule"
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                activeGroup === null
                  ? "bg-primary/15 text-primary"
                  : "bg-surface2 text-tsecondary hover:text-tprimary"
              }`}
            >
              All
            </Link>
            {present.map((g) => {
              const isActive = g === activeGroup;
              return (
                <Link
                  key={g}
                  href={`/schedule?group=${g}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-surface2 text-tsecondary hover:text-tprimary"
                  }`}
                >
                  Group {g}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Fixtures grouped by date, in a responsive grid per day. */}
      {totalDays === 0 ? (
        <div className="mt-6">
          <EmptyState title="No fixtures" message="Check back soon." />
        </div>
      ) : (
        <div>
          {Array.from(byDate.entries()).map(([dateLabel, list]) => (
            <section key={dateLabel}>
              <SectionHeader
                title={dateLabel}
                action={
                  <StatusPill>
                    {list.length} {list.length === 1 ? "match" : "matches"}
                  </StatusPill>
                }
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((f) => (
                  <MatchCard key={f.id} f={f} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
