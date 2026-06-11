import { getStandings } from "@/lib/site-data";
import { TeamCrest, StatusPill, EmptyState } from "@/components/site/ui";

export const dynamic = "force-dynamic";

function gd(goalsFor: number, goalsAgainst: number) {
  const diff = goalsFor - goalsAgainst;
  return diff > 0 ? `+${diff}` : `${diff}`;
}

// Single-letter labels are real groups ("A".."L") → prefix "Group".
// Anything else (e.g. "Table", "Playoffs") is shown as-is.
function groupTitle(label: string) {
  return /^[a-z]$/i.test(label.trim()) ? `Group ${label}` : label;
}

export default async function StandingsPage() {
  const groups = await getStandings();
  const single = groups.length === 1;

  return (
    <div className="pb-10">
      <div className="px-1 pb-2 pt-5">
        <h1 className="text-2xl font-bold tracking-tight text-tprimary sm:text-3xl">
          Standings
        </h1>
        <p className="mt-1 text-sm text-tsecondary">
          Group tables — the top two of each group qualify.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No standings yet" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {groups.map((g) => (
            <section
              key={g.group}
              className={`card overflow-hidden ${single ? "lg:col-span-2" : ""}`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3">
                <h2 className="text-base font-bold text-tprimary">
                  {groupTitle(g.group)}
                </h2>
                <StatusPill tone="secondary">Top 2 qualify</StatusPill>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-ttertiary">
                      <th className="w-9 py-2 pl-4 text-center font-semibold">
                        #
                      </th>
                      <th className="py-2 pr-3 text-left font-semibold">Team</th>
                      <th className="w-9 py-2 text-center font-semibold">P</th>
                      <th className="w-9 py-2 text-center font-semibold">W</th>
                      <th className="w-9 py-2 text-center font-semibold">D</th>
                      <th className="w-9 py-2 text-center font-semibold">L</th>
                      <th className="w-12 py-2 text-center font-semibold">GD</th>
                      <th className="w-12 py-2 pr-4 text-center font-semibold">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => {
                      const qualifies = r.rank <= 2;
                      return (
                        <tr
                          key={r.team.id}
                          className={`border-t border-divider/70 transition-colors hover:bg-surface2/40 ${
                            qualifies ? "border-l-2 border-l-secondary" : ""
                          }`}
                        >
                          <td
                            className={`py-2.5 pl-4 text-center tabular-nums ${
                              qualifies
                                ? "font-bold text-secondary"
                                : "text-tsecondary"
                            }`}
                          >
                            {r.rank}
                          </td>
                          <td className="max-w-0 py-2.5 pr-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <TeamCrest
                                url={r.team.crestUrl}
                                label={r.team.code ?? r.team.name}
                                size={26}
                              />
                              <span className="truncate font-semibold text-tprimary">
                                {r.team.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-tsecondary">
                            {r.played}
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-tsecondary">
                            {r.win}
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-tsecondary">
                            {r.draw}
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-tsecondary">
                            {r.loss}
                          </td>
                          <td className="py-2.5 text-center tabular-nums text-tsecondary">
                            {gd(r.goalsFor, r.goalsAgainst)}
                          </td>
                          <td className="py-2.5 pr-4 text-center font-bold tabular-nums text-tprimary">
                            {r.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
