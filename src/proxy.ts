import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy (Next.js 16's renamed middleware) for the (dashboard) route group.
 *
 * SECURITY NOTE — this is an OPTIMISTIC check ONLY:
 * `getSessionCookie()` does NOT validate the session (expiry, revocation,
 * tampering). It only checks that a `better-auth.session_token` cookie is
 * present in the request — no DB round-trip. Real protection continues to come
 * from tRPC's `protectedProcedure` (which gates all agents/meetings/dashboard
 * procedures) and from the server-side `auth.api.getSession()` checks on
 * individual pages (e.g. (dashboard)/page.tsx). This proxy exists purely to fix
 * the UX gap — redirect an unauthenticated visitor to /sign-in instead of
 * rendering a broken ErrorState — NOT to replace the existing auth checks.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // No session cookie → bounce to sign-in, remembering where they were headed
    // so we can send them back after login (sign-in reads this param).
    const loginUrl = new URL("/sign-in", request.url);
    loginUrl.searchParams.set(
      "callbackURL",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  // Cookie present → let the request through. Do NOT validate the session here.
  return NextResponse.next();
}

/**
 * Matcher covers exactly the (dashboard) route group: `/`, `/agents/*`,
 * `/meetings/*`.
 *
 * Deliberately NOT matched — these must stay reachable without a session cookie:
 * - /sign-in, /sign-up, /forgot-password, /reset-password (auth pages for
 *   logged-out users)
 * - /api/auth/*, /api/trpc/*, /api/chat (API endpoints — webhooks come from
 *   Stream's servers, not browsers, and must not be redirected)
 * - /api/webhooks/* (Stream webhook — no browser session cookie)
 * - /_next/* and static assets
 *
 * Because this is a positive allow-list, every path outside these three patterns
 * is excluded automatically.
 */
export const config = {
  matcher: ["/", "/agents/:path*", "/meetings/:path*"],
};
