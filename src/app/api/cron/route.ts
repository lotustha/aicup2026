import { NextResponse } from "next/server";
import {
  syncTeamsAndSquads,
  syncFixtures,
  syncStandings,
  syncLiveDetails,
  syncAll,
} from "@/lib/sync";
import { apiUsage } from "@/lib/apiFootball";

/**
 * Manual / Vercel-Cron trigger for the sync engine.
 *
 *   GET|POST /api/cron?task=teams|fixtures|standings|live|all
 *   header: x-cron-secret: <AUTH_SECRET>
 *
 * Returns { ok, task, ms }.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Task = "teams" | "fixtures" | "standings" | "live" | "all";

const TASKS: Record<Task, () => Promise<void>> = {
  teams: syncTeamsAndSquads,
  fixtures: syncFixtures,
  standings: syncStandings,
  live: syncLiveDetails,
  all: syncAll,
};

async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const task = new URL(req.url).searchParams.get("task") as Task | null;
  if (!task || !(task in TASKS)) {
    return NextResponse.json(
      { ok: false, error: "invalid task", allowed: Object.keys(TASKS) },
      { status: 400 }
    );
  }

  const started = Date.now();
  await TASKS[task]();
  const ms = Date.now() - started;

  // Today's API-Football usage, so callers can watch the quota.
  const quota = await apiUsage();
  return NextResponse.json({ ok: true, task, ms, quota });
}

export async function GET(req: Request): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: Request): Promise<NextResponse> {
  return handle(req);
}
