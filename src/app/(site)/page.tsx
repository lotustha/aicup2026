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
import { statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { fixtures, live, today, upcoming } = await getHomeData();

  const hero = live[0];
  const otherLive = live.slice(1);

  // De-duplicate: live matches shown in the hero / "Live now" row should not
  // reappear in Today, and Today's fixtures should not repeat under Upcoming.
  const liveIds = new Set(live.map((f) => f.id));
  const todayList = today.filter((f) => !liveIds.has(f.id));
  const todayIds = new Set(todayList.map((f) => f.id));
  const upcomingList = upcoming.filter((f) => !todayIds.has(f.id));

  const Header = (
    <header className="flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
          Today
        </p>
        <h1 className="mt-1 text-3xl font-black leading-tight tracking-tight text-tprimary">
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

      {/* HERO — featured live match */}
      {hero && (
        <Link
          href={`/match/${hero.id}`}
          className="group mt-6 block overflow-hidden rounded-card border border-secondary/30 bg-surface shadow-[0_0_40px_-12px_rgba(22,199,132,0.45)] transition-shadow hover:shadow-[0_0_55px_-10px_rgba(22,199,132,0.6)]"
        >
          <div className="hero-gradient relative px-5 py-6">
            {/* subtle green glow accent */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/60 to-transparent" />

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LiveBadge label={statusLabel(hero)} />
                {hero.stage && (
                  <span className="text-[11px] font-semibold text-tsecondary">
                    {hero.stage}
                  </span>
                )}
              </div>
              {hero.group && <StatusPill tone="accent">{hero.group}</StatusPill>}
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Home */}
              <div className="flex flex-1 flex-col items-center gap-2 text-center">
                <TeamCrest
                  url={hero.home.crestUrl}
                  label={hero.home.code ?? hero.home.name}
                  size={48}
                />
                <span className="text-sm font-bold text-tprimary">
                  {hero.home.name}
                </span>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center px-2">
                <span className="text-4xl font-black tracking-wider text-secondary tabular-nums">
                  {hero.homeScore ?? 0}
                  <span className="px-2 text-ttertiary">:</span>
                  {hero.awayScore ?? 0}
                </span>
              </div>

              {/* Away */}
              <div className="flex flex-1 flex-col items-center gap-2 text-center">
                <TeamCrest
                  url={hero.away.crestUrl}
                  label={hero.away.code ?? hero.away.name}
                  size={48}
                />
                <span className="text-sm font-bold text-tprimary">
                  {hero.away.name}
                </span>
              </div>
            </div>

            {(hero.venue || hero.city) && (
              <p className="mt-5 text-center text-[11px] font-medium text-ttertiary">
                {[hero.venue, hero.city].filter(Boolean).join(" • ")}
              </p>
            )}
          </div>
        </Link>
      )}

      {/* Live now — remaining live matches */}
      {otherLive.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2 px-1 pb-2">
            <span className="live-dot h-2 w-2 rounded-full bg-secondary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-secondary">
              Live now
            </h2>
          </div>
          <div className="space-y-2">
            {otherLive.map((f) => (
              <MatchCard key={f.id} f={f} />
            ))}
          </div>
        </div>
      )}

      {/* Today */}
      <SectionHeader title="Today" />
      {todayList.length > 0 ? (
        <div className="space-y-2">
          {todayList.map((f) => (
            <MatchCard key={f.id} f={f} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No matches today"
          message="Check the upcoming fixtures below."
        />
      )}

      {/* Upcoming */}
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
    </div>
  );
}
