import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Minimal admin auth: a single shared password (ADMIN_PASSWORD) exchanged for a
 * signed session cookie (HS256 via AUTH_SECRET). Protects the /admin dashboard
 * and /api/admin/* routes. For a multi-user setup, swap in Auth.js later.
 */

const COOKIE = "wc_admin";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev");

export async function createSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** True if the current request carries a valid admin session cookie. */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  return expected.length > 0 && password === expected;
}
