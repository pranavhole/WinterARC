/**
 * Runs against the database in DATABASE_URL (with migrations applied).
 * Skipped automatically when no database is reachable.
 *   npm run db:deploy && npm test
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { todayKey, keyToDate, addDays } from "@/lib/utils";

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

describe.skipIf(!ready)("persistence (database)", () => {
  let userId = "";
  let arcId = "";
  const habitIds: Record<string, string> = {};
  const today = todayKey("UTC");

  beforeAll(async () => {
    const user = await prisma.user.create({ data: { email: `test-${Date.now()}@arc.test`, name: "Test Runner" } });
    userId = user.id;
    const arc = await prisma.arc.create({
      data: {
        userId,
        startDate: keyToDate(addDays(today, -2)),
        endDate: keyToDate(addDays(today, 87)),
        statement: "Test Arc",
        timezone: "UTC",
      },
    });
    arcId = arc.id;
    for (const [i, [key, category]] of ([["wake", "HEALTH"], ["noSmoking", "DISCIPLINE"]] as const).entries()) {
      const h = await prisma.habit.create({
        data: { arcId, title: key, category, position: i, activeFrom: keyToDate(addDays(today, -2)) },
      });
      habitIds[key] = h.id;
    }
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("persists habit and discipline completion", async () => {
    const { loadArcOverview } = await import("@/lib/arc");
    for (const id of Object.values(habitIds)) {
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: id, date: keyToDate(today) } },
        create: { habitId: id, userId, date: keyToDate(today), completed: true, source: "MANUAL" },
        update: { completed: true, source: "MANUAL" },
      });
    }
    const overview = await loadArcOverview(userId);
    const habits = overview!.habitsOn(today);
    expect(habits.find((h) => h.id === habitIds.wake)?.completed).toBe(true);
    expect(habits.find((h) => h.id === habitIds.noSmoking)?.completed).toBe(true);
  });

  it("awards XP for the same event only once, even concurrently", async () => {
    const { grantXp } = await import("@/lib/gamification/ledger");
    const award = { userId, arcId, type: "HabitCompleted" as const, amount: 10, referenceType: "HabitDay", referenceId: `${habitIds.wake}:${today}` };
    const results = await Promise.all([grantXp(award), grantXp(award), grantXp(award)]);
    expect(results.filter((r) => r === 10)).toHaveLength(1);
    expect(await prisma.xPEvent.count({ where: { userId } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).totalXp).toBe(10);
  });

  it("does not duplicate health metrics across syncs", async () => {
    const { syncDays } = await import("@/lib/health/sync");
    const record = { id: "steps-1", start: new Date(`${today}T06:00:00Z`), end: new Date(`${today}T07:00:00Z`), count: 4200 };
    const provider = {
      kind: "GOOGLE_HEALTH" as const,
      disconnect: async () => {},
      getSteps: async () => 4200,
      getSleep: async () => null,
      getExercise: async () => [],
      getWeight: async () => null,
      getDayRecords: async () => ({ steps: [record, record], sleep: [], exercise: [], weight: [] }),
    };
    const first = await syncDays(userId, provider, "GOOGLE_HEALTH", [today], ["steps"]);
    const second = await syncDays(userId, provider, "GOOGLE_HEALTH", [today], ["steps"]);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    const rows = await prisma.healthDailyMetric.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].steps).toBe(4200);
  });
});
