import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { authorizeUrl, linkedInConfigured } from "@/lib/linkedin/oauth";
import { beginOAuth, safeReturnTo } from "@/lib/oauth-state";
import { withStatus } from "@/lib/url";

/** Start "Connect LinkedIn": remember where to come back to, then go to LinkedIn's consent screen. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  if (!linkedInConfigured()) return NextResponse.redirect(new URL(withStatus(returnTo, "linkedin", "unavailable"), request.url));

  const state = await beginOAuth("linkedin", user.id, returnTo);
  return NextResponse.redirect(authorizeUrl(await appUrl(), state));
}
