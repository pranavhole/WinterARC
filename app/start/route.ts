import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/home";

/**
 * Landing URL after Google sign-in (a full-page GET), redirecting to the right place.
 * Don't redirect() to this from a page or server action: use homePath() instead.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const target = user ? await homePath(user.id) : "/login";
  return NextResponse.redirect(new URL(target, request.url));
}
