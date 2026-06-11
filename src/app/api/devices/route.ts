import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      fcmToken?: string;
      platform?: string;
      favoriteTeams?: number[];
    };

    const { fcmToken, platform, favoriteTeams } = body;

    if (!fcmToken) {
      return NextResponse.json(
        { error: "fcmToken is required" },
        { status: 400 }
      );
    }

    const device = await prisma.device.upsert({
      where: { fcmToken },
      create: {
        fcmToken,
        platform: platform ?? null,
        favoriteTeams: favoriteTeams ?? [],
      },
      update: {
        platform,
        favoriteTeams,
      },
    });

    return NextResponse.json({ id: device.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
