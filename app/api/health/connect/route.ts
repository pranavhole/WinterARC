import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { googleHealthAuthorizeUrl, googleHealthConfigured } from "@/lib/health/google-health";
import { parseDataTypes } from "@/lib/health/permissions";
import { beginOAuth, safeReturnTo } from "@/lib/oauth-state";
import { withStatus } from "@/lib/url";

/**
 * Start the Google Health connection: a separate consent from Google sign-in,
 * asking only for the read scopes behind the data types the user picked.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const params = request.nextUrl.searchParams;
  const returnTo = safeReturnTo(params.get("returnTo"));
  const types = parseDataTypes(params.get("types"));

  if (!googleHealthConfigured()) return NextResponse.redirect(new URL(withStatus(returnTo, "health", "unavailable"), request.url));
  if (!types.length) return NextResponse.redirect(new URL(withStatus(returnTo, "health", "choose"), request.url));

  const state = await beginOAuth("health", user.id, returnTo, types.join(" "));
  return NextResponse.redirect(googleHealthAuthorizeUrl(await appUrl(), state, types));
}
