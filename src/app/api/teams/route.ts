import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(teams.map(S.teamLight));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
