import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { keyToDate, type DayKey } from "@/lib/utils";
import { parseDataTypes } from "@/lib/health/permissions";
import type { HealthDataType } from "@/lib/health/types";

export const SOURCE_LABEL = { GOOGLE_HEALTH: "Google Health", HEALTH_CONNECT: "Health Connect" } as const;

/** The user's health connections, for Settings and the dashboard. No tokens. */
export const getHealthConnections = cache(async (userId: string) => {
  const rows = await prisma.healthConnection.findMany({
    where: { userId },
    select: { provider: true, status: true, lastSyncedAt: true, dataTypes: true },
  });
  return rows.map((r) => ({ ...r, dataTypes: parseDataTypes(r.dataTypes) as HealthDataType[] }));
});

export type HealthConnectionView = Awaited<ReturnType<typeof getHealthConnections>>[number];

/** Imported metrics for one day, if any. Only ever shown to their owner. */
export async function getHealthDay(userId: string, day: DayKey) {
  return prisma.healthDailyMetric.findUnique({
    where: { userId_date: { userId, date: keyToDate(day) } },
    select: { steps: true, sleepMinutes: true, exerciseMinutes: true, exerciseSessions: true, weight: true, source: true, syncedAt: true },
  });
}
