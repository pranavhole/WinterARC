import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFeed } from "@/lib/social/feed";

/** The feed, 20 posts a page. Visibility is enforced in the query. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const cursor = params.get("cursor");
  const scope = params.get("scope") === "friends" ? "friends" : "all";
  return NextResponse.json(await getFeed(user.id, scope, cursor && cursor.length <= 64 ? cursor : null));
}
