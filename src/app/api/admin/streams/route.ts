import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Body {
  fixtureId?: number | string;
  streamUrl?: string;
}

/** Set (or clear) the embed stream URL for a fixture. */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = Number(body.fixtureId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "fixtureId required" }, { status: 400 });
  }

  const url = (body.streamUrl ?? "").trim();
  // Basic guard: only allow http(s) URLs, else clear.
  const streamUrl = /^https?:\/\//i.test(url) ? url : null;

  try {
    await prisma.fixture.update({ where: { id }, data: { streamUrl } });
  } catch {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, fixtureId: id, streamUrl });
}
