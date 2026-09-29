import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BOARDS, getLeaderboard, PERIODS, type Board, type Period } from "@/lib/social/leaderboard";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const board = (params.get("board") ?? "xp") as Board;
  const period = (params.get("period") ?? "week") as Period;
  if (!(board in BOARDS) || !(period in PERIODS)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const scope = params.get("scope") === "friends" ? "friends" : "everyone";
  return NextResponse.json({ board, period, scope, measures: BOARDS[board].measures, entries: await getLeaderboard(user.id, board, period, scope) });
}
