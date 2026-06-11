import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as S from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json([]);
    }

    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return NextResponse.json([]);
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { audience: "all" },
          { audience: "team", teamId: { in: device.favoriteTeams } },
          { audience: "device", deviceId: device.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const reads = await prisma.messageRead.findMany({
      where: {
        deviceId: device.id,
        messageId: { in: messages.map((m) => m.id) },
      },
    });
    const readSet = new Set(reads.map((r) => r.messageId));

    return NextResponse.json(
      messages.map((m) => S.message(m, readSet.has(m.id)))
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
