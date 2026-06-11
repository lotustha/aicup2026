import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.standingRow.findMany({
      include: { team: true },
    });

    return NextResponse.json(S.groupStandings(rows));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
