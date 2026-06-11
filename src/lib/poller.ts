import cron from "node-cron";
import { prisma } from "@/lib/db";
import {
  syncTeamsAndSquads,
  syncFixtures,
  syncStandings,
  syncLiveDetails,
} from "@/lib/sync";

/**
 * Background scheduler (for the long-lived VPS process, run via scripts/poll.ts).
 *
 * Cadences:
 *   - daily 04:00         → teams + squads (heavy, quota-sensitive)
 *   - every 30 min        → fixtures + standings
 *   - every 1 min         → live details, but ONLY when a fixture is in play
 *                           (gated to conserve API quota)
 *
 * Each task is guarded by an `isRunning` flag so a slow run never overlaps the
 * next tick. Disabled entirely unless ENABLE_POLLER === "true".
 */

const running = {
  teams: false,
  fixtures: false,
  live: false,
};

/** Wrap a task with an overlap guard + error swallowing. */
async function guarded(key: keyof typeof running, fn: () => Promise<void>): Promise<void> {
  if (running[key]) {
    console.warn(`[poller] skip "${key}" — previous run still in progress`);
    return;
  }
  running[key] = true;
  try {
    await fn();
  } catch (err) {
    console.error(`[poller] task "${key}" threw:`, err);
  } finally {
    running[key] = false;
  }
}

export function startPoller(): void {
  if (process.env.ENABLE_POLLER !== "true") {
    console.log("[poller] disabled (set ENABLE_POLLER=true to enable)");
    return;
  }

  // Daily at 04:00 — teams + squads.
  cron.schedule("0 4 * * *", () => {
    void guarded("teams", syncTeamsAndSquads);
  });

  // Every 30 minutes — fixtures + standings.
  cron.schedule("*/30 * * * *", () => {
    void guarded("fixtures", async () => {
      await syncFixtures();
      await syncStandings();
    });
  });

  // Every minute — live details, only if something is actually in play.
  cron.schedule("* * * * *", () => {
    void guarded("live", async () => {
      const inPlay = await prisma.fixture.count({
        where: { status: { in: ["live", "halfTime"] } },
      });
      if (inPlay > 0) {
        await syncLiveDetails();
      }
    });
  });

  console.log("[poller] started — teams@04:00, fixtures/standings@30m, live@1m (gated)");
}
