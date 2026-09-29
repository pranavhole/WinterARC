import "server-only";
import { prisma } from "@/lib/db";
import { dateToKey, type DayKey } from "@/lib/utils";

export type DisciplineRuleView = {
  id: string;
  arcId: string;
  title: string;
  description: string | null;
  position: number;
  reason: string | null;
  active: boolean;
  activeFrom: DayKey;
  deactivatedOn: DayKey | null;
};

export async function getDisciplineRules(arcId: string): Promise<DisciplineRuleView[]> {
  const rules = await prisma.disciplineRule.findMany({
    where: { arcId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return rules.map((r) => ({
    id: r.id,
    arcId: r.arcId,
    title: r.title,
    description: r.description,
    position: r.position,
    reason: r.reason,
    active: r.active,
    activeFrom: dateToKey(r.activeFrom),
    deactivatedOn: r.deactivatedOn ? dateToKey(r.deactivatedOn) : null,
  }));
}

export async function getDisciplineLogs(userId: string, arcId: string) {
  const logs = await prisma.disciplineLog.findMany({
    where: { userId, rule: { arcId } },
    select: { ruleId: true, date: true, completed: true },
  });

  return logs.map((l) => ({
    ruleId: l.ruleId,
    date: dateToKey(l.date),
    completed: l.completed,
  }));
}

/**
 * Migrate legacy habits with category 'DISCIPLINE' to the dedicated DisciplineRule table.
 */
export async function migrateDisciplineHabits(arcId: string): Promise<number> {
  const legacyHabits = await prisma.habit.findMany({
    where: { arcId, category: "DISCIPLINE" },
    include: { logs: true },
  });

  if (legacyHabits.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    for (const h of legacyHabits) {
      const created = await tx.disciplineRule.create({
        data: {
          arcId: h.arcId,
          title: h.title,
          description: h.description,
          position: h.position,
          reason: h.reason,
          active: h.active,
          activeFrom: h.activeFrom,
          deactivatedOn: h.deactivatedOn,
        },
      });

      if (h.logs.length > 0) {
        await tx.disciplineLog.createMany({
          data: h.logs.map((l) => ({
            ruleId: created.id,
            userId: l.userId,
            date: l.date,
            completed: l.completed,
          })),
          skipDuplicates: true,
        });
      }

      await tx.habit.delete({ where: { id: h.id } });
    }
  });

  return legacyHabits.length;
}
