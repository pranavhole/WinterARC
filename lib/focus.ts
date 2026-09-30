import "server-only";
import { prisma } from "@/lib/db";
import { keyToDate, type DayKey } from "@/lib/utils";

/**
 * The day's "Today's Focus" line. Returns null (instead of failing the page)
 * if the focus column hasn't been migrated yet.
 */
export async function getDayFocus(arcId: string, userId: string, day: DayKey): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ focus: string | null }[]>`
      SELECT "focus" FROM "DailyRecord" WHERE "arcId" = ${arcId} AND "userId" = ${userId} AND "date" = ${keyToDate(day)} LIMIT 1`;
    return rows[0]?.focus ?? null;
  } catch (error) {
    console.error("getDayFocus failed (is the daily_focus migration applied?)", error);
    return null;
  }
}
