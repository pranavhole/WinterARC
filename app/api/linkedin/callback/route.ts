import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/app-url";
import { completeLinkedInConnection } from "@/lib/linkedin/oauth";
import { finishOAuth } from "@/lib/oauth-state";
import { withStatus } from "@/lib/url";

/** LinkedIn redirects here. The state must match the signed cookie for this user; errors are never shown raw. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const params = request.nextUrl.searchParams;
  const payload = await finishOAuth("linkedin", user.id, params.get("state"));
  if (!payload) return NextResponse.redirect(new URL(withStatus("/arc/settings", "linkedin", "error"), request.url));

  const code = params.get("code");
  if (!code || params.get("error")) {
    return NextResponse.redirect(new URL(withStatus(payload.returnTo, "linkedin", "cancelled"), request.url));
  }
  try {
    await completeLinkedInConnection(user.id, await appUrl(), code);
  } catch (error) {
    console.error("LinkedIn connection failed", error);
    return NextResponse.redirect(new URL(withStatus(payload.returnTo, "linkedin", "error"), request.url));
  }
  return NextResponse.redirect(new URL(withStatus(payload.returnTo, "linkedin", "connected"), request.url));
}
