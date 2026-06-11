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
      {/* 1. Back link */}
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-tsecondary transition-colors hover:text-tprimary"
      >
        <span aria-hidden className="text-base leading-none">
          &larr;
        </span>
        Back
      </Link>

      {/* 2. Header */}
      <Header fixture={fixture} live={live} finished={finished} />

      {/* 3. Summary */}
      <h2 className="pt-5 pb-2 text-lg font-bold text-tprimary">Summary</h2>
      <Timeline fixture={fixture} events={events} />

      {/* 4. Lineups */}
      <h2 className="pt-5 pb-2 text-lg font-bold text-tprimary">Line-ups</h2>
      <Lineups fixture={fixture} lineups={lineups} />

      {/* 5. Stats */}
      <h2 className="pt-5 pb-2 text-lg font-bold text-tprimary">Statistics</h2>
      <Stats fixture={fixture} stats={stats} />
    </div>
  );
}

/* ---------------------------------------------------------------- Header */

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
    <section className="hero-gradient relative overflow-hidden rounded-2xl border border-border px-4 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      {/* subtle pitch glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-primary/20 blur-3xl"
      />

      {/* stage pill */}
      <div className="relative mb-5 flex justify-center">
        <span className="rounded-full bg-surface2/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tsecondary ring-1 ring-border/60">
          {fixture.stage ?? "World Cup"}
        </span>
      </div>

      {/* 3-column score row */}
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* home */}
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamCrest
            url={fixture.home.crestUrl}
            label={fixture.home.code ?? fixture.home.name}
            size={60}
          />
          <span className="text-sm font-bold text-tprimary">
            {fixture.home.name}
          </span>
        </div>

        {/* center */}
        <div className="flex min-w-[120px] flex-col items-center gap-2 px-1">
          {scheduled ? (
            <span className="text-4xl font-black tracking-tight text-tprimary">
              {timeOf(fixture.kickoff)}
            </span>
          ) : (
            <span
              className={`text-5xl font-black leading-none tracking-tight tabular-nums ${
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

        {/* away */}
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamCrest
            url={fixture.away.crestUrl}
            label={fixture.away.code ?? fixture.away.name}
            size={60}
          />
          <span className="text-sm font-bold text-tprimary">
            {fixture.away.name}
          </span>
        </div>
      </div>

      {/* venue + date */}
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

const EVENT_META: Record<
  string,
  { icon: string; color: string }
> = {
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
    (a, b) =>
      a.minute - b.minute || (a.extraMinute ?? 0) - (b.extraMinute ?? 0)
  );

  return (
    <div className="relative card overflow-hidden px-2 py-4">
      {/* center spine */}
      <div
        aria-hidden
        className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-border"
      />
      <ol className="relative space-y-3">
        {sorted.map((e, i) => {
          const meta = EVENT_META[e.type] ?? {
            icon: "•",
            color: "text-tsecondary",
          };
          const isHome = e.teamId === fixture.home.id;
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              {/* left slot */}
              <div className="flex justify-end">
                {isHome && <EventCard event={e} meta={meta} align="right" />}
              </div>

              {/* minute pill */}
              <div className="z-10 flex justify-center">
                <span className="rounded-full bg-surface2 px-2 py-1 text-[10px] font-extrabold tabular-nums text-tsecondary ring-1 ring-border">
                  {eventMinute(e)}
                </span>
              </div>

              {/* right slot */}
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
  // include any lineups not matched to home/away (defensive)
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
    <div className="space-y-4">
      {ordered.map((l, i) => (
        <LineupCard key={i} lineup={l} teamName={teamName(l.teamId)} />
      ))}
    </div>
  );
}

function LineupCard({
  lineup,
  teamName,
}: {
  lineup: Lineup;
  teamName: string;
}) {
  const starters = (lineup.starters ?? []) as LineupSlot[];
  const subs = (lineup.substitutes ?? []) as LineupSlot[];

  // group starters by row (from grid "row:col"), rows ascending,
  // columns ascending within each row.
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
      {/* meta */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-tprimary">{teamName}</span>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          {lineup.formation && (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-tsecondary">
              {lineup.formation}
            </span>
          )}
          {lineup.coach && (
            <span className="text-ttertiary">{lineup.coach}</span>
          )}
        </div>
      </div>

      {/* pitch */}
      {rows.length > 0 ? (
        <div className="mx-3 mb-3 rounded-2xl bg-[linear-gradient(180deg,#12a05e,#0e7a4b)] p-3">
          <div className="relative">
            {/* pitch markings */}
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
                <div
                  key={ri}
                  className="flex items-start justify-around gap-1"
                >
                  {row.map((p) => (
                    <PitchPlayer key={p.playerId} slot={p} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* substitutes */}
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xs font-black tabular-nums text-[#0e7a4b] shadow-md ring-2 ring-white/40">
        {slot.number ?? "–"}
      </span>
      <span className="max-w-full truncate text-[10px] font-semibold text-white drop-shadow">
        {lastName(slot.name)}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- Stats */

function Stats({
  fixture,
  stats,
}: {
  fixture: Fixture;
  stats: TeamStats[];
}) {
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
      {/* possession dual bar */}
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
            <div
              className="h-full bg-secondary"
              style={{ width: `${hPossPct}%` }}
            />
            <div className="h-full bg-info" style={{ width: `${aPossPct}%` }} />
          </div>
        </div>
      )}

      {/* stat rows */}
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
