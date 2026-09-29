import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounce visitors without a session cookie to /login.
// The real authorization happens on the server in every page and action.
// Public pages (/u/…, /milestone/…) and the API routes are not matched.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/arc/:path*",
    "/onboarding/:path*",
    "/social/:path*",
    "/friends/:path*",
    "/leaderboard/:path*",
    "/badges/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/progress/:path*",
    "/settings/:path*",
  ],
};
