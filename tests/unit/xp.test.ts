import { describe, expect, it } from "vitest";
import { awardXp, xpKey, XP, type XPAward, type XPStore } from "@/lib/gamification/xp";
import { LEVEL_THRESHOLDS, levelForXp } from "@/lib/gamification/levels";

/** In-memory XPStore with the same contract as the Prisma one: unique (userId, key). */
function memoryStore() {
  const events = new Map<string, XPAward & { key: string }>();
  const totals = new Map<string, number>();
  const levels = new Map<string, number>();
  const store: XPStore = {
    async insertEvent(e) {
      const id = `${e.userId}|${e.key}`;
      if (events.has(id)) return false;
      events.set(id, e);
      return true;
    },
    async incrementTotal(userId, amount) {
      const next = (totals.get(userId) ?? 0) + amount;
      totals.set(userId, next);
      return next;
    },
    async setLevel(userId, level) {
      levels.set(userId, level);
    },
  };
  return { store, events, totals, levels };
}

const habitDone = (habitId: string, day: string): XPAward => ({
  userId: "u1",
  arcId: "arc1",
  type: "HabitCompleted",
  amount: XP.HABIT_COMPLETED,
  referenceType: "HabitDay",
  referenceId: `${habitId}:${day}`,
});

describe("XP ledger", () => {
  it("never awards the same event twice", async () => {
    const { store, events, totals } = memoryStore();
    expect(await awardXp(store, habitDone("h1", "2026-09-29"))).toBe(10);
    // Uncheck and check again, or a retried request: same key, no XP.
    expect(await awardXp(store, habitDone("h1", "2026-09-29"))).toBe(0);
    expect(await awardXp(store, habitDone("h1", "2026-09-29"))).toBe(0);
    expect(events.size).toBe(1);
    expect(totals.get("u1")).toBe(10);
  });

  it("awards the same habit again on a different day", async () => {
    const { store, totals } = memoryStore();
    await awardXp(store, habitDone("h1", "2026-09-28"));
    await awardXp(store, habitDone("h1", "2026-09-29"));
    expect(totals.get("u1")).toBe(20);
  });

  it("keys on user + type + reference", () => {
    expect(xpKey(habitDone("h1", "2026-09-29"))).toBe("HabitCompleted:HabitDay:h1:2026-09-29");
  });

  it("ignores zero, negative and fractional amounts", async () => {
    const { store, events } = memoryStore();
    expect(await awardXp(store, { ...habitDone("h1", "d"), amount: 0 })).toBe(0);
    expect(await awardXp(store, { ...habitDone("h2", "d"), amount: -5 })).toBe(0);
    expect(await awardXp(store, { ...habitDone("h3", "d"), amount: 2.5 })).toBe(0);
    expect(events.size).toBe(0);
  });

  it("updates the cached level as XP crosses thresholds", async () => {
    const { store, levels } = memoryStore();
    await awardXp(store, { ...habitDone("big", "d"), amount: 260 });
    expect(levels.get("u1")).toBe(3);
  });
});

describe("levels", () => {
  it("follows the configured start of the table", () => {
    expect(LEVEL_THRESHOLDS.slice(0, 5)).toEqual([0, 100, 250, 500, 850]);
  });

  it("reports progress to the next level", () => {
    const info = levelForXp(1240);
    expect(info.level).toBeGreaterThan(1);
    expect(info.floor).toBeLessThanOrEqual(1240);
    expect(info.next).toBeGreaterThan(1240);
    expect(info.progress).toBeGreaterThanOrEqual(0);
    expect(info.progress).toBeLessThan(1);
  });

  it("starts at level 1 with 0 XP", () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, floor: 0, next: 100, progress: 0 });
  });
});
