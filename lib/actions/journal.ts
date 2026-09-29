"use server";

import { prisma } from "@/lib/db";
import { goalSnapshot } from "@/lib/arc";
import { keyToDate } from "@/lib/utils";
import { dailyRecordPatchSchema } from "@/lib/validation";
import { dayContext, fail, logError, OK, type ActionResult } from "@/lib/actions/context";

const journalSchema = dailyRecordPatchSchema.pick({ journal: true }).required();

/**
 * Autosaved journal. The journal isn't scored, so nothing else on the page
 * changes and the route isn't revalidated on every save.
 */
export async function saveJournal(date: string, journal: string): Promise<ActionResult> {
  const parsed = journalSchema.safeParse({ journal });
  if (!parsed.success) return fail("That entry is too long.");
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    await prisma.dailyRecord.upsert({
      where: { arcId_date: { arcId: arc.id, date: keyToDate(day) } },
      create: { userId: user.id, arcId: arc.id, date: keyToDate(day), ...goalSnapshot(arc, day), ...parsed.data },
      update: parsed.data,
    });
  } catch (error) {
    logError("saveJournal", error);
    return fail("Couldn't save. Your words are still here. Try again.");
  }
  return OK;
}
