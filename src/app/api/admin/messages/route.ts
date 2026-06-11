import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/fcm";

export const dynamic = "force-dynamic";

type Audience = "all" | "team";

interface MessageBody {
  title?: string;
  body?: string;
  type?: string;
  audience?: Audience;
  teamId?: string | number;
  fixtureId?: string | number;
  push?: boolean;
}

function toInt(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: MessageBody;
  try {
    body = (await req.json()) as MessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const messageBody = body.body?.trim();
  const type = body.type?.trim() || "info";
  const audience: Audience = body.audience === "team" ? "team" : "all";
  const push = !!body.push;

  if (!title || !messageBody) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  const teamId = toInt(body.teamId);
  const fixtureId = toInt(body.fixtureId);

  if (audience === "team" && teamId === undefined) {
    return NextResponse.json(
      { error: "teamId is required for team audience" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      title,
      body: messageBody,
      type,
      audience,
      teamId: audience === "team" ? teamId : null,
      fixtureId: fixtureId ?? null,
      pushed: push,
    },
  });

  let sent: number | undefined;
  if (push) {
    let tokens: string[] = [];
    if (audience === "all") {
      const devices = await prisma.device.findMany({ select: { fcmToken: true } });
      tokens = devices.map((d) => d.fcmToken);
    } else {
      const devices = await prisma.device.findMany({
        where: { favoriteTeams: { has: teamId } },
        select: { fcmToken: true },
      });
      tokens = devices.map((d) => d.fcmToken);
    }

    const { successCount, invalidTokens } = await sendPush(tokens, {
      title,
      body: messageBody,
      data: {
        type,
        messageId: message.id,
        ...(fixtureId !== undefined ? { fixtureId: String(fixtureId) } : {}),
      },
    });
    sent = successCount;

    if (invalidTokens.length > 0) {
      await prisma.device.deleteMany({
        where: { fcmToken: { in: invalidTokens } },
      });
    }
  }

  return NextResponse.json({ ok: true, id: message.id, ...(sent !== undefined ? { sent } : {}) });
}
