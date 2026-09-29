/**
 * The facts badges are judged on, derived from an Arc's day-by-day stats.
 * Pure: the achievement engine builds it on the server; tests build it by hand.
 */

import type { ArcOverview } from "@/lib/arc";
import { isHabitActiveOn, type DayCell, type StatsHabit } from "@/lib/streaks";
import type { DayKey } from "@/lib/utils";

export type AchievementSnapshot = {
  /** Days of the Arc reached so far (1-based day number of today). */
  dayNumber: number;
  arcLength: number;
  /** Days at 80%+ (the streak threshold). */
  completedDays: number;
  currentStreak: number;
  bestStreak: number;
  averageCompletion: number | null;
  /** Day 1 of the Arc reached 80%. */
  firstDayComplete: boolean;
  /** Longest run of days at 100%. */
  bestPerfectRun: number;
  /** Longest run of days that met the focus goal. */
  bestFocusRun: number;
  /** Most days any single rule was completed. */
  bestHabitDays: number;
  /** Days on which every discipline rule was kept. */
  disciplineDays: number;
  tasksCompleted: number;
  /** A missed day followed by three days at 80%+. */
  cameBack: boolean;
  arcFinished: boolean;
};

export type SnapshotHabit = StatsHabit & { category: string };

export function buildSnapshot(input: {
  days: DayCell[];
  today: DayKey;
  arcLength: number;
  dayNumber: number;
  habits: SnapshotHabit[];
  doneByDay: Map<DayKey, Set<string>>;
  focusMetByDay: Map<DayKey, boolean>;
  tasksCompleted: number;
  currentStreak: number;
  bestStreak: number;
  completedDays: number;
  averageCompletion: number | null;
  arcFinished: boolean;
}): AchievementSnapshot {
  const reached = input.days.filter((d) => d.key <= input.today);

  let perfectRun = 0;
  let bestPerfectRun = 0;
  let focusRun = 0;
  let bestFocusRun = 0;
  let disciplineDays = 0;
  let missedBefore = false;
  let comebackRun = 0;
  let cameBack = false;
  const habitDays = new Map<string, number>();

  for (const day of reached) {
    const perfect = day.score !== null && day.score >= 0.999;
    perfectRun = perfect ? perfectRun + 1 : day.key === input.today ? perfectRun : 0;
    bestPerfectRun = Math.max(bestPerfectRun, perfectRun);

    const focusMet = input.focusMetByDay.get(day.key) === true;
    focusRun = focusMet ? focusRun + 1 : day.key === input.today ? focusRun : 0;
    bestFocusRun = Math.max(bestFocusRun, focusRun);

    const done = input.doneByDay.get(day.key);
    const discipline = input.habits.filter((h) => h.category === "DISCIPLINE" && isHabitActiveOn(h, day.key));
    if (discipline.length && discipline.every((h) => done?.has(h.id))) disciplineDays++;
    for (const id of done ?? []) habitDays.set(id, (habitDays.get(id) ?? 0) + 1);

    if (day.status === "missed") {
      missedBefore = true;
      comebackRun = 0;
    } else if (day.status === "complete" && missedBefore) {
      comebackRun++;
      if (comebackRun >= 3) cameBack = true;
    }
  }

  return {
    dayNumber: input.dayNumber,
    arcLength: input.arcLength,
    completedDays: input.completedDays,
    currentStreak: input.currentStreak,
    bestStreak: input.bestStreak,
    averageCompletion: input.averageCompletion,
    firstDayComplete: input.days[0]?.status === "complete",
    bestPerfectRun,
    bestFocusRun,
    bestHabitDays: Math.max(0, ...habitDays.values()),
    disciplineDays,
    tasksCompleted: input.tasksCompleted,
    cameBack,
    arcFinished: input.arcFinished,
  };
}

/** The snapshot for the user's active Arc. The Arc counts as finished once its last day reaches 80%. */
export function snapshotFromOverview(overview: ArcOverview): AchievementSnapshot {
  const { arc, stats, doneByDay, snapshotHabits, recordsByDay, tasksByDay } = overview;
  const focusMetByDay = new Map<DayKey, boolean>();
  for (const [key, r] of recordsByDay) focusMetByDay.set(key, !!r.focusGoal && (r.studyHours ?? 0) >= r.focusGoal);
  let tasksCompleted = 0;
  for (const list of tasksByDay.values()) tasksCompleted += list.filter((t) => t.completed).length;
  const todayCell = stats.days.find((d) => d.key === arc.today);

  return buildSnapshot({
    days: stats.days,
    today: arc.today,
    arcLength: arc.length,
    dayNumber: arc.dayNumber,
    habits: snapshotHabits,
    doneByDay,
    focusMetByDay,
    tasksCompleted,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    completedDays: stats.completedDays,
    averageCompletion: stats.averageCompletion,
    arcFinished: arc.dayNumber === arc.length && todayCell?.status === "complete",
  });
}
