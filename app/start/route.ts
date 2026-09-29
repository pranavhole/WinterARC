import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveArc } from "@/lib/arc";

/** Post-login router: a plain HTTP redirect to the right place, before anything renders. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const target = !user ? "/login" : (await getActiveArc(user.id)) ? "/arc" : "/onboarding";
  return NextResponse.redirect(new URL(target, request.url));
}
