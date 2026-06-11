import { NextResponse } from "next/server";
import { checkPassword, createSession, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    // ignore — treated as empty/invalid below
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  await setSessionCookie(await createSession());
  return NextResponse.json({ ok: true });
}
