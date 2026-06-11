import { startPoller } from "@/lib/poller";

/**
 * Standalone poller entrypoint for the VPS.
 *
 *   ENABLE_POLLER=true tsx scripts/poll.ts      (typically under pm2)
 *
 * Starts the cron schedules and keeps the process alive. node-cron holds the
 * event loop open via its internal timers; the heartbeat below is belt-and-
 * braces so the process never exits even if all schedules are somehow cleared.
 */
function main(): void {
  console.log(`[poll] starting World Cup sync poller — ${new Date().toISOString()}`);
  startPoller();

  // Keep the process alive regardless of cron internals.
  setInterval(() => {
    /* heartbeat — intentionally empty */
  }, 1 << 30);
}

main();
