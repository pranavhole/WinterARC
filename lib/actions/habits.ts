"use server";

import { prisma } from "@/lib/db";
import { ensureDailyRecord } from "@/lib/arc";
import { runAchievements } from "@/lib/gamification/achievements";
import { MAX_HABITS } from "@/lib/arc-engine";
import { isHabitActiveOn } from "@/lib/streaks";
import { dateToKey, keyToDate } from "@/lib/utils";
import { habitInputSchema } from "@/lib/validation";
import { arcContext, dayContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

async function ownedHabit(arcId: string, userId: string, habitId: unknown) {
  if (typeof habitId !== "string" || habitId.length > 64) return null;
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, arcId, arc: { userId, status: "ACTIVE" } },
    select: { id: true, active: true, activeFrom: true, deactivatedOn: true, category: true },
  });
  if (habit) return { ...habit, isDisciplineModel: false };

  const rule = await prisma.disciplineRule.findFirst({
    where: { id: habitId, arcId, arc: { userId, status: "ACTIVE" } },
    select: { id: true, active: true, activeFrom: true, deactivatedOn: true },
  });
  if (rule) return { ...rule, category: "DISCIPLINE" as const, isDisciplineModel: true };

  return null;
}

/** Check or uncheck a rule for a day in the Arc (today or earlier). */
export async function toggleHabit(habitId: string, date: string, completed: boolean): Promise<ActionResult> {
  if (typeof completed !== "boolean") return fail();
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    const habit = await ownedHabit(arc.id, user.id, habitId);
    if (!habit) return fail();

    const activeThatDay = isHabitActiveOn(
      {
        id: habit.id,
        activeFrom: dateToKey(habit.activeFrom),
        deactivatedOn: habit.deactivatedOn ? dateToKey(habit.deactivatedOn) : null,
      },
      day,
    );
    if (!activeThatDay) return fail();

    await ensureDailyRecord(arc, user.id, day);

    if (habit.isDisciplineModel) {
      await prisma.disciplineLog.upsert({
        where: { ruleId_date: { ruleId: habit.id, date: keyToDate(day) } },
        create: { ruleId: habit.id, userId: user.id, date: keyToDate(day), completed },
        update: { completed },
      });
    } else {
      // A manual toggle overrides anything a health sync set, and sync never overwrites it.
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: habit.id, date: keyToDate(day) } },
        create: { habitId: habit.id, userId: user.id, date: keyToDate(day), completed, source: "MANUAL" },
        update: { completed, source: "MANUAL" },
      });
    }

    await runAchievements(user.id, day);
  } catch (error) {
    logError("toggleHabit", error);
    return fail();
  }
  revalidateArc();
  return OK;
}

export async function updateHabit(habitId: string, input: unknown): Promise<ActionResult> {
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return fail("Each rule needs a short title.");
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const habit = await ownedHabit(ctx.arc.id, ctx.user.id, habitId);
    if (!habit) return fail();
    const { title, description, category } = parsed.data;

    if (habit.isDisciplineModel) {
      await prisma.disciplineRule.update({
        where: { id: habit.id },
        data: { title, description: description || null },
      });
    } else {
      await prisma.habit.update({
        where: { id: habit.id },
        data: { title, description: description || null, category },
      });
    }
  } catch (error) {
    logError("updateHabit", error);
    return fail("Something went wrong. Your rule wasn't changed. Try again.");
  }
  revalidateArc();
  return OK;
}

export async function addHabit(input: unknown): Promise<ActionResult> {
  const parsed = habitInputSchema.safeParse(input);
  if (!parsed.success) return fail("Each rule needs a short title.");
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { arc } = ctx;
    const [activeCount, last] = await Promise.all([
      prisma.habit.count({ where: { arcId: arc.id, active: true } }),
      prisma.habit.findFirst({ where: { arcId: arc.id }, orderBy: { position: "desc" }, select: { position: true } }),
    ]);
    if (activeCount >= MAX_HABITS) return fail(`Keep it to ${MAX_HABITS} rules or fewer.`);

    const { title, description, category } = parsed.data;
    await prisma.habit.create({
      data: {
        arcId: arc.id,
        title,
        description: description || null,
        category,
        position: (last?.position ?? -1) + 1,
        activeFrom: keyToDate(arc.today),
      },
    });
  } catch (error) {
    logError("addHabit", error);
    return fail("Something went wrong. Your rule wasn't added. Try again.");
  }
  revalidateArc();
  return OK;
}

/**
 * Take a rule out of the Arc from today onward.
 * A rule with any recorded history is deactivated so past days stay exactly as
 * they were. A rule with no history at all is deleted outright.
 */
export async function removeHabit(habitId: string): Promise<ActionResult> {
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { arc } = ctx;
    const habit = await ownedHabit(arc.id, ctx.user.id, habitId);
    if (!habit || !habit.active) return fail();

    if (habit.isDisciplineModel) {
      const history = await prisma.disciplineLog.count({ where: { ruleId: habit.id, completed: true } });
      if (history === 0) {
        await prisma.disciplineRule.delete({ where: { id: habit.id } });
      } else {
        await prisma.disciplineRule.update({
          where: { id: habit.id },
          data: { active: false, deactivatedOn: keyToDate(arc.today) },
        });
      }
      revalidateArc();
      return OK;
    }

    const remaining = await prisma.habit.count({ where: { arcId: arc.id, active: true, id: { not: habit.id } } });
    if (remaining === 0) return fail("Your Arc needs at least one rule.");

    const history = await prisma.habitLog.count({ where: { habitId: habit.id, completed: true } });
    if (history === 0) {
      await prisma.habit.delete({ where: { id: habit.id } });
    } else {
      await prisma.habit.update({
        where: { id: habit.id },
        data: { active: false, deactivatedOn: keyToDate(arc.today) },
      });
    }
  } catch (error) {
    logError("removeHabit", error);
    return fail("Something went wrong. Your rule wasn't changed. Try again.");
  }
  revalidateArc();
  return OK;
}
