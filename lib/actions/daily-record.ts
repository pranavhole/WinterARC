"use server";

import { prisma } from "@/lib/db";
import { goalSnapshot } from "@/lib/arc";
import { keyToDate } from "@/lib/utils";
import { dailyRecordPatchSchema } from "@/lib/validation";
import { scheduleAchievements } from "@/lib/gamification/achievements";
import { dayContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";
import type { DailyRecordPatch } from "@/lib/validation";

/**
 * A value typed by hand is marked MANUAL, so a later health sync leaves it
 * alone. Clearing it (null) hands the field back to the sync.
 */
function manualSources(p: DailyRecordPatch) {
  const source = (v: unknown) => (v === null ? null : "MANUAL" as const);
  return {
    ...("steps" in p ? { stepsSource: source(p.steps) } : {}),
    ...("weight" in p ? { weightSource: source(p.weight) } : {}),
    ...("bedtime" in p || "wakeTime" in p ? { sleepSource: source(p.bedtime ?? p.wakeTime ?? null) } : {}),
  };
}

/**
 * Save part of one day's metrics (steps, weight, focus, DSA, sleep).
 * Only the fields sent are written; `null` clears a value.
 */
export async function saveDailyRecord(date: string, patch: unknown): Promise<ActionResult> {
  const parsed = dailyRecordPatchSchema.safeParse(patch);
  if (!parsed.success || Object.keys(parsed.data).length === 0) return fail("That value doesn't look right.");
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    const snapshot = goalSnapshot(arc, day);
    const patch = { ...parsed.data, ...manualSources(parsed.data) };
    await prisma.dailyRecord.upsert({
      where: { arcId_date: { arcId: arc.id, date: keyToDate(day) } },
      create: { userId: user.id, arcId: arc.id, date: keyToDate(day), ...snapshot, ...patch },
      update: { ...patch, ...(day === arc.today ? snapshot : {}) },
    });
    scheduleAchievements(user.id, day);
  } catch (error) {
    logError("saveDailyRecord", error);
    return fail();
  }
  revalidateArc();
  return OK;
}
