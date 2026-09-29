"use server";

import { prisma } from "@/lib/db";
import { goalSnapshot } from "@/lib/arc";
import { parseModules } from "@/lib/modules";
import { addDays, keyToDate } from "@/lib/utils";
import { settingsSchema } from "@/lib/validation";
import { arcContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

/**
 * Update Arc dates, goals and modules. Past days keep the goals they were
 * scored with (snapshotted on each DailyRecord); only today follows the change.
 */
export async function updateArcSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return fail("Some settings are out of range. Check the values and try again.");
  const s = parsed.data;

  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { user, arc } = ctx;

    const endDate = addDays(s.startDate, s.length - 1);
    if (s.startDate > arc.today) return fail("Your Arc can't start in the future.");
    if (endDate < arc.today) return fail("That length would end your Arc before today.");

    const modules = parseModules(s.modules);
    const updated = {
      ...arc,
      startDate: s.startDate,
      endDate,
      modules,
      focusKind: s.focusKind,
      goals: {
        stepGoal: s.stepGoal,
        sleepGoal: s.sleepGoal,
        focusGoalWeekday: s.focusGoalWeekday,
        focusGoalWeekend: s.focusGoalWeekend,
        dsaGoal: s.dsaGoal,
      },
    };

    await prisma.$transaction([
      prisma.arc.update({
        where: { id: arc.id, userId: user.id },
        data: {
          startDate: keyToDate(s.startDate),
          endDate: keyToDate(endDate),
          modules,
          focusKind: s.focusKind,
          ...updated.goals,
        },
      }),
      prisma.dailyRecord.updateMany({
        where: { arcId: arc.id, userId: user.id, date: keyToDate(arc.today) },
        data: goalSnapshot(updated, arc.today),
      }),
    ]);
  } catch (error) {
    logError("updateArcSettings", error);
    return fail("Something went wrong. Your settings weren't changed. Try again.");
  }
  revalidateArc();
  return OK;
}
