import Link from "next/link";
import { getHomeData } from "@/lib/site-data";
import {
  TeamCrest,
  LiveBadge,
  StatusPill,
  SectionHeader,
  EmptyState,
  MatchCard,
} from "@/components/site/ui";
import { statusLabel, timeOf, dayLabel } from "@/lib/format";
import type { Fixture } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { fixtures, live, today, upcoming } = await getHomeData();

  // --- de-duplication chain (by id) ---
  // A live match must not also appear in Today; Today's fixtures must not
  // repeat under Upcoming; and the hero (whatever it is) must not appear again
  // in any list below it.
  const liveIds = new Set(live.map((f) => f.id));
  const todayList = today.filter((f) => !liveIds.has(f.id));
  const todayIds = new Set(todayList.map((f) => f.id));
  let upcomingList = upcoming.filter((f) => !todayIds.has(f.id));

  // Hero: featured live match if any, otherwise the next upcoming fixture.
  const liveHero: Fixture | undefined = live[0];
  const upcomingHero: Fixture | undefined = liveHero ? undefined : upcomingList[0];
  const hero = liveHero ?? upcomingHero;

  // Remaining simultaneous live matches (don't drop them — show "Live now").
  const otherLive = live.slice(1);

  // If the upcoming hero was pulled from the rail, remove it from the rail.
  if (upcomingHero) {
    upcomingList = upcomingList.filter((f) => f.id !== upcomingHero.id);
  }

  const Header = (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Today
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-tprimary md:text-4xl">
          FIFA World Cup 2026
        </h1>
      </div>
      {live.length > 0 && (
        <span className="live-gradient inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-secondary/20">
          <span className="live-dot h-2 w-2 rounded-full bg-white" />
          {live.length} LIVE
        </span>
      )}
    </header>
  );

  // No fixtures at all — header + a single empty state is the whole page.
  if (fixtures.length === 0) {
    return (
      <div className="pt-6">
        {Header}
        <div className="mt-6">
          <EmptyState
            title="No matches yet"
            message="Fixtures will appear here."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6">
      {Header}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ---------- Main column ---------- */}
        <div className="lg:col-span-8">
          {/* HERO */}
          {hero && (
            <Link
              href={`/match/${hero.id}`}
              className={`group block overflow-hidden rounded-card glass-strong glass-hover ${
                liveHero
                  ? "ring-1 ring-secondary/40 shadow-[0_0_55px_-14px_rgba(22,199,132,0.5)]"
                  : "ring-1 ring-primary/20"
              }`}
            >
              <div className="hero-gradient relative px-5 py-7 sm:px-8 sm:py-9">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />

                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {liveHero ? (
                      <LiveBadge label={statusLabel(hero)} />
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                        Up next
                      </span>
                    )}
                    {hero.stage && (
                      <span className="text-[11px] font-semibold text-tsecondary">
                        {hero.stage}
                      </span>
                    )}
                  </div>
                  {hero.group && (
                    <StatusPill tone="accent">{hero.group}</StatusPill>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Home */}
                  <div className="flex flex-1 flex-col items-center gap-3 text-center">
                    <TeamCrest
                      url={hero.home.crestUrl}
                      label={hero.home.code ?? hero.home.name}
                      size={56}
                    />
                    <span className="text-sm font-bold text-tprimary sm:text-base">
                      {hero.home.name}
                    </span>
                  </div>

                  {/* Score / kickoff */}
                  <div className="flex flex-col items-center px-1 sm:px-2">
                    {liveHero ? (
                      <span className="text-5xl font-black tracking-wider text-secondary tabular-nums sm:text-6xl">
                        {hero.homeScore ?? 0}
                        <span className="px-2 text-ttertiary">:</span>
                        {hero.awayScore ?? 0}
                      </span>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-4xl font-black tracking-wide text-tsecondary tabular-nums sm:text-5xl">
                          {timeOf(hero.kickoff)}
                        </span>
                        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ttertiary">
                          {dayLabel(hero.kickoff)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex flex-1 flex-col items-center gap-3 text-center">
                    <TeamCrest
                      url={hero.away.crestUrl}
                      label={hero.away.code ?? hero.away.name}
                      size={56}
                    />
                    <span className="text-sm font-bold text-tprimary sm:text-base">
                      {hero.away.name}
                    </span>
                  </div>
                </div>

                {(hero.venue || hero.city) && (
                  <p className="mt-6 text-center text-[11px] font-medium text-ttertiary">
                    {[hero.venue, hero.city].filter(Boolean).join(" • ")}
                  </p>
                )}
              </div>
            </Link>
          )}

          {/* Live now — remaining simultaneous live matches */}
          {otherLive.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className="live-dot h-2 w-2 rounded-full bg-secondary" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-secondary">
                  Live now
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherLive.map((f) => (
                  <MatchCard key={f.id} f={f} />
                ))}
              </div>
            </div>
          )}

          {/* Today */}
          <SectionHeader title="Today" />
          {todayList.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {todayList.map((f) => (
                <MatchCard key={f.id} f={f} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matches today"
              message="Check the upcoming fixtures."
            />
          )}
        </div>

        {/* ---------- Right rail ---------- */}
        {/* Not sticky: backdrop-filter (glass) inside a position:sticky ancestor
            glitches in several browsers (panels paint over siblings). */}
        <aside className="lg:col-span-4">
          <SectionHeader title="Upcoming" />
          {upcomingList.length > 0 ? (
            <div className="space-y-2">
              {upcomingList.map((f) => (
                <MatchCard key={f.id} f={f} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing scheduled"
              message="New fixtures will appear here soon."
            />
          )}
        </aside>
      </div>
    </div>
  );
}
