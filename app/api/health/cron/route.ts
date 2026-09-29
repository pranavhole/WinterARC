import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/crypto";
import { syncDueConnections } from "@/lib/health/sync";
import { pruneRateLimits } from "@/lib/rate-limit";

export const maxDuration = 300;

/**
 * The daily background sync. Call once a day with
 * `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically;
 * see vercel.json). Anything else is refused.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const health = await syncDueConnections();
  await pruneRateLimits();
  return NextResponse.json({ ok: true, health });
}
