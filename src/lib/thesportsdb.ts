/**
 * TheSportsDB provider (free tier). Drop-in replacement for the API-Football
 * client: exports the SAME fetcher names/shapes that `sync.ts` consumes, so the
 * sync engine and everything downstream is unchanged.
 *
 * Free tier covers: fixtures (eventsseason), standings (lookuptable), teams +
 * badges (lookup_all_teams), squads (lookup_all_players). Live minute-by-minute,
 * lineups and event timelines are premium-only — those fetchers return null so
 * `sync.ts` no-ops them (existing/seed data is preserved).
 *
 * League 4429 = "FIFA World Cup".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "@/lib/db";

const KEY = process.env.THESPORTSDB_KEY ?? "3";
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;
const LEAGUE = process.env.TSDB_LEAGUE_ID ?? "4429";
const SEASON = process.env.TSDB_SEASON ?? "2026";

const TTL = {
  teams: Number(process.env.TTL_TEAMS_MS ?? 7 * 24 * 3600_000),
  squad: Number(process.env.TTL_SQUAD_MS ?? 7 * 24 * 3600_000),
  fixtures: Number(process.env.TTL_FIXTURES_MS ?? 30 * 60_000), // 30m
  standings: Number(process.env.TTL_STANDINGS_MS ?? 30 * 60_000),
  live: Number(process.env.TTL_LIVE_MS ?? 90_000),
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ---- TTL-cached GET (reuses the ApiCall table; returns null when fresh) ----

async function cachedGet(endpoint: string, path: string, ttlMs: number): Promise<any | null> {
  const row = await prisma.apiCall.findUnique({ where: { endpoint } });
  if (row && Date.now() - row.fetchedAt.getTime() < ttlMs) return null; // still fresh → skip
  await prisma.apiCall.upsert({
    where: { endpoint },
    create: { endpoint },
    update: { fetchedAt: new Date() },
  });
  try {
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) {
      console.warn(`[tsdb] ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[tsdb] ${path} failed:`, err);
    return null;
  }
}

// ---- status / kickoff mapping ----

function mapStatus(s?: string): string {
  const x = (s ?? "").toUpperCase().trim();
  if (["FT", "MATCH FINISHED", "AET", "PEN", "FINISHED", "AWARDED"].includes(x)) return "finished";
  if (["HT", "HALF TIME", "HALF-TIME"].includes(x)) return "halfTime";
  if (["1H", "2H", "ET", "P", "LIVE", "IN PLAY", "PLAYING", "1ST HALF", "2ND HALF"].includes(x))
    return "live";
  if (["PST", "POSTPONED"].includes(x)) return "postponed";
  if (["CANC", "CANCELLED", "ABD", "ABANDONED"].includes(x)) return "cancelled";
  return "scheduled"; // NS / Not Started / "" / TBD
}

function kickoff(ev: any): Date {
  if (ev.strTimestamp) {
    const d = new Date(ev.strTimestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  // TheSportsDB date/time are UTC.
  const date = ev.dateEvent ?? "2026-06-11";
  const time = ev.strTime ?? "00:00:00";
  const d = new Date(`${date}T${time}Z`);
  return Number.isNaN(d.getTime()) ? new Date(`${date}T00:00:00Z`) : d;
}

function mapEvent(ev: any) {
  return {
    id: toNum(ev.idEvent),
    kickoff: kickoff(ev),
    homeId: toNum(ev.idHomeTeam),
    awayId: toNum(ev.idAwayTeam),
    homeName: ev.strHomeTeam ?? null,
    homeLogo: ev.strHomeTeamBadge ?? null,
    awayName: ev.strAwayTeam ?? null,
    awayLogo: ev.strAwayTeamBadge ?? null,
    homeScore: toNum(ev.intHomeScore),
    awayScore: toNum(ev.intAwayScore),
    status: mapStatus(ev.strStatus),
    minute: toNum(ev.intProgress) ?? null, // premium; usually absent on free
    stage: null as string | null,
    group: null as string | null,
    round: toNum(ev.intRound),
    venue: ev.strVenue ?? null,
    city: null as string | null,
    referee: null as string | null,
  };
}

// ---- fetchers (same names/shapes as the API-Football provider) ----

export async function fetchFixtures() {
  const json = await cachedGet("tsdb:fixtures", `eventsseason.php?id=${LEAGUE}&s=${SEASON}`, TTL.fixtures);
  if (json === null) return null;
  const events: any[] = json.events ?? [];
  return events.map(mapEvent).filter((f) => f.id != null);
}

export async function fetchLiveFixtures() {
  // Free tier has no dedicated livescore; reuse the season feed and keep only
  // in-play matches. (Usually empty on free, which is fine — no-op.)
  const json = await cachedGet("tsdb:live", `eventsseason.php?id=${LEAGUE}&s=${SEASON}`, TTL.live);
  if (json === null) return null;
  const events: any[] = json.events ?? [];
  return events
    .map(mapEvent)
    .filter((f) => f.id != null && (f.status === "live" || f.status === "halfTime"));
}

export async function fetchStandings() {
  const json = await cachedGet("tsdb:standings", `lookuptable.php?l=${LEAGUE}&s=${SEASON}`, TTL.standings);
  if (json === null) return null;
  const table: any[] = json.table ?? [];
  return table
    .map((r) => ({
      // No real group split on the free WC table yet — use the description
      // (e.g. "Group A" once available, else a single table label).
      group: cleanGroup(r.strGroup ?? r.strDescription),
      teamId: toNum(r.idTeam),
      teamName: r.strTeam ?? null,
      teamLogo: r.strBadge ?? null,
      rank: toNum(r.intRank) ?? 0,
      played: toNum(r.intPlayed) ?? 0,
      win: toNum(r.intWin) ?? 0,
      draw: toNum(r.intDraw) ?? 0,
      loss: toNum(r.intLoss) ?? 0,
      goalsFor: toNum(r.intGoalsFor) ?? 0,
      goalsAgainst: toNum(r.intGoalsAgainst) ?? 0,
      points: toNum(r.intPoints) ?? 0,
      form: r.strForm || null,
    }))
    .filter((r) => r.teamId != null);
}

function cleanGroup(s?: string): string {
  const v = (s ?? "").trim();
  if (!v) return "Table";
  const m = v.match(/group\s+([a-l])/i);
  return m ? m[1].toUpperCase() : v;
}

export async function fetchTeams() {
  const json = await cachedGet("tsdb:teams", `lookup_all_teams.php?id=${LEAGUE}`, TTL.teams);
  if (json === null) return null;
  const teams: any[] = json.teams ?? [];
  return teams
    .map((t) => ({
      id: toNum(t.idTeam),
      name: t.strTeam ?? null,
      code: t.strTeamShort ?? null,
      crestUrl: t.strBadge ?? null,
      flagUrl: t.strBadge ?? null,
    }))
    .filter((t) => t.id != null);
}

export async function fetchSquad(teamId: number) {
  const json = await cachedGet(`tsdb:squad:${teamId}`, `lookup_all_players.php?id=${teamId}`, TTL.squad);
  if (json === null) return null;
  const players: any[] = json.player ?? json.players ?? [];
  return players
    .map((p) => ({
      id: toNum(p.idPlayer),
      teamId,
      name: p.strPlayer ?? null,
      number: toNum(p.strNumber),
      position: p.strPosition ?? null,
      photoUrl: p.strCutout ?? p.strThumb ?? null,
      age: null as number | null,
    }))
    .filter((p) => p.id != null);
}

// Premium-only on the free tier — return null so sync.ts leaves existing data.
// Typed as `any[] | null` so the provider union keeps the array shape.
export async function fetchEvents(_fixtureId: number): Promise<any[] | null> {
  return null;
}
export async function fetchLineups(_fixtureId: number): Promise<any[] | null> {
  return null;
}
export async function fetchStatistics(_fixtureId: number): Promise<any[] | null> {
  return null;
}

/** Today's provider usage (kept for the cron response shape). */
export async function apiUsage() {
  return { used: 0, limit: 0, remaining: 0, provider: "thesportsdb" };
}
