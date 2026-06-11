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
    const t = await prisma.team.findUnique({
      where: { id: Number(id) },
      include: { players: { orderBy: { number: "asc" } } },
    });

    if (!t) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(S.teamFull(t));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
