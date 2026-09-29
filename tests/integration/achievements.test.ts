/** End-to-end achievement engine against the database. Skipped without one. */
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addDays, keyToDate, todayKey } from "@/lib/utils";

async function databaseReady() {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "XPEvent" LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

const ready = await databaseReady();
const created: string[] = [];

async function arcWithStreak(days: number) {
  const today = todayKey("UTC");
  const start = addDays(today, -(days - 1));
  const user = await prisma.user.create({ data: { email: `ach-${Date.now()}-${Math.random()}@arc.test`, name: "Engine Test" } });
  created.push(user.id);
  const arc = await prisma.arc.create({
    data: { userId: user.id, startDate: keyToDate(start), endDate: keyToDate(addDays(start, 89)), statement: "Test", timezone: "UTC", modules: {} },
  });
  const habit = await prisma.habit.create({ data: { arcId: arc.id, title: "Wake", category: "HEALTH", position: 0, activeFrom: keyToDate(start) } });
  const rule = await prisma.habit.create({ data: { arcId: arc.id, title: "No smoking", category: "DISCIPLINE", position: 1, activeFrom: keyToDate(start) } });
  for (let i = 0; i < days; i++) {
    for (const h of [habit, rule]) {
      await prisma.habitLog.create({ data: { habitId: h.id, userId: user.id, date: keyToDate(addDays(start, i)), completed: true } });
    }
  }
  return { userId: user.id, arcId: arc.id, today };
}

describe.skipIf(!ready)("achievement engine (database)", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });


  it("turns a 7 day streak into badges, XP and notifications, idempotently", async () => {
    const { evaluateAchievements } = await import("@/lib/gamification/achievements");
    const { userId } = await arcWithStreak(7);

    await evaluateAchievements(userId);
    const first = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalXp: true, statsStreak: true, statsArcDay: true } });
    const badges = (await prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { key: true } } } })).map((b) => b.badge.key);

    expect(badges).toEqual(expect.arrayContaining(["FIRST_STEP", "EARLY_START", "FIRST_WEEK", "SEVEN_DAY_STREAK", "PERFECT_WEEK"]));
    expect(first.statsStreak).toBe(7);
    expect(first.statsArcDay).toBe(7);
    expect(first.totalXp).toBeGreaterThan(0);
    const ledger = await prisma.xPEvent.aggregate({ where: { userId }, _sum: { amount: true } });
    expect(ledger._sum.amount).toBe(first.totalXp);
    expect(await prisma.notification.count({ where: { userId, type: "STREAK" } })).toBe(1);

    // Running it again changes nothing.
    await evaluateAchievements(userId);
    const second = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalXp: true } });
    expect(second.totalXp).toBe(first.totalXp);
    expect(await prisma.userBadge.count({ where: { userId } })).toBe(badges.length);
  }, 15000);


  it("pays rule XP only for today and yesterday, not for history", async () => {
    const { evaluateAchievements } = await import("@/lib/gamification/achievements");
    const { userId, today } = await arcWithStreak(7);
    await evaluateAchievements(userId);
    const ruleEvents = await prisma.xPEvent.findMany({ where: { userId, type: { in: ["HabitCompleted", "DisciplineCompleted"] } }, select: { referenceId: true } });
    const days = new Set(ruleEvents.map((e) => e.referenceId.split(":")[1]));
    expect([...days].sort()).toEqual([addDays(today, -1), today].sort());
    // Discipline rules earn the smaller amount.
    expect(await prisma.xPEvent.count({ where: { userId, type: "DisciplineCompleted" } })).toBe(2);
  });
});
