import { prisma } from "@/lib/db";
import StreamsManager, { type StreamRow } from "./StreamsManager";

export const dynamic = "force-dynamic";

export default async function StreamsPage() {
  const fixtures = await prisma.fixture.findMany({
    include: { home: true, away: true },
    orderBy: { kickoff: "asc" },
    take: 200,
  });

  const rows: StreamRow[] = fixtures.map((f) => ({
    id: f.id,
    label: `${f.home.name} v ${f.away.name}`,
    sub: [f.stage, new Date(f.kickoff).toUTCString().slice(0, 22)]
      .filter(Boolean)
      .join(" · "),
    status: f.status,
    streamUrl: f.streamUrl,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Live Streams</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paste an embeddable URL (an iframe <code>src</code>) for a match. It
          appears in the app &amp; website &ldquo;Watch&rdquo; section. Leave
          blank to hide. Use a player/embed page, not a normal website (many
          block being framed).
        </p>
      </div>
      <StreamsManager rows={rows} />
    </div>
  );
}
