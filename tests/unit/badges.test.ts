import { describe, expect, it } from "vitest";
import { BADGES, earnedBadgeKeys } from "@/lib/gamification/badges";
import { buildSnapshot } from "@/lib/gamification/snapshot";
import { computeArcStats, type StatsHabit } from "@/lib/streaks";
import { addDays, type DayKey } from "@/lib/utils";

const START = "2026-09-01";

/** An Arc where `doneDays` (0-based day indexes) have every rule completed, as of day `todayIndex`. */
function arcSnapshot(opts: { doneDays: number[]; todayIndex: number; habits?: (StatsHabit & { category: string })[] }) {
  const habits = opts.habits ?? [
    { id: "wake", activeFrom: START, deactivatedOn: null, category: "HEALTH" },
    { id: "nosmoke", activeFrom: START, deactivatedOn: null, category: "DISCIPLINE" },
  ];
  const today = addDays(START, opts.todayIndex);
  const logs = opts.doneDays.flatMap((i) => habits.map((h) => ({ habitId: h.id, date: addDays(START, i), completed: true })));
  const stats = computeArcStats({
    startDate: START,
    endDate: addDays(START, 89),
    today,
    habits,
    logs,
    records: new Map(),
    tasks: new Map(),
  });
  const doneByDay = new Map<DayKey, Set<string>>();
  for (const l of logs) (doneByDay.get(l.date) ?? doneByDay.set(l.date, new Set()).get(l.date)!).add(l.habitId);
  return buildSnapshot({
    days: stats.days,
    today,
    arcLength: 90,
    dayNumber: opts.todayIndex + 1,
    habits,
    doneByDay,
    focusMetByDay: new Map(),
    tasksCompleted: 0,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    completedDays: stats.completedDays,
    averageCompletion: stats.averageCompletion,
    arcFinished: false,
  });
}

const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => from + i);

describe("badge engine", () => {
  it("unlocks 7 Day Discipline after a 7 day streak", () => {
    const earned = earnedBadgeKeys(arcSnapshot({ doneDays: range(7), todayIndex: 6 }));
    expect(earned).toContain("SEVEN_DAY_STREAK");
    expect(earned).toContain("FIRST_STEP");
    expect(earned).toContain("FIRST_WEEK");
    expect(earned).not.toContain("FOURTEEN_DAY_STREAK");
  });

  it("does not unlock it at 6 days", () => {
    const earned = earnedBadgeKeys(arcSnapshot({ doneDays: range(6), todayIndex: 6 }));
    expect(earned).not.toContain("SEVEN_DAY_STREAK");
  });

  it("does not count a broken run as a streak", () => {
    // Days 0–3 done, day 4 missed, days 5–7 done: best run is 4.
    const earned = earnedBadgeKeys(arcSnapshot({ doneDays: [0, 1, 2, 3, 5, 6, 7], todayIndex: 8 }));
    expect(earned).not.toContain("SEVEN_DAY_STREAK");
  });

  it("recognises a comeback after a missed day", () => {
    const earned = earnedBadgeKeys(arcSnapshot({ doneDays: [0, 1, 3, 4, 5], todayIndex: 6 }));
    expect(earned).toContain("COMEBACK");
  });

  it("reports progress toward locked badges", () => {
    const snapshot = arcSnapshot({ doneDays: range(12), todayIndex: 12 });
    const thirty = BADGES.find((b) => b.key === "THIRTY_DAY_STREAK")!;
    expect(thirty.progress(snapshot)).toEqual({ current: 12, target: 30 });
  });

  it("counts perfect days toward Perfect Week", () => {
    expect(earnedBadgeKeys(arcSnapshot({ doneDays: range(7), todayIndex: 7 }))).toContain("PERFECT_WEEK");
  });

  it("keeps the registry to a meaningful size with unique keys", () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(15);
    expect(BADGES.length).toBeLessThanOrEqual(25);
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
  });

  it("only awards the finisher badge when the Arc is finished", () => {
    const snapshot = arcSnapshot({ doneDays: range(89), todayIndex: 89 });
    expect(earnedBadgeKeys(snapshot)).not.toContain("NINETY_DAY_FINISHER");
    expect(earnedBadgeKeys({ ...snapshot, arcFinished: true })).toContain("NINETY_DAY_FINISHER");
  });
});
