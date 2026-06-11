import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFixture,
  getEvents,
  getLineups,
  getStats,
  isLive,
} from "@/lib/site-data";
import type {
  Fixture,
  MatchEvent,
  TeamStats,
  Lineup,
} from "@/lib/site-data";
import { TeamCrest, LiveBadge } from "@/components/site/ui";
import { statusLabel, fullDate, timeOf } from "@/lib/format";

export const dynamic = "force-dynamic";

type LineupSlot = {
  playerId: number;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
  photoUrl: string | null;
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fid = Number(id);

  const fixture = await getFixture(fid);
  if (!fixture) notFound();

  const [events, lineups, stats] = await Promise.all([
    getEvents(fid),
    getLineups(fid),
    getStats(fid),
  ]);

  const live = isLive(fixture);
  const finished = fixture.status === "finished";

  return (
    <div className="pt-4">
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-tsecondary transition-colors hover:text-tprimary"
      >
        <span aria-hidden className="text-base leading-none">&larr;</span>
        Back
      </Link>

      <Header fixture={fixture} live={live} finished={finished} />

      {/* Stream (admin-controlled) gets top billing when present. */}
      <Watch fixture={fixture} live={live} />

      {/* Desktop: timeline + stats side-by-side; lineups full width below. */}
      <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionTitle>Summary</SectionTitle>
          <Timeline fixture={fixture} events={events} />
        </section>
        <section className="lg:col-span-2">
          <SectionTitle>Statistics</SectionTitle>
          <Stats fixture={fixture} stats={stats} />
        </section>
      </div>

      <SectionTitle>Line-ups</SectionTitle>
      <Lineups fixture={fixture} lineups={lineups} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pb-2 pt-5 text-lg font-bold text-tprimary">{children}</h2>
  );
}

/* ------------------------------------------------------------------ Watch */

function Watch({ fixture, live }: { fixture: Fixture; live: boolean }) {
  if (!fixture.streamUrl) {
    // Only nudge for live matches; stay quiet for scheduled/finished.
    if (!live) return null;
    return (
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-5 text-sm text-ttertiary">
        <span aria-hidden>📺</span> No stream available for this match.
      </div>
    );
  }

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-bold text-tprimary">Watch</h2>
        {live && <LiveBadge label={statusLabel(fixture)} />}
      </div>
      <div className="card overflow-hidden">
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={fixture.streamUrl}
            title={`${fixture.home.name} vs ${fixture.away.name} — live stream`}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-ttertiary">
        Stream provided by the broadcaster. Availability may vary by region.
      </p>
    </section>
  );
}

/* ----------------------------------------------------------------- Header */

function Header({
  fixture,
  live,
  finished,
}: {
  fixture: Fixture;
  live: boolean;
  finished: boolean;
}) {
  const scheduled = !live && !finished;
  const venueLine = [fixture.venue, fixture.city].filter(Boolean).join(" • ");

  return (
    <section className="hero-gradient relative overflow-hidden rounded-2xl border border-border px-4 py-7 shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative mb-5 flex justify-center">
        <span className="rounded-full bg-surface2/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tsecondary ring-1 ring-border/60">
          {fixture.stage ?? "World Cup"}
        </span>
      </div>

      <div className="relative mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-end sm:gap-3 sm:text-right">
          <span className="order-2 text-sm font-bold text-tprimary sm:order-1 sm:text-base">
            {fixture.home.name}
          </span>
          <span className="order-1 sm:order-2">
            <TeamCrest
              url={fixture.home.crestUrl}
              label={fixture.home.code ?? fixture.home.name}
              size={64}
            />
          </span>
        </div>

        <div className="flex min-w-[120px] flex-col items-center gap-2 px-1">
          {scheduled ? (
            <span className="text-4xl font-black tracking-tight text-tprimary sm:text-5xl">
              {timeOf(fixture.kickoff)}
            </span>
          ) : (
            <span
              className={`text-5xl font-black leading-none tracking-tight tabular-nums sm:text-6xl ${
                live ? "text-secondary" : "text-tprimary"
              }`}
            >
              {fixture.homeScore ?? 0}
              <span className="px-2 text-ttertiary">-</span>
              {fixture.awayScore ?? 0}
            </span>
          )}
          <div className="flex items-center justify-center">
            {live ? (
              <LiveBadge label={statusLabel(fixture)} />
            ) : finished ? (
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-ttertiary">
                Full Time
              </span>
            ) : (
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary">
                {statusLabel(fixture)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-start sm:gap-3 sm:text-left">
          <TeamCrest
            url={fixture.away.crestUrl}
            label={fixture.away.code ?? fixture.away.name}
            size={64}
          />
          <span className="text-sm font-bold text-tprimary sm:text-base">
            {fixture.away.name}
          </span>
        </div>
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-1 text-center">
        {venueLine && (
          <p className="text-xs font-semibold text-tsecondary">{venueLine}</p>
        )}
        <p className="text-[11px] text-ttertiary">{fullDate(fixture.kickoff)}</p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Timeline */

const EVENT_META: Record<string, { icon: string; color: string }> = {
  goal: { icon: "⚽", color: "text-secondary" },
  ownGoal: { icon: "⚽", color: "text-primary" },
  penalty: { icon: "⚽", color: "text-secondary" },
  yellowCard: { icon: "🟨", color: "text-accent" },
  redCard: { icon: "🟥", color: "text-primary" },
  substitution: { icon: "🔁", color: "text-info" },
  var_: { icon: "VAR", color: "text-info" },
};

function eventMinute(e: MatchEvent) {
  return e.extraMinute ? `${e.minute}+${e.extraMinute}'` : `${e.minute}'`;
}

function Timeline({
  fixture,
  events,
}: {
  fixture: Fixture;
  events: MatchEvent[];
}) {
  if (events.length === 0) {
    return (
      <p className="card px-4 py-6 text-center text-sm text-ttertiary">
        No events yet
      </p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0)
  );

  return (
    <div className="card relative overflow-hidden px-2 py-4">
      <div
        aria-hidden
        className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-border"
      />
      <ol className="relative space-y-3">
        {sorted.map((e, i) => {
          const meta = EVENT_META[e.type] ?? { icon: "•", color: "text-tsecondary" };
          const isHome = e.teamId === fixture.home.id;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex justify-end">
                {isHome && <EventCard event={e} meta={meta} align="right" />}
              </div>
              <div className="z-10 flex justify-center">
                <span className="rounded-full bg-surface2 px-2 py-1 text-[10px] font-extrabold tabular-nums text-tsecondary ring-1 ring-border">
                  {eventMinute(e)}
                </span>
              </div>
              <div className="flex justify-start">
                {!isHome && <EventCard event={e} meta={meta} align="left" />}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EventCard({
  event,
  meta,
  align,
}: {
  event: MatchEvent;
  meta: { icon: string; color: string };
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex max-w-[92%] items-start gap-2 rounded-xl bg-surface2/60 px-3 py-2 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      <span className={`mt-0.5 shrink-0 text-base font-black leading-none ${meta.color}`}>
        {meta.icon}
      </span>
      <div className="min-w-0">
        {event.playerName && (
          <p className="truncate text-xs font-bold text-tprimary">
            {event.playerName}
          </p>
        )}
        {event.assistName && (
          <p className="truncate text-[11px] text-tsecondary">
            {event.type === "substitution" ? "→ " : "assist "}
            {event.assistName}
          </p>
        )}
        {event.detail && !event.assistName && (
          <p className="truncate text-[11px] text-ttertiary">{event.detail}</p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Lineups */

function lastName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function Lineups({
  fixture,
  lineups,
}: {
  fixture: Fixture;
  lineups: Lineup[];
}) {
  if (lineups.length === 0) {
    return (
      <p className="card px-4 py-6 text-center text-sm text-ttertiary">
        Line-ups available closer to kick-off
      </p>
    );
  }

  const home = lineups.find((l) => l.teamId === fixture.home.id);
  const away = lineups.find((l) => l.teamId === fixture.away.id);
  const ordered = [home, away].filter((l): l is Lineup => Boolean(l));
  for (const l of lineups) {
    if (l !== home && l !== away) ordered.push(l);
  }

  const teamName = (teamId: number) =>
    teamId === fixture.home.id
      ? fixture.home.name
      : teamId === fixture.away.id
      ? fixture.away.name
      : "Team";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ordered.map((l, i) => (
        <LineupCard key={i} lineup={l} teamName={teamName(l.teamId)} />
      ))}
    </div>
  );
}

function LineupCard({ lineup, teamName }: { lineup: Lineup; teamName: string }) {
  const starters = (lineup.starters ?? []) as LineupSlot[];
  const subs = (lineup.substitutes ?? []) as LineupSlot[];

  const rowsMap = new Map<number, LineupSlot[]>();
  const ungridded: LineupSlot[] = [];
  for (const s of starters) {
    const row = s.grid ? Number(s.grid.split(":")[0]) : NaN;
    if (Number.isNaN(row)) {
      ungridded.push(s);
      continue;
    }
    const list = rowsMap.get(row);
    if (list) list.push(s);
    else rowsMap.set(row, [s]);
  }
  const rows = [...rowsMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) =>
      [...list].sort((a, b) => {
        const ca = a.grid ? Number(a.grid.split(":")[1]) : 0;
        const cb = b.grid ? Number(b.grid.split(":")[1]) : 0;
        return ca - cb;
      })
    );
  if (ungridded.length) rows.push(ungridded);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-tprimary">{teamName}</span>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          {lineup.formation && (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-tsecondary">
              {lineup.formation}
            </span>
          )}
          {lineup.coach && <span className="text-ttertiary">{lineup.coach}</span>}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="mx-3 mb-3 rounded-2xl bg-[linear-gradient(180deg,#12a05e,#0e7a4b)] p-3">
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl border border-white/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
            />
            <div className="flex flex-col gap-4 py-3">
              {rows.map((row, ri) => (
                <div key={ri} className="flex items-start justify-around gap-1">
                  {row.map((p) => (
                    <PitchPlayer key={p.playerId} slot={p} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {subs.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ttertiary">
            Substitutes
          </p>
          <p className="text-xs leading-relaxed text-tsecondary">
            {subs
              .map((s) => (s.number ? `${s.number} ${s.name}` : s.name))
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function PitchPlayer({ slot }: { slot: LineupSlot }) {
  return (
    <div className="flex w-14 flex-col items-center gap-1 text-center">
      {slot.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.photoUrl}
          alt={slot.name}
          className="h-10 w-10 rounded-full object-cover shadow-md ring-2 ring-white/70"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xs font-black tabular-nums text-[#0e7a4b] shadow-md ring-2 ring-white/40">
          {slot.number ?? "–"}
        </span>
      )}
      <span className="max-w-full truncate text-[10px] font-semibold text-white drop-shadow">
        {slot.number ? `${slot.number} ` : ""}
        {lastName(slot.name)}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- Stats */

function Stats({ fixture, stats }: { fixture: Fixture; stats: TeamStats[] }) {
  const home = stats.find((s) => s.teamId === fixture.home.id);
  const away = stats.find((s) => s.teamId === fixture.away.id);

  if (stats.length < 2 || !home || !away) {
    return (
      <p className="card px-4 py-6 text-center text-sm text-ttertiary">
        Stats not available
      </p>
    );
  }

  const rows: { label: string; h: number; a: number; suffix?: string }[] = [
    { label: "Shots", h: home.shots, a: away.shots },
    { label: "Shots on target", h: home.shotsOnTarget, a: away.shotsOnTarget },
    { label: "Corners", h: home.corners, a: away.corners },
    { label: "Fouls", h: home.fouls, a: away.fouls },
    { label: "Offsides", h: home.offsides, a: away.offsides },
    { label: "Passes", h: home.passes, a: away.passes },
    {
      label: "Pass accuracy",
      h: home.passAccuracy ?? 0,
      a: away.passAccuracy ?? 0,
      suffix: "%",
    },
  ];

  const hPoss = home.possession ?? null;
  const aPoss = away.possession ?? null;
  const possTotal = (hPoss ?? 0) + (aPoss ?? 0);
  const hPossPct = possTotal ? ((hPoss ?? 0) / possTotal) * 100 : 50;
  const aPossPct = 100 - hPossPct;
  const showPoss = hPoss != null || aPoss != null;

  return (
    <div className="card px-4 py-5">
      {showPoss && (
        <div className="mb-6">
          <div className="mb-2 flex items-end justify-between">
            <span className="text-lg font-black tabular-nums text-secondary">
              {Math.round(hPossPct)}%
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ttertiary">
              Possession
            </span>
            <span className="text-lg font-black tabular-nums text-info">
              {Math.round(aPossPct)}%
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface2">
            <div className="h-full bg-secondary" style={{ width: `${hPossPct}%` }} />
            <div className="h-full bg-info" style={{ width: `${aPossPct}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((r) => {
          const total = r.h + r.a;
          const hPct = total ? (r.h / total) * 100 : 50;
          const aPct = 100 - hPct;
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="w-12 text-left font-bold tabular-nums text-tprimary">
                  {r.h}
                  {r.suffix ?? ""}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-tsecondary">
                  {r.label}
                </span>
                <span className="w-12 text-right font-bold tabular-nums text-tprimary">
                  {r.a}
                  {r.suffix ?? ""}
                </span>
              </div>
              <div className="flex h-1.5 w-full items-center gap-1">
                <div className="flex h-full flex-1 justify-end overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full bg-secondary/80"
                    style={{ width: `${hPct}%` }}
                  />
                </div>
                <div className="flex h-full flex-1 justify-start overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full bg-info/80"
                    style={{ width: `${aPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
