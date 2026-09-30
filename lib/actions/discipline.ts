"use server";

import { prisma } from "@/lib/db";
import { ensureDailyRecord } from "@/lib/arc";
import { scheduleAchievements } from "@/lib/gamification/achievements";
import { isHabitActiveOn } from "@/lib/streaks";
import { dateToKey, keyToDate } from "@/lib/utils";
import { disciplineInputSchema } from "@/lib/validation";
import { arcContext, dayContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";
import { migrateDisciplineHabits } from "@/lib/discipline";

async function ownedDisciplineRule(arcId: string, userId: string, ruleId: unknown) {
  if (typeof ruleId !== "string" || ruleId.length > 64) return null;
  return prisma.disciplineRule.findFirst({
    where: { id: ruleId, arcId, arc: { userId, status: "ACTIVE" } },
    select: { id: true, active: true, activeFrom: true, deactivatedOn: true },
  });
}

export async function toggleDisciplineRule(ruleId: string, date: string, completed: boolean): Promise<ActionResult> {
  if (typeof completed !== "boolean") return fail();
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    const rule = await ownedDisciplineRule(arc.id, user.id, ruleId);
    if (!rule) return fail();

    const activeThatDay = isHabitActiveOn(
      {
        id: rule.id,
        activeFrom: dateToKey(rule.activeFrom),
        deactivatedOn: rule.deactivatedOn ? dateToKey(rule.deactivatedOn) : null,
      },
      day,
    );
    if (!activeThatDay) return fail();

    // Independent writes: one round trip instead of two.
    await Promise.all([
      ensureDailyRecord(arc, user.id, day),
      prisma.disciplineLog.upsert({
        where: { ruleId_date: { ruleId: rule.id, date: keyToDate(day) } },
        create: { ruleId: rule.id, userId: user.id, date: keyToDate(day), completed },
        update: { completed },
      }),
    ]);
    scheduleAchievements(user.id, day);
  } catch (error) {
    logError("toggleDisciplineRule", error);
    return fail();
  }
  revalidateArc();
  return OK;
}

export async function addDisciplineRule(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = disciplineInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid discipline rule.");
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { arc } = ctx;

    const [activeCount, last] = await Promise.all([
      prisma.disciplineRule.count({ where: { arcId: arc.id, active: true } }),
      prisma.disciplineRule.findFirst({ where: { arcId: arc.id }, orderBy: { position: "desc" }, select: { position: true } }),
    ]);
    if (activeCount >= 20) return fail("Keep discipline rules to 20 or fewer.");

    const { title, description } = parsed.data;
    const created = await prisma.disciplineRule.create({
      data: {
        arcId: arc.id,
        title,
        description: description || null,
        position: (last?.position ?? -1) + 1,
        activeFrom: keyToDate(arc.today),
      },
      select: { id: true },
    });
    revalidateArc();
    return { ok: true, id: created.id };
  } catch (error) {
    logError("addDisciplineRule", error);
    return fail("Could not add discipline rule.");
  }
}

export async function updateDisciplineRule(ruleId: string, input: unknown): Promise<ActionResult> {
  const parsed = disciplineInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid discipline rule.");
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const rule = await ownedDisciplineRule(ctx.arc.id, ctx.user.id, ruleId);
    if (!rule) return fail();

    const { title, description } = parsed.data;
    await prisma.disciplineRule.update({
      where: { id: rule.id },
      data: { title, description: description || null },
    });
  } catch (error) {
    logError("updateDisciplineRule", error);
    return fail("Could not update discipline rule.");
  }
  revalidateArc();
  return OK;
}

export async function removeDisciplineRule(ruleId: string): Promise<ActionResult> {
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { arc } = ctx;
    const rule = await ownedDisciplineRule(arc.id, ctx.user.id, ruleId);
    if (!rule || !rule.active) return fail();

    const history = await prisma.disciplineLog.count({ where: { ruleId: rule.id, completed: true } });
    if (history === 0) {
      await prisma.disciplineRule.delete({ where: { id: rule.id } });
    } else {
      await prisma.disciplineRule.update({
        where: { id: rule.id },
        data: { active: false, deactivatedOn: keyToDate(arc.today) },
      });
    }
  } catch (error) {
    logError("removeDisciplineRule", error);
    return fail("Could not remove discipline rule.");
  }
  revalidateArc();
  return OK;
}

export async function migrateDisciplineAction(): Promise<ActionResult & { count?: number }> {
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const count = await migrateDisciplineHabits(ctx.arc.id);
    revalidateArc();
    return { ok: true, count };
  } catch (error) {
    logError("migrateDisciplineAction", error);
    return fail("Could not migrate discipline rules.");
  }
}
