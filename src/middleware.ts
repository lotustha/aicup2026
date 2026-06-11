import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware that guards /admin/** (except /admin/login). Verifies the
 * `wc_admin` HS256 cookie directly with `jose` — we can't use lib/auth.ts here
 * because it relies on `next/headers`, which isn't available on the edge.
 *
 * NOTE: the secret fallback (`?? "dev"`) MUST match lib/auth.ts, otherwise a
 * cookie signed in dev (with "dev") would never verify here → redirect loop.
 */
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login page is always reachable.
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get("wc_admin")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
