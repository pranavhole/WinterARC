"use server";

import { prisma } from "@/lib/db";
import { ensureDailyRecord } from "@/lib/arc";
import { FOCUS_MAX } from "@/lib/limits";
import { keyToDate } from "@/lib/utils";
import { dayContext, fail, logError, OK, type ActionResult } from "@/lib/actions/context";

/** Save "Today's Focus", one line for the day. Empty clears it. */
export async function saveFocus(date: string, value: unknown): Promise<ActionResult> {
  if (typeof value !== "string" || value.length > FOCUS_MAX * 2) return fail("Keep it to one line.");
  const focus = value.replace(/\s+/g, " ").trim().slice(0, FOCUS_MAX) || null;
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    await ensureDailyRecord(arc, user.id, day);
    await prisma.$executeRaw`
      UPDATE "DailyRecord" SET "focus" = ${focus}, "updatedAt" = now()
      WHERE "arcId" = ${arc.id} AND "userId" = ${user.id} AND "date" = ${keyToDate(day)}`;
  } catch (error) {
    logError("saveFocus", error);
    return fail("Your focus wasn't saved. Try again.");
  }
  // No revalidation: nothing else on the page depends on this line.
  return OK;
}
