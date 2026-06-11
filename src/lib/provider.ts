/**
 * Active data provider. Both providers expose the same fetcher names/shapes,
 * so `sync.ts` imports from here and is agnostic to the source.
 *
 *   DATA_PROVIDER=thesportsdb (default) | apifootball
 *
 * TheSportsDB: free, real WC-2026 fixtures/standings/teams (live & lineups are
 * premium). API-Football: richer live data but the free plan can't access 2026.
 */
import * as tsdb from "@/lib/thesportsdb";
import * as apifootball from "@/lib/apiFootball";

type Provider = typeof tsdb;

const active: Provider =
  (process.env.DATA_PROVIDER ?? "thesportsdb") === "apifootball"
    ? (apifootball as unknown as Provider)
    : tsdb;

export const {
  fetchTeams,
  fetchSquad,
  fetchFixtures,
  fetchLiveFixtures,
  fetchStandings,
  fetchEvents,
  fetchLineups,
  fetchStatistics,
  apiUsage,
} = active;
