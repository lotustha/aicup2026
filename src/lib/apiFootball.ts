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

const HOST = process.env.API_FOOTBALL_HOST ?? "v3.football.api-sports.io";
const LEAGUE = Number(process.env.WC_LEAGUE_ID ?? "1");
const SEASON = Number(process.env.WC_SEASON ?? "2026");

async function apiGet(path: string, params: Record<string, string | number> = {}): Promise<any[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY is not set");
  const url = new URL(`https://${HOST}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football ${path} errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
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
  const raw = await apiGet("teams", { league: LEAGUE, season: SEASON });
  return raw.map((x: any) => ({
    id: x.team?.id,
    name: x.team?.name,
    code: x.team?.code ?? null,
    crestUrl: x.team?.logo ?? null,
    flagUrl: x.team?.logo ?? null,
  }));
}

export async function fetchSquad(teamId: number) {
  const raw = await apiGet("players/squads", { team: teamId });
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
  const raw = await apiGet("standings", { league: LEAGUE, season: SEASON });
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
  const raw = await apiGet("fixtures", { league: LEAGUE, season: SEASON });
  return raw.map(mapFixture);
}

export async function fetchLiveFixtures() {
  const raw = await apiGet("fixtures", { league: LEAGUE, season: SEASON, live: "all" });
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
  const raw = await apiGet("fixtures/events", { fixture: fixtureId });
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
  const raw = await apiGet("fixtures/lineups", { fixture: fixtureId });
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
  const raw = await apiGet("fixtures/statistics", { fixture: fixtureId });
  return raw.map((s: any) => {
    const get = (type: string) =>
      s.statistics?.find((it: any) => it.type === type)?.value ?? null;
    const num = (v: any) => (typeof v === "number" ? v : parseInt(v) || 0);
    const pct = (v: any) =>
      typeof v === "string" ? parseInt(v.replace("%", "")) || null : (v ?? null);
    return {
      fixtureId,
      teamId: s.team?.id,
      possession: pct(get("Ball Possession")),
      shots: num(get("Total Shots")),
      shotsOnTarget: num(get("Shots on Goal")),
      corners: num(get("Corner Kicks")),
      fouls: num(get("Fouls")),
      offsides: num(get("Offsides")),
      yellowCards: num(get("Yellow Cards")),
      redCards: num(get("Red Cards")),
      passes: num(get("Total passes")),
      passAccuracy: pct(get("Passes %")),
    };
  });
}
