"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureDailyRecord } from "@/lib/arc";
import { keyToDate } from "@/lib/utils";
import { saveDailyRecord } from "@/lib/actions/daily-record";
import { dayContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

const DEFAULT_WAKE = 7 * 60;

const manualLogSchema = z
  .object({
    steps: z.number().int().min(0).max(200_000).nullable(),
    sleepMinutes: z.number().int().min(0).max(24 * 60).nullable(),
    exerciseMinutes: z.number().int().min(0).max(24 * 60).nullable(),
    weight: z.number().gt(0).max(500).nullable(),
  })
  .partial()
  .strict();

/**
 * Log the TODAY card by hand: steps, sleep, exercise, weight. Only the fields
 * sent change; null clears one. Values typed here are marked manual, so a
 * later health sync leaves them alone.
 */
export async function saveManualLog(date: string, input: unknown): Promise<ActionResult> {
  const parsed = manualLogSchema.safeParse(input);
  if (!parsed.success || !Object.keys(parsed.data).length) return fail("Check the numbers and try again.");
  const { steps, sleepMinutes, exerciseMinutes, weight } = parsed.data;

  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;

    const patch: Record<string, number | null> = {};
    if (steps !== undefined) patch.steps = steps;
    if (weight !== undefined) patch.weight = weight === null ? null : Math.round(weight * 10) / 10;
    if (sleepMinutes !== undefined) {
      if (sleepMinutes === null || sleepMinutes === 0) {
        patch.bedtime = null;
        patch.wakeTime = null;
      } else {
        // Sleep is stored as bedtime → wake time. Keep the day's wake time and work back.
        const record = await prisma.dailyRecord.findUnique({
          where: { arcId_date: { arcId: arc.id, date: keyToDate(day) } },
          select: { wakeTime: true },
        });
        const wake = record?.wakeTime ?? DEFAULT_WAKE;
        patch.wakeTime = wake;
        patch.bedtime = (((wake - sleepMinutes) % 1440) + 1440) % 1440;
      }
    }

    if (Object.keys(patch).length) {
      const saved = await saveDailyRecord(day, patch);
      if (!saved.ok) return saved;
    }

    if (exerciseMinutes !== undefined) {
      await ensureDailyRecord(arc, user.id, day);
      await prisma.$executeRaw`
        UPDATE "DailyRecord" SET "exerciseMinutes" = ${exerciseMinutes || null}, "updatedAt" = now()
        WHERE "arcId" = ${arc.id} AND "userId" = ${user.id} AND "date" = ${keyToDate(day)}`;
    }
  } catch (error) {
    logError("saveManualLog", error);
    return fail("That wasn't saved. Try again.");
  }
  revalidateArc();
  return OK;
}
