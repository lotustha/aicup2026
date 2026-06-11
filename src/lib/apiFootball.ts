/**
 * API-Football (api-sports.io v3) client + mappers.
 *
 * Holds the API key server-side and normalizes responses into shapes ready for
 * Prisma upserts (matching prisma/schema.prisma). Status/type enums are mapped
 * to the SAME string values the Flutter models use.
 *
 * NOTE: response shapes follow API-Football v3 docs. Mappers are defensive
 * (optional chaining); if a field name differs on your plan, adjust here only.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/db";

const HOST = process.env.API_FOOTBALL_HOST ?? "v3.football.api-sports.io";
const LEAGUE = Number(process.env.WC_LEAGUE_ID ?? "1");
const SEASON = Number(process.env.WC_SEASON ?? "2026");

// Hard daily request cap so the free-tier quota (~100/day) is never blown.
const DAILY_LIMIT = Number(process.env.API_FOOTBALL_DAILY_LIMIT ?? "90");

// Per-endpoint cache TTLs (ms). Within the TTL the poller serves the data
// already in Postgres instead of spending a request. Tune via env if needed.
const num = (v: string | undefined, d: number) => (v ? Number(v) : d);
export const TTL = {
  teams: num(process.env.TTL_TEAMS_MS, 7 * 24 * 3600_000), // ~weekly
  squad: num(process.env.TTL_SQUAD_MS, 7 * 24 * 3600_000),
  fixtures: num(process.env.TTL_FIXTURES_MS, 6 * 3600_000), // 6h
  standings: num(process.env.TTL_STANDINGS_MS, 6 * 3600_000),
  live: num(process.env.TTL_LIVE_MS, 90_000), // 90s
  events: num(process.env.TTL_EVENTS_MS, 90_000),
  lineups: num(process.env.TTL_LINEUPS_MS, 3600_000), // 1h (rarely change)
  stats: num(process.env.TTL_STATS_MS, 180_000), // 3m
};

const dayKey = () => new Date().toISOString().slice(0, 10);

async function quotaRemaining(): Promise<number> {
  const row = await prisma.apiQuota.findUnique({ where: { day: dayKey() } });
  return DAILY_LIMIT - (row?.count ?? 0);
}

async function bumpQuota(): Promise<void> {
  const day = dayKey();
  await prisma.apiQuota.upsert({
    where: { day },
    create: { day, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/** True if this endpoint's cached data is older than its TTL (so worth fetching). */
async function isDue(endpoint: string, ttlMs: number): Promise<boolean> {
  const row = await prisma.apiCall.findUnique({ where: { endpoint } });
  return !row || Date.now() - row.fetchedAt.getTime() >= ttlMs;
}

async function markFetched(endpoint: string): Promise<void> {
  await prisma.apiCall.upsert({
    where: { endpoint },
    create: { endpoint },
    update: { fetchedAt: new Date() },
  });
}

/**
 * GET an API-Football endpoint. When a `gate` is supplied the call is:
 *   1. skipped if cached data is still within its TTL, and
 *   2. skipped if today's request quota is exhausted.
 * On skip it returns `null` (distinct from `[]`, which is a genuine empty
 * response) so callers can no-op WITHOUT wiping existing Postgres data. This
 * keeps real API requests to a minimum.
 */
async function apiGet(
  path: string,
  params: Record<string, string | number> = {},
  gate?: { endpoint: string; ttlMs: number }
): Promise<any[] | null> {
  if (gate) {
    if (!(await isDue(gate.endpoint, gate.ttlMs))) return null;
    if ((await quotaRemaining()) <= 0) {
      console.warn(`[api-football] daily quota (${DAILY_LIMIT}) reached — skipping ${gate.endpoint}`);
      return null;
    }
  }
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set");
  const url = new URL(`https://${HOST}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  // We are about to spend a request. Count it AND mark the endpoint fetched
  // BEFORE the call, so the TTL throttle holds even when the upstream errors
  // (e.g. "free plan can't access this season"). Otherwise a persistently
  // failing endpoint would re-hit the API every cycle and drain the quota.
  if (gate) {
    await bumpQuota();
    await markFetched(gate.endpoint);
  }

  try {
    const res = await fetch(url, { headers: { "x-apisports-key": key } });
    if (!res.ok) {
      console.warn(`[api-football] ${path} → HTTP ${res.status}`);
      if (gate) return null; // throttled; try again after TTL
      throw new Error(`API-Football ${path} → ${res.status}`);
    }
    const json = await res.json();
    if (json.errors && Object.keys(json.errors).length > 0) {
      // Plan/parameter errors are expected (e.g. season not on the free plan):
      // log once per TTL window and no-op rather than throw + retry-storm.
      console.warn(`[api-football] ${path}: ${JSON.stringify(json.errors)}`);
      if (gate) return null;
      throw new Error(`API-Football ${path} errors: ${JSON.stringify(json.errors)}`);
    }
    return json.response ?? [];
  } catch (err) {
    if (gate) {
      console.warn(`[api-football] ${path} failed:`, err);
      return null; // throttled; recovers after TTL
    }
    throw err;
  }
}

/** Today's API-Football usage (for the admin dashboard / cron response). */
export async function apiUsage(): Promise<{ used: number; limit: number; remaining: number }> {
  const remaining = await quotaRemaining();
  return { used: DAILY_LIMIT - remaining, limit: DAILY_LIMIT, remaining };
}

// ---- enum mapping ----

export function mapStatus(short?: string): string {
  switch (short) {
    case "NS":
    case "TBD":
      return "scheduled";
    case "1H":
    case "2H":
    case "ET":
    case "P":
    case "LIVE":
      return "live";
    case "HT":
      return "halfTime";
    case "FT":
    case "AET":
    case "PEN":
      return "finished";
    case "PST":
      return "postponed";
    case "CANC":
    case "ABD":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function mapEventType(type?: string, detail?: string): string {
  const t = (type ?? "").toLowerCase();
  const d = (detail ?? "").toLowerCase();
  if (t === "goal") {
    if (d.includes("own")) return "ownGoal";
    if (d.includes("penalty")) return "penalty";
    return "goal";
  }
  if (t === "card") return d.includes("red") ? "redCard" : "yellowCard";
  if (t === "subst") return "substitution";
  if (t === "var") return "var_";
  return "goal";
}

/** Derive a human stage label + optional group letter from API "round" text. */
function mapStageGroup(round?: string): { stage: string | null; group: string | null; round: number | null } {
  if (!round) return { stage: null, group: null, round: null };
  const r = round.trim();
  const groupMatch = r.match(/group\s+([a-l])/i);
  if (groupMatch) {
    const g = groupMatch[1].toUpperCase();
    return { stage: `Group ${g}`, group: g, round: null };
  }
  const map: Record<string, number> = {
    "round of 32": 1,
    "round of 16": 2,
    "quarter-finals": 3,
    "semi-finals": 4,
    "3rd place final": 5,
    "final": 6,
  };
  const key = Object.keys(map).find((k) => r.toLowerCase().includes(k));
  return { stage: r, group: null, round: key ? map[key] : null };
}

// ---- fetchers + mappers (return Prisma-ready objects) ----

export async function fetchTeams() {
  const raw = await apiGet("teams", { league: LEAGUE, season: SEASON }, { endpoint: "teams", ttlMs: TTL.teams });
  if (raw === null) return null;
  return raw.map((x: any) => ({
    id: x.team?.id,
    name: x.team?.name,
    code: x.team?.code ?? null,
    crestUrl: x.team?.logo ?? null,
    flagUrl: x.team?.logo ?? null,
  }));
}

export async function fetchSquad(teamId: number) {
  const raw = await apiGet("players/squads", { team: teamId }, { endpoint: `squad:${teamId}`, ttlMs: TTL.squad });
  if (raw === null) return null;
  const players = raw[0]?.players ?? [];
  return players.map((p: any) => ({
    id: p.id,
    teamId,
    name: p.name,
    number: p.number ?? null,
    position: p.position ?? null,
    photoUrl: p.photo ?? null,
    age: p.age ?? null,
  }));
}

export async function fetchStandings() {
  const raw = await apiGet("standings", { league: LEAGUE, season: SEASON }, { endpoint: "standings", ttlMs: TTL.standings });
  if (raw === null) return null;
  const groups: any[][] = raw[0]?.league?.standings ?? [];
  const rows: any[] = [];
  for (const table of groups) {
    for (const row of table) {
      const group = (row.group ?? "").replace(/group\s+/i, "").trim().toUpperCase() || null;
      rows.push({
        group,
        teamId: row.team?.id,
        teamName: row.team?.name,
        teamLogo: row.team?.logo,
        rank: row.rank,
        played: row.all?.played ?? 0,
        win: row.all?.win ?? 0,
        draw: row.all?.draw ?? 0,
        loss: row.all?.lose ?? 0,
        goalsFor: row.all?.goals?.for ?? 0,
        goalsAgainst: row.all?.goals?.against ?? 0,
        points: row.points ?? 0,
        form: row.form ?? null,
      });
    }
  }
  return rows;
}

export async function fetchFixtures() {
  const raw = await apiGet("fixtures", { league: LEAGUE, season: SEASON }, { endpoint: "fixtures", ttlMs: TTL.fixtures });
  if (raw === null) return null;
  return raw.map(mapFixture);
}

export async function fetchLiveFixtures() {
  const raw = await apiGet(
    "fixtures",
    { league: LEAGUE, season: SEASON, live: "all" },
    { endpoint: "fixtures:live", ttlMs: TTL.live }
  );
  if (raw === null) return null;
  return raw.map(mapFixture);
}

function mapFixture(x: any) {
  const sg = mapStageGroup(x.league?.round);
  return {
    id: x.fixture?.id,
    kickoff: x.fixture?.date ? new Date(x.fixture.date) : new Date(),
    homeId: x.teams?.home?.id,
    awayId: x.teams?.away?.id,
    homeName: x.teams?.home?.name,
    homeLogo: x.teams?.home?.logo,
    awayName: x.teams?.away?.name,
    awayLogo: x.teams?.away?.logo,
    homeScore: x.goals?.home ?? null,
    awayScore: x.goals?.away ?? null,
    status: mapStatus(x.fixture?.status?.short),
    minute: x.fixture?.status?.elapsed ?? null,
    stage: sg.stage,
    group: sg.group,
    round: sg.round,
    venue: x.fixture?.venue?.name ?? null,
    city: x.fixture?.venue?.city ?? null,
    referee: x.fixture?.referee ?? null,
  };
}

export async function fetchEvents(fixtureId: number) {
  const raw = await apiGet("fixtures/events", { fixture: fixtureId }, { endpoint: `events:${fixtureId}`, ttlMs: TTL.events });
  if (raw === null) return null;
  return raw.map((e: any) => ({
    fixtureId,
    minute: e.time?.elapsed ?? 0,
    extraMinute: e.time?.extra ?? null,
    type: mapEventType(e.type, e.detail),
    teamId: e.team?.id,
    playerName: e.player?.name ?? null,
    assistName: e.assist?.name ?? null,
    detail: e.detail ?? null,
  }));
}

export async function fetchLineups(fixtureId: number) {
  const raw = await apiGet("fixtures/lineups", { fixture: fixtureId }, { endpoint: `lineups:${fixtureId}`, ttlMs: TTL.lineups });
  if (raw === null) return null;
  return raw.map((l: any) => ({
    fixtureId,
    teamId: l.team?.id,
    formation: l.formation ?? null,
    coach: l.coach?.name ?? null,
    starters: (l.startXI ?? []).map((s: any) => slot(s.player)),
    substitutes: (l.substitutes ?? []).map((s: any) => slot(s.player)),
  }));
}

function slot(p: any) {
  return {
    playerId: p?.id ?? 0,
    name: p?.name ?? "",
    number: p?.number ?? null,
    position: p?.pos ?? null,
    grid: p?.grid ?? null,
    photoUrl: null,
  };
}

export async function fetchStatistics(fixtureId: number) {
  const raw = await apiGet("fixtures/statistics", { fixture: fixtureId }, { endpoint: `stats:${fixtureId}`, ttlMs: TTL.stats });
  if (raw === null) return null;
  return raw.map((s: any) => {
    const get = (type: string) =>
      s.statistics?.find((it: any) => it.type === type)?.value ?? null;
    const toNum = (v: any) => (typeof v === "number" ? v : parseInt(v) || 0);
    const pct = (v: any) =>
      typeof v === "string" ? parseInt(v.replace("%", "")) || null : (v ?? null);
    return {
      fixtureId,
      teamId: s.team?.id,
      possession: pct(get("Ball Possession")),
      shots: toNum(get("Total Shots")),
      shotsOnTarget: toNum(get("Shots on Goal")),
      corners: toNum(get("Corner Kicks")),
      fouls: toNum(get("Fouls")),
      offsides: toNum(get("Offsides")),
      yellowCards: toNum(get("Yellow Cards")),
      redCards: toNum(get("Red Cards")),
      passes: toNum(get("Total passes")),
      passAccuracy: pct(get("Passes %")),
    };
  });
}
