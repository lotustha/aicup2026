import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/fcm";

export const dynamic = "force-dynamic";

type Audience = "all" | "team" | "device";

interface NotifyBody {
  title?: string;
  body?: string;
  audience?: Audience;
  teamId?: string | number;
  deviceId?: string;
  fixtureId?: string | number;
}

function toInt(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NotifyBody;
  try {
    body = (await req.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const messageBody = body.body?.trim();
  const audience: Audience = body.audience ?? "all";

  if (!title || !messageBody) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  const teamId = toInt(body.teamId);
  const fixtureId = toInt(body.fixtureId);
  const deviceId = body.deviceId?.trim() || undefined;

  // Resolve target devices.
  let tokens: string[] = [];
  if (audience === "all") {
    const devices = await prisma.device.findMany({ select: { fcmToken: true } });
    tokens = devices.map((d) => d.fcmToken);
  } else if (audience === "team") {
    if (teamId === undefined) {
      return NextResponse.json(
        { error: "teamId is required for team audience" },
        { status: 400 }
      );
    }
    const devices = await prisma.device.findMany({
      where: { favoriteTeams: { has: teamId } },
      select: { fcmToken: true },
    });
    tokens = devices.map((d) => d.fcmToken);
  } else if (audience === "device") {
    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required for device audience" },
        { status: 400 }
      );
    }
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { fcmToken: true },
    });
    tokens = device ? [device.fcmToken] : [];
  }

  const { successCount, failureCount, invalidTokens } = await sendPush(tokens, {
    title,
    body: messageBody,
    data: {
      type: "announcement",
      ...(fixtureId !== undefined ? { fixtureId: String(fixtureId) } : {}),
    },
  });

  await prisma.message.create({
    data: {
      title,
      body: messageBody,
      type: "announcement",
      audience,
      teamId: audience === "team" ? teamId : null,
      deviceId: audience === "device" ? deviceId : null,
      fixtureId: fixtureId ?? null,
      pushed: true,
    },
  });

  if (invalidTokens.length > 0) {
    await prisma.device.deleteMany({
      where: { fcmToken: { in: invalidTokens } },
    });
  }

  return NextResponse.json({ sent: successCount, failed: failureCount });
}
