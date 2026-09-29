import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getXpSummary } from "@/lib/gamification/board";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getXpSummary(user.id));
}
