import Link from "next/link";
import { getFixtures } from "@/lib/site-data";
import type { Fixture } from "@/lib/site-data";
import { SectionHeader, MatchCard, EmptyState } from "@/components/site/ui";
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
  const present = GROUPS.filter((g) =>
    fixtures.some((f) => f.group === g)
  );

  // Filter to the selected group if one is active and valid.
  const filtered =
    active && present.includes(active)
      ? fixtures.filter((f) => f.group === active)
      : fixtures;

  // Group filtered fixtures by date label, preserving chronological order
  // (getFixtures returns rows ordered by kickoff ascending).
  const byDate = new Map<string, Fixture[]>();
  for (const f of filtered) {
    const key = dayLabel(f.kickoff);
    const list = byDate.get(key);
    if (list) list.push(f);
    else byDate.set(key, [f]);
  }

  const chips: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    ...present.map((g) => ({ label: g, value: g })),
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      {/* AppBar-style title */}
      <header className="sticky top-0 z-10 -mx-4 mb-1 border-b border-border bg-bg/85 px-4 py-4 backdrop-blur">
        <h1 className="text-2xl font-black tracking-tight text-tprimary">
          Schedule
        </h1>
      </header>

      {/* Filter chips */}
      <nav className="-mx-4 overflow-x-auto px-4 pb-2 pt-3">
        <div className="flex w-max items-center gap-2">
          {chips.map((c) => {
            const isActive =
              c.value === null ? active === null || !present.includes(active ?? "") : c.value === active;
            const href = c.value === null ? "/schedule" : `/schedule?group=${c.value}`;
            return (
              <Link
                key={c.label}
                href={href}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-surface2 text-tsecondary hover:text-tprimary"
                }`}
              >
                {c.value === null ? c.label : `Group ${c.label}`}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Fixtures grouped by date */}
      {byDate.size === 0 ? (
        <div className="pt-4">
          <EmptyState title="No fixtures" message="Check back soon." />
        </div>
      ) : (
        <div>
          {Array.from(byDate.entries()).map(([dateLabel, list]) => (
            <section key={dateLabel}>
              <SectionHeader title={dateLabel} />
              <div className="space-y-2">
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
