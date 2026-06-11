import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sample World Cup 2026 data so the backend (and the Flutter app pointed at it)
// is demoable immediately, before wiring the live API-Football poller.
// Run with: npx prisma db seed

const flag = (c: string) => `https://flagcdn.com/w160/${c}.png`;

const TEAMS = [
  { id: 1, name: "Mexico", code: "MEX", group: "A", c: "mx", coach: "Jaime Lozano" },
  { id: 2, name: "Canada", code: "CAN", group: "A", c: "ca", coach: "Jesse Marsch" },
  { id: 3, name: "Croatia", code: "CRO", group: "A", c: "hr", coach: "Zlatko Dalić" },
  { id: 4, name: "Morocco", code: "MAR", group: "A", c: "ma", coach: "Walid Regragui" },
  { id: 5, name: "USA", code: "USA", group: "B", c: "us", coach: "Mauricio Pochettino" },
  { id: 6, name: "Wales", code: "WAL", group: "B", c: "gb-wls", coach: "Craig Bellamy" },
  { id: 7, name: "Japan", code: "JPN", group: "B", c: "jp", coach: "Hajime Moriyasu" },
  { id: 8, name: "Senegal", code: "SEN", group: "B", c: "sn", coach: "Pape Thiaw" },
  { id: 9, name: "Argentina", code: "ARG", group: "C", c: "ar", coach: "Lionel Scaloni" },
  { id: 10, name: "Nigeria", code: "NGA", group: "C", c: "ng", coach: "Éric Chelle" },
  { id: 13, name: "France", code: "FRA", group: "D", c: "fr", coach: "Didier Deschamps" },
  { id: 14, name: "Brazil", code: "BRA", group: "D", c: "br", coach: "Dorival Júnior" },
];

async function main() {
  // Teams + a small squad each.
  for (const t of TEAMS) {
    await prisma.team.upsert({
      where: { id: t.id },
      update: { name: t.name, code: t.code, group: t.group, coach: t.coach, crestUrl: flag(t.c), flagUrl: flag(t.c) },
      create: { id: t.id, name: t.name, code: t.code, group: t.group, coach: t.coach, crestUrl: flag(t.c), flagUrl: flag(t.c) },
    });
    const positions = ["Goalkeeper", "Goalkeeper", "Defender", "Defender", "Defender", "Defender", "Midfielder", "Midfielder", "Midfielder", "Attacker", "Attacker"];
    for (let i = 0; i < positions.length; i++) {
      const pid = t.id * 100 + i + 1;
      await prisma.player.upsert({
        where: { id: pid },
        update: {},
        create: {
          id: pid, teamId: t.id, name: `Player ${i + 1}`, number: i + 1,
          position: positions[i], nationality: t.name,
          goals: positions[i] === "Attacker" ? 2 : 0, appearances: 3,
        },
      });
    }
  }

  // A live match + a few scheduled ones.
  const base = new Date("2026-06-11T18:00:00Z");
  const live = await prisma.fixture.upsert({
    where: { id: 1001 },
    update: {},
    create: {
      id: 1001, kickoff: base, homeId: 1, awayId: 2, homeScore: 2, awayScore: 1,
      status: "live", minute: 67, stage: "Group A", group: "A",
      venue: "Estadio Azteca", city: "Mexico City",
    },
  });

  const scheduled = [
    [1002, 5, 6, "B", 4], [1003, 7, 8, "B", 28], [1004, 9, 10, "C", 30], [1005, 13, 14, "D", 32],
  ] as const;
  for (const [id, h, a, g, hours] of scheduled) {
    await prisma.fixture.upsert({
      where: { id },
      update: {},
      create: {
        id, kickoff: new Date(base.getTime() + hours * 3600_000),
        homeId: h, awayId: a, status: "scheduled", stage: `Group ${g}`, group: g,
        venue: "AT&T Stadium", city: "Dallas",
      },
    });
  }

  // Live match details: events, lineups, stats.
  await prisma.matchEvent.deleteMany({ where: { fixtureId: live.id } });
  await prisma.matchEvent.createMany({
    data: [
      { fixtureId: live.id, minute: 12, type: "goal", teamId: 1, playerName: "Player 10", assistName: "Player 7" },
      { fixtureId: live.id, minute: 34, type: "yellowCard", teamId: 2, playerName: "Player 6" },
      { fixtureId: live.id, minute: 41, type: "goal", teamId: 2, playerName: "Player 11" },
      { fixtureId: live.id, minute: 58, type: "goal", teamId: 1, playerName: "Player 11", assistName: "Player 9" },
    ],
  });

  const grid = ["1:1", "2:1", "2:2", "2:3", "2:4", "3:1", "3:2", "3:3", "4:1", "4:2", "4:3"];
  for (const teamId of [1, 2]) {
    const starters = grid.map((g, i) => ({
      playerId: teamId * 100 + i + 1, name: `Player ${i + 1}`, number: i + 1,
      position: i === 0 ? "G" : i < 5 ? "D" : i < 8 ? "M" : "F", grid: g, photoUrl: null,
    }));
    await prisma.lineup.upsert({
      where: { fixtureId_teamId: { fixtureId: live.id, teamId } },
      update: { starters, formation: "4-3-3" },
      create: { fixtureId: live.id, teamId, formation: "4-3-3", coach: TEAMS.find((t) => t.id === teamId)?.coach, starters, substitutes: [] },
    });
    await prisma.teamStats.upsert({
      where: { fixtureId_teamId: { fixtureId: live.id, teamId } },
      update: {},
      create: {
        fixtureId: live.id, teamId,
        possession: teamId === 1 ? 56 : 44, shots: teamId === 1 ? 14 : 9,
        shotsOnTarget: teamId === 1 ? 6 : 3, corners: teamId === 1 ? 7 : 4,
        fouls: teamId === 1 ? 9 : 12, passes: teamId === 1 ? 512 : 401,
        passAccuracy: teamId === 1 ? 87 : 81,
      },
    });
  }

  // Standings for groups A–D.
  const tables: Record<string, number[]> = {
    A: [1, 3, 4, 2], B: [5, 7, 8, 6], C: [9, 10], D: [13, 14],
  };
  for (const [group, ids] of Object.entries(tables)) {
    for (let i = 0; i < ids.length; i++) {
      await prisma.standingRow.upsert({
        where: { group_teamId: { group, teamId: ids[i] } },
        update: {},
        create: {
          group, teamId: ids[i], rank: i + 1, played: 3,
          win: [2, 1, 1, 0][i] ?? 1, draw: [1, 1, 0, 1][i] ?? 0, loss: [0, 1, 2, 2][i] ?? 1,
          goalsFor: [6, 4, 3, 2][i] ?? 3, goalsAgainst: [2, 3, 5, 5][i] ?? 3,
          points: [7, 4, 3, 1][i] ?? 4, form: ["WWD", "WDL", "WLL", "DLL"][i] ?? "WDL",
        },
      });
    }
  }

  // A welcome broadcast message.
  await prisma.message.create({
    data: {
      title: "Welcome to the World Cup!",
      body: "Follow your favourite teams to get goal alerts and kick-off reminders.",
      type: "announcement", audience: "all", pushed: false,
    },
  });

  console.log("✅ Seed complete:", TEAMS.length, "teams, fixtures, standings, 1 live match, 1 message.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
