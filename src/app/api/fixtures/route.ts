import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");

    const where: {
      group?: string;
      stage?: string;
      status?: string;
    } = {};
    if (group) where.group = group;
    if (stage) where.stage = stage;
    if (status) where.status = status;

    const fixtures = await prisma.fixture.findMany({
      where,
      orderBy: { kickoff: "asc" },
      include: { home: true, away: true },
    });

    return NextResponse.json(fixtures.map(S.fixture));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
