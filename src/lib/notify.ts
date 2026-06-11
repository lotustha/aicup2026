import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/fcm";

/**
 * Notification engine. Turns fixture state changes into in-app Message rows and
 * FCM pushes targeted at devices that follow either side of the match.
 *
 * Each notify* function: (1) writes a Message row (audience "team", pushed=true),
 * (2) resolves follower devices via favoriteTeams hasSome [homeId, awayId],
 * (3) sends a push with string-only data, (4) prunes invalid tokens.
 */

/** Minimal fixture shape these helpers need (a Prisma Fixture row works). */
export interface NotifyFixture {
  id: number;
  homeId: number;
  awayId: number;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

/** Lightweight team-name lookup for nicer push copy. Best-effort. */
async function teamNames(homeId: number, awayId: number): Promise<{ home: string; away: string }> {
  const teams = await prisma.team.findMany({
    where: { id: { in: [homeId, awayId] } },
    select: { id: true, name: true },
  });
  const byId = new Map(teams.map((t) => [t.id, t.name]));
  return {
    home: byId.get(homeId) ?? "Home",
    away: byId.get(awayId) ?? "Away",
  };
}

/**
 * Shared delivery path: persist a Message, resolve follower devices, push, prune.
 */
async function dispatch(
  fixture: NotifyFixture,
  type: "goal" | "kickoff" | "result",
  title: string,
  body: string
): Promise<void> {
  // 1. Persist an in-app message addressed to followers of the home team.
  //    (audience "team"; one row per match — homeId is the anchor team.)
  await prisma.message.create({
    data: {
      title,
      body,
      type,
      audience: "team",
      teamId: fixture.homeId,
      fixtureId: fixture.id,
      pushed: true,
    },
  });

  // 2. Resolve target devices following either side of the fixture.
  const devices = await prisma.device.findMany({
    where: { favoriteTeams: { hasSome: [fixture.homeId, fixture.awayId] } },
    select: { fcmToken: true },
  });
  const tokens = devices.map((d) => d.fcmToken).filter(Boolean);
  if (tokens.length === 0) return;

  // 3. Push (data is string-only per FCM contract).
  const { invalidTokens } = await sendPush(tokens, {
    title,
    body,
    data: { type, fixtureId: String(fixture.id) },
  });

  // 4. Prune dead tokens.
  if (invalidTokens.length > 0) {
    await prisma.device.deleteMany({ where: { fcmToken: { in: invalidTokens } } });
  }
}

export async function notifyScoreChange(fixture: NotifyFixture): Promise<void> {
  const { home, away } = await teamNames(fixture.homeId, fixture.awayId);
  const h = fixture.homeScore ?? 0;
  const a = fixture.awayScore ?? 0;
  await dispatch(
    fixture,
    "goal",
    "GOAL!",
    `${home} ${h}–${a} ${away}`
  );
}

export async function notifyKickoff(fixture: NotifyFixture): Promise<void> {
  const { home, away } = await teamNames(fixture.homeId, fixture.awayId);
  await dispatch(
    fixture,
    "kickoff",
    "Kick-off!",
    `${home} vs ${away} has started.`
  );
}

export async function notifyResult(fixture: NotifyFixture): Promise<void> {
  const { home, away } = await teamNames(fixture.homeId, fixture.awayId);
  const h = fixture.homeScore ?? 0;
  const a = fixture.awayScore ?? 0;
  await dispatch(
    fixture,
    "result",
    "Full time",
    `${home} ${h}–${a} ${away} — final.`
  );
}

/**
 * Decide which notification (if any) to fire based on a status/score transition
 * between the previously stored fixture state and the freshly fetched one.
 *
 * Order matters: a freshly-finished match is a "result"; a match that just went
 * live is a "kickoff"; otherwise a score delta while live/halfTime is a "goal".
 */
export async function notifyTransition(
  prev: NotifyFixture | null,
  next: NotifyFixture
): Promise<void> {
  const prevStatus = prev?.status ?? "scheduled";

  // Result: transitioned into finished.
  if (next.status === "finished" && prevStatus !== "finished") {
    await notifyResult(next);
    return;
  }

  // Kickoff: transitioned from a non-live state into live.
  const wasLive = prevStatus === "live" || prevStatus === "halfTime";
  const isLive = next.status === "live" || next.status === "halfTime";
  if (isLive && !wasLive) {
    await notifyKickoff(next);
    return;
  }

  // Goal: score changed while the match is in play.
  if (isLive && prev) {
    const prevTotal = (prev.homeScore ?? 0) + (prev.awayScore ?? 0);
    const nextTotal = (next.homeScore ?? 0) + (next.awayScore ?? 0);
    if (nextTotal > prevTotal) {
      await notifyScoreChange(next);
    }
  }
}
