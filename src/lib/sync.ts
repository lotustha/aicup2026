import { prisma } from "@/lib/db";
import * as AF from "@/lib/apiFootball";
import { notifyTransition, type NotifyFixture } from "@/lib/notify";

/**
 * Data-sync engine. Pulls from API-Football and upserts into Postgres.
 *
 * Every exported sync* function is wrapped so it logs and swallows its own
 * errors — the cron / poller must keep running even when one upstream call
 * fails. Foreign keys are honoured by ensuring referenced Team rows exist
 * (ensureTeam) before any Fixture / StandingRow / event / lineup / stat write.
 */

/** Upsert a minimal Team if missing; backfill name/logo when provided. */
export async function ensureTeam(
  id: number | null | undefined,
  name?: string | null,
  logo?: string | null
): Promise<void> {
  if (id == null) return;
  await prisma.team.upsert({
    where: { id },
    // Only patch name/crest when we actually have values, so a real sync
    // (syncTeamsAndSquads) isn't clobbered by a placeholder.
    update: {
      ...(name ? { name } : {}),
      ...(logo ? { crestUrl: logo, flagUrl: logo } : {}),
    },
    create: {
      id,
      name: name ?? `Team ${id}`,
      crestUrl: logo ?? null,
      flagUrl: logo ?? null,
    },
  });
}

/**
 * Teams + squads. The heavy one (one squad request per team) — runs daily, not
 * on the fast cadence, to conserve API-Football quota.
 */
export async function syncTeamsAndSquads(): Promise<void> {
  try {
    const teams = await AF.fetchTeams();
    for (const t of teams) {
      if (t.id == null) continue;
      try {
        await prisma.team.upsert({
          where: { id: t.id },
          update: { name: t.name, code: t.code, crestUrl: t.crestUrl, flagUrl: t.flagUrl },
          create: {
            id: t.id,
            name: t.name ?? `Team ${t.id}`,
            code: t.code,
            crestUrl: t.crestUrl,
            flagUrl: t.flagUrl,
          },
        });

        const squad = await AF.fetchSquad(t.id);
        for (const p of squad) {
          if (p.id == null) continue;
          await prisma.player.upsert({
            where: { id: p.id },
            update: {
              teamId: p.teamId,
              name: p.name,
              number: p.number,
              position: p.position,
              photoUrl: p.photoUrl,
              age: p.age,
            },
            create: {
              id: p.id,
              teamId: p.teamId,
              name: p.name ?? `Player ${p.id}`,
              number: p.number,
              position: p.position,
              photoUrl: p.photoUrl,
              age: p.age,
            },
          });
        }
      } catch (err) {
        console.error(`[sync] team/squad ${t.id} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[sync] syncTeamsAndSquads failed:", err);
  }
}

/** Fixtures: ensure both teams exist, then upsert the fixture core. */
export async function syncFixtures(): Promise<void> {
  try {
    const fixtures = await AF.fetchFixtures();
    for (const f of fixtures) {
      if (f.id == null || f.homeId == null || f.awayId == null) continue;
      try {
        await ensureTeam(f.homeId, f.homeName, f.homeLogo);
        await ensureTeam(f.awayId, f.awayName, f.awayLogo);
        await upsertFixtureCore(f);
      } catch (err) {
        console.error(`[sync] fixture ${f.id} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[sync] syncFixtures failed:", err);
  }
}

type FixturePayload = Awaited<ReturnType<typeof AF.fetchFixtures>>[number];

/** Upsert just the Fixture row (no events/lineups/stats, no stateHash). */
async function upsertFixtureCore(f: FixturePayload): Promise<void> {
  const data = {
    kickoff: f.kickoff,
    homeId: f.homeId,
    awayId: f.awayId,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    status: f.status,
    minute: f.minute,
    stage: f.stage,
    group: f.group,
    venue: f.venue,
    city: f.city,
    referee: f.referee,
    round: f.round,
  };
  await prisma.fixture.upsert({
    where: { id: f.id },
    update: data,
    create: { id: f.id, ...data },
  });
}

/** Standings: ensure team, upsert StandingRow by (group,teamId), set Team.group. */
export async function syncStandings(): Promise<void> {
  try {
    const rows = await AF.fetchStandings();
    for (const r of rows) {
      if (r.teamId == null || r.group == null) continue;
      try {
        await ensureTeam(r.teamId, r.teamName, r.teamLogo);
        await prisma.standingRow.upsert({
          where: { group_teamId: { group: r.group, teamId: r.teamId } },
          update: {
            rank: r.rank,
            played: r.played,
            win: r.win,
            draw: r.draw,
            loss: r.loss,
            goalsFor: r.goalsFor,
            goalsAgainst: r.goalsAgainst,
            points: r.points,
            form: r.form,
          },
          create: {
            group: r.group,
            teamId: r.teamId,
            rank: r.rank,
            played: r.played,
            win: r.win,
            draw: r.draw,
            loss: r.loss,
            goalsFor: r.goalsFor,
            goalsAgainst: r.goalsAgainst,
            points: r.points,
            form: r.form,
          },
        });
        // Keep Team.group in sync with the standings group.
        await prisma.team.update({ where: { id: r.teamId }, data: { group: r.group } });
      } catch (err) {
        console.error(`[sync] standing ${r.group}/${r.teamId} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[sync] syncStandings failed:", err);
  }
}

/**
 * Live details: for each in-play fixture, refresh core + events + lineups + stats,
 * detect state changes via a stateHash, and fire notifications on transitions.
 *
 * IMPORTANT: the previous fixture state is read BEFORE the core upsert, so both
 * the hash comparison and the transition-based notify see the prior values.
 */
export async function syncLiveDetails(): Promise<void> {
  try {
    const live = await AF.fetchLiveFixtures();
    for (const f of live) {
      if (f.id == null || f.homeId == null || f.awayId == null) continue;
      try {
        await ensureTeam(f.homeId, f.homeName, f.homeLogo);
        await ensureTeam(f.awayId, f.awayName, f.awayLogo);

        // (1) Capture prior state before we overwrite the row.
        const prev = await prisma.fixture.findUnique({
          where: { id: f.id },
          select: {
            id: true,
            homeId: true,
            awayId: true,
            homeScore: true,
            awayScore: true,
            status: true,
            stateHash: true,
          },
        });

        // (2) Upsert core so FK targets exist for events/lineups/stats.
        await upsertFixtureCore(f);

        // (3) Replace events (delete + recreate).
        let eventCount = 0;
        try {
          const events = await AF.fetchEvents(f.id);
          const rows = events.filter((e) => e.teamId != null);
          for (const e of rows) await ensureTeam(e.teamId);
          await prisma.matchEvent.deleteMany({ where: { fixtureId: f.id } });
          if (rows.length > 0) {
            await prisma.matchEvent.createMany({ data: rows });
          }
          eventCount = rows.length;
        } catch (err) {
          console.error(`[sync] events ${f.id} failed:`, err);
        }

        // (4) Lineups by (fixtureId,teamId).
        try {
          const lineups = await AF.fetchLineups(f.id);
          for (const l of lineups) {
            if (l.teamId == null) continue;
            await ensureTeam(l.teamId);
            await prisma.lineup.upsert({
              where: { fixtureId_teamId: { fixtureId: f.id, teamId: l.teamId } },
              update: {
                formation: l.formation,
                coach: l.coach,
                starters: l.starters,
                substitutes: l.substitutes,
              },
              create: {
                fixtureId: f.id,
                teamId: l.teamId,
                formation: l.formation,
                coach: l.coach,
                starters: l.starters,
                substitutes: l.substitutes,
              },
            });
          }
        } catch (err) {
          console.error(`[sync] lineups ${f.id} failed:`, err);
        }

        // (5) Stats by (fixtureId,teamId).
        try {
          const stats = await AF.fetchStatistics(f.id);
          for (const s of stats) {
            if (s.teamId == null) continue;
            await ensureTeam(s.teamId);
            await prisma.teamStats.upsert({
              where: { fixtureId_teamId: { fixtureId: f.id, teamId: s.teamId } },
              update: {
                possession: s.possession,
                shots: s.shots,
                shotsOnTarget: s.shotsOnTarget,
                corners: s.corners,
                fouls: s.fouls,
                offsides: s.offsides,
                yellowCards: s.yellowCards,
                redCards: s.redCards,
                passes: s.passes,
                passAccuracy: s.passAccuracy,
              },
              create: {
                fixtureId: f.id,
                teamId: s.teamId,
                possession: s.possession,
                shots: s.shots,
                shotsOnTarget: s.shotsOnTarget,
                corners: s.corners,
                fouls: s.fouls,
                offsides: s.offsides,
                yellowCards: s.yellowCards,
                redCards: s.redCards,
                passes: s.passes,
                passAccuracy: s.passAccuracy,
              },
            });
          }
        } catch (err) {
          console.error(`[sync] stats ${f.id} failed:`, err);
        }

        // (6) State hash → notify on change, then persist.
        const newHash = `${f.homeScore ?? 0}-${f.awayScore ?? 0}-${f.minute ?? 0}-${eventCount}`;
        if (newHash !== (prev?.stateHash ?? null)) {
          const next: NotifyFixture = {
            id: f.id,
            homeId: f.homeId,
            awayId: f.awayId,
            homeScore: f.homeScore,
            awayScore: f.awayScore,
            status: f.status,
          };
          const prevState: NotifyFixture | null = prev
            ? {
                id: prev.id,
                homeId: prev.homeId,
                awayId: prev.awayId,
                homeScore: prev.homeScore,
                awayScore: prev.awayScore,
                status: prev.status,
              }
            : null;
          try {
            await notifyTransition(prevState, next);
          } catch (err) {
            console.error(`[sync] notify ${f.id} failed:`, err);
          }
          await prisma.fixture.update({ where: { id: f.id }, data: { stateHash: newHash } });
        }
      } catch (err) {
        console.error(`[sync] live fixture ${f.id} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[sync] syncLiveDetails failed:", err);
  }
}

/** Run the standard refresh chain: teams → fixtures → standings. */
export async function syncAll(): Promise<void> {
  await syncTeamsAndSquads();
  await syncFixtures();
  await syncStandings();
}
