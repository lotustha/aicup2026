import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const events = await prisma.matchEvent.findMany({
      where: { fixtureId: Number(id) },
      orderBy: { minute: "asc" },
    });

    return NextResponse.json(events.map(S.matchEvent));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
