import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBadgeBoard } from "@/lib/gamification/board";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const badges = await getBadgeBoard(user.id);
  return NextResponse.json({
    badges: badges.map(({ key, name, description, icon, category, xpReward, earnedAt, progress }) => ({
      key, name, description, icon, category, xpReward, earnedAt, progress,
    })),
  });
}
