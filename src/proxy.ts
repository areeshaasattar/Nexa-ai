import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy (Next.js 16's renamed middleware).
 *
 * SECURITY NOTE — this is an OPTIMISTIC check ONLY:
 * `getSessionCookie()` does NOT validate the session (expiry, revocation,
 * tampering). It only checks that a `better-auth.session_token` cookie is
 * present in the request — no DB round-trip. Real protection comes from
 * tRPC's `protectedProcedure` and from the server-side
 * `auth.api.getSession()` checks in the (dashboard) and /call layouts.
 */

const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/agents" ||
    pathname.startsWith("/agents/") ||
    pathname === "/meetings" ||
    pathname.startsWith("/meetings/") ||
    pathname === "/call" ||
    pathname.startsWith("/call/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    if (isProtectedPath(pathname)) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
  }

  if (AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

/**
 * Run on all app routes except:
 * - /api/* (auth, tRPC, chat, Stream webhooks)
 * - /_next/* (compiler / static / image)
 * - static files (favicon, images, etc.)
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
