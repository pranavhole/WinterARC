import "server-only";
import { prisma } from "@/lib/db";
import { keyToDate, type DayKey } from "@/lib/utils";

export type DayExtras = { focus: string | null; exerciseMinutes: number | null };

/**
 * Fields added after the day record's typed queries were written ("Today's
 * Focus", manually logged exercise), in one query. Falls back to empty values
 * instead of failing the page if a migration hasn't been applied yet.
 */
export async function getDayExtras(arcId: string, userId: string, day: DayKey): Promise<DayExtras> {
  try {
    const rows = await prisma.$queryRaw<DayExtras[]>`
      SELECT "focus", "exerciseMinutes" FROM "DailyRecord"
      WHERE "arcId" = ${arcId} AND "userId" = ${userId} AND "date" = ${keyToDate(day)} LIMIT 1`;
    return rows[0] ?? { focus: null, exerciseMinutes: null };
  } catch (error) {
    console.error("getDayExtras failed (are the daily_focus / daily_exercise migrations applied?)", error);
    return { focus: null, exerciseMinutes: null };
  }
}
