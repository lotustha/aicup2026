import { getStandings } from "@/lib/site-data";
import { TeamCrest, SectionHeader, StatusPill, EmptyState } from "@/components/site/ui";

export const dynamic = "force-dynamic";

function gd(goalsFor: number, goalsAgainst: number) {
  const diff = goalsFor - goalsAgainst;
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export default async function StandingsPage() {
  const groups = await getStandings();

  return (
    <div className="pb-10">
      <SectionHeader title="Standings" />

      {groups.length === 0 ? (
        <EmptyState title="No standings yet" />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.group} className="card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <h3 className="text-base font-bold text-tprimary">
                  Group {g.group}
                </h3>
                <StatusPill tone="secondary">Top 2 qualify</StatusPill>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-divider text-xs uppercase text-ttertiary">
                      <th className="w-7 py-2 pl-4 text-left font-semibold">#</th>
                      <th className="py-2 pr-2 text-left font-semibold">Team</th>
                      <th className="w-8 py-2 text-center font-semibold">P</th>
                      <th className="w-8 py-2 text-center font-semibold">W</th>
                      <th className="w-8 py-2 text-center font-semibold">D</th>
                      <th className="w-8 py-2 text-center font-semibold">L</th>
                      <th className="w-10 py-2 text-center font-semibold">GD</th>
                      <th className="w-10 py-2 pr-4 text-center font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => {
                      const qualifies = r.rank <= 2;
                      return (
                        <tr
                          key={r.team.id}
                          className={`border-b border-divider/60 last:border-b-0 ${
                            qualifies ? "border-l-2 border-l-secondary" : ""
                          }`}
                        >
                          <td
                            className={`py-2.5 pl-4 text-left tabular-nums ${
                              qualifies
                                ? "font-bold text-secondary"
                                : "text-tsecondary"
                            }`}
                          >
                            {r.rank}
                          </td>
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-2.5">
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
