import { after, NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { completeGoogleHealthConnection } from "@/lib/health/google-health";
import { parseDataTypes } from "@/lib/health/permissions";
import { syncGoogleHealth } from "@/lib/health/sync";
import { finishOAuth } from "@/lib/oauth-state";
import { withStatus } from "@/lib/url";

export const maxDuration = 60;

/** Google redirects here. The state must match the signed cookie for this user; errors are never shown raw. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const params = request.nextUrl.searchParams;
  const payload = await finishOAuth("health", user.id, params.get("state"));
  if (!payload) return NextResponse.redirect(new URL(withStatus("/arc/settings", "health", "error"), request.url));

  const code = params.get("code");
  if (!code || params.get("error")) {
    return NextResponse.redirect(new URL(withStatus(payload.returnTo, "health", "cancelled"), request.url));
  }
  try {
    await completeGoogleHealthConnection(user.id, await appUrl(), code, parseDataTypes(payload.extra));
    // The initial sync runs after the redirect, so the user isn't kept waiting.
    after(() => syncGoogleHealth(user.id, { initial: true }));
  } catch (error) {
    console.error("Google Health connection failed", error);
    return NextResponse.redirect(new URL(withStatus(payload.returnTo, "health", "error"), request.url));
  }
  return NextResponse.redirect(new URL(withStatus(payload.returnTo, "health", "connected"), request.url));
}
