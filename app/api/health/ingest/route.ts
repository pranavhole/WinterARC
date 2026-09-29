import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { HealthConnectBatch, ingestSchema } from "@/lib/health/health-connect";
import { applyHealthToArc, syncDays } from "@/lib/health/sync";

export const maxDuration = 30;

const MAX_BODY = 512 * 1024;

/**
 * The Android Health Connect bridge pushes raw records here.
 * Auth: `Authorization: Bearer arc_hc_…`, a device token created in Settings
 * (only its SHA-256 is stored). No cookies are involved, so this isn't
 * reachable by cross-site requests from a browser session.
 */
export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("arc_hc_")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const device = await prisma.healthDeviceToken.findUnique({ where: { tokenHash: sha256(token) }, select: { id: true, userId: true } });
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(device.userId, "healthIngest"))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const { userId } = device;
  const types = parsed.data.permissions;
  try {
    await prisma.$transaction([
      prisma.healthDeviceToken.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } }),
      prisma.healthConnection.upsert({
        where: { userId_provider: { userId, provider: "HEALTH_CONNECT" } },
        create: { userId, provider: "HEALTH_CONNECT", dataTypes: types.join(" "), scopes: types.join(" "), lastSyncedAt: new Date() },
        update: { dataTypes: types.join(" "), scopes: types.join(" "), status: "ACTIVE", lastSyncedAt: new Date() },
      }),
    ]);
    const batch = new HealthConnectBatch(parsed.data);
    const changed = await syncDays(userId, batch, "HEALTH_CONNECT", batch.days(), types);
    await applyHealthToArc(userId, changed);
    return NextResponse.json({ ok: true, days: batch.days().length, changedDays: changed.length });
  } catch (error) {
    console.error("Health Connect ingest failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
