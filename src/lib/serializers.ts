/**
 * Serializers: convert Prisma rows into the exact JSON shapes the Flutter app's
 * freezed models expect (see lib/data/models/* in the app). Field names and enum
 * string values MUST stay in sync with those models:
 *   - Fixture.status  → "scheduled"|"live"|"halfTime"|"finished"|"postponed"|"cancelled"
 *   - MatchEvent.type → "goal"|"ownGoal"|"penalty"|"yellowCard"|"redCard"|"substitution"|"var_"
 * Times are emitted as UTC ISO-8601 strings (Dart DateTime.parse handles them).
 *
 * Inputs are typed loosely (the Prisma client types are only available after
 * `prisma generate`); the documented shapes above are the source of truth.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export function teamLight(t: any) {
  return {
    id: t.id,
    name: t.name,
    code: t.code ?? null,
    crestUrl: t.crestUrl ?? null,
    flagUrl: t.flagUrl ?? null,
    group: t.group ?? null,
    coach: t.coach ?? null,
    squad: [] as unknown[],
  };
}

export function player(p: any) {
  return {
    id: p.id,
    name: p.name,
    number: p.number ?? null,
    position: p.position ?? null,
    photoUrl: p.photoUrl ?? null,
    age: p.age ?? null,
    nationality: p.nationality ?? null,
    goals: p.goals ?? 0,
    assists: p.assists ?? 0,
    appearances: p.appearances ?? 0,
    yellowCards: p.yellowCards ?? 0,
    redCards: p.redCards ?? 0,
  };
}

export function teamFull(t: any) {
  return {
    ...teamLight(t),
    squad: (t.players ?? []).map(player),
  };
}

export function fixture(f: any) {
  return {
    id: f.id,
    kickoff: new Date(f.kickoff).toISOString(),
    home: teamLight(f.home),
    away: teamLight(f.away),
    homeScore: f.homeScore ?? null,
    awayScore: f.awayScore ?? null,
    status: f.status ?? "scheduled",
    minute: f.minute ?? null,
    stage: f.stage ?? null,
    group: f.group ?? null,
    venue: f.venue ?? null,
    city: f.city ?? null,
    referee: f.referee ?? null,
    round: f.round ?? null,
    streamUrl: f.streamUrl ?? null,
  };
}

export function matchEvent(e: any) {
  return {
    minute: e.minute,
    extraMinute: e.extraMinute ?? null,
    type: e.type,
    teamId: e.teamId,
    playerName: e.playerName ?? null,
    assistName: e.assistName ?? null,
    detail: e.detail ?? null,
  };
}

export function teamStats(s: any) {
  return {
    teamId: s.teamId,
    possession: s.possession ?? null,
    shots: s.shots ?? 0,
    shotsOnTarget: s.shotsOnTarget ?? 0,
    corners: s.corners ?? 0,
    fouls: s.fouls ?? 0,
    offsides: s.offsides ?? 0,
    yellowCards: s.yellowCards ?? 0,
    redCards: s.redCards ?? 0,
    passes: s.passes ?? 0,
    passAccuracy: s.passAccuracy ?? null,
  };
}

export function lineup(l: any) {
  // starters / substitutes are stored as JSON arrays already in LineupSlot shape:
  // { playerId, name, number, position, grid, photoUrl }
  return {
    teamId: l.teamId,
    formation: l.formation ?? null,
    coach: l.coach ?? null,
    starters: l.starters ?? [],
    substitutes: l.substitutes ?? [],
  };
}

export function standingRow(r: any) {
  return {
    rank: r.rank,
    team: teamLight(r.team),
    played: r.played ?? 0,
    win: r.win ?? 0,
    draw: r.draw ?? 0,
    loss: r.loss ?? 0,
    goalsFor: r.goalsFor ?? 0,
    goalsAgainst: r.goalsAgainst ?? 0,
    points: r.points ?? 0,
    form: r.form ?? null,
  };
}

/** Group an array of StandingRow rows into GroupStanding objects, ordered A→L. */
export function groupStandings(rows: any[]) {
  const byGroup = new Map<string, any[]>();
  for (const r of rows) {
    if (!byGroup.has(r.group)) byGroup.set(r.group, []);
    byGroup.get(r.group)!.push(r);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, rs]) => ({
      group,
      rows: rs.sort((a, b) => a.rank - b.rank).map(standingRow),
    }));
}

/** Inbox message shape for the Flutter InboxController. */
export function message(m: any, read: boolean) {
  return {
    id: m.id,
    title: m.title,
    body: m.body,
    type: m.type ?? "info",
    fixtureId: m.fixtureId ?? null,
    createdAt: new Date(m.createdAt).toISOString(),
    read,
  };
}
