import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

// Server-side data access for the public web frontend. Reads Postgres directly
// (no HTTP round-trip) and returns the same shapes the serializers produce, so
// the web components mirror the Flutter models.

export type Fixture = ReturnType<typeof S.fixture>;
export type Team = ReturnType<typeof S.teamLight>;
export type TeamFull = ReturnType<typeof S.teamFull>;
export type MatchEvent = ReturnType<typeof S.matchEvent>;
export type TeamStats = ReturnType<typeof S.teamStats>;
export type Lineup = ReturnType<typeof S.lineup>;
export type GroupStanding = ReturnType<typeof S.groupStandings>[number];

const LIVE = ["live", "halfTime"];

export async function getFixtures(): Promise<Fixture[]> {
  const rows = await prisma.fixture.findMany({
    include: { home: true, away: true },
    orderBy: { kickoff: "asc" },
  });
  return rows.map(S.fixture);
}

export async function getFixture(id: number) {
  const f = await prisma.fixture.findUnique({
    where: { id },
    include: { home: true, away: true },
  });
  return f ? S.fixture(f) : null;
}

export async function getEvents(id: number): Promise<MatchEvent[]> {
  const rows = await prisma.matchEvent.findMany({
    where: { fixtureId: id },
    orderBy: { minute: "asc" },
  });
  return rows.map(S.matchEvent);
}

export async function getLineups(id: number): Promise<Lineup[]> {
  const rows = await prisma.lineup.findMany({ where: { fixtureId: id } });
  return rows.map(S.lineup);
}

export async function getStats(id: number): Promise<TeamStats[]> {
  const rows = await prisma.teamStats.findMany({ where: { fixtureId: id } });
  return rows.map(S.teamStats);
}

export async function getTeams(): Promise<Team[]> {
  const rows = await prisma.team.findMany({
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });
  return rows.map(S.teamLight);
}

export async function getTeam(id: number): Promise<TeamFull | null> {
  const t = await prisma.team.findUnique({
    where: { id },
    include: { players: { orderBy: { number: "asc" } } },
  });
  return t ? S.teamFull(t) : null;
}

export async function getStandings(): Promise<GroupStanding[]> {
  const rows = await prisma.standingRow.findMany({ include: { team: true } });
  return S.groupStandings(rows);
}

// ---- derived helpers for the Home page ----

export function isLive(f: Fixture) {
  return LIVE.includes(f.status);
}

export async function getHomeData() {
  const fixtures = await getFixtures();
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const live = fixtures.filter(isLive);
  const today = fixtures.filter(
    (f) => f.kickoff.slice(0, 10) === todayKey && f.status !== "finished"
  );
  const upcoming = fixtures
    .filter((f) => f.status === "scheduled")
    .slice(0, 8);
  return { fixtures, live, today, upcoming };
}
