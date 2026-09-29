/**
 * Server-side Arc statistics, built from per-day scores (lib/scoring.ts).
 *
 * A day counts toward the streak when its completion is at least 80%.
 * Today is still in progress: it adds to the streak once it reaches 80%, but
 * an unfinished today never breaks the streak, and the streak is counted
 * from yesterday until then.
 *
 * Rules count from their activeFrom day until the day before deactivatedOn,
 * so retiring a rule never rewrites past days.
 */

import { scoreDay, STREAK_THRESHOLD, type RecordSnapshot, type TaskSnapshot } from "@/lib/scoring";
import { addDays, diffDays, type DayKey } from "@/lib/utils";

export type StatsHabit = {
  id: string;
  activeFrom: DayKey;
  deactivatedOn: DayKey | null;
};

export type StatsLog = { habitId: string; date: DayKey; completed: boolean };

export type DayStatus = "complete" | "missed" | "today" | "future" | "empty";

export type DayCell = {
  key: DayKey;
  index: number; // 0-based day of the Arc
  status: DayStatus;
  score: number | null;
  habitsDone: number;
  habitsRequired: number;
};

export type ArcStats = {
  days: DayCell[];
  currentStreak: number;
  bestStreak: number;
  /** Days that reached the streak threshold. */
  completedDays: number;
  /** Mean daily completion over counted days. Null before any counted day. */
  averageCompletion: number | null;
  perHabit: Record<string, number | null>;
};

export function isHabitActiveOn(h: StatsHabit, day: DayKey): boolean {
  return h.activeFrom <= day && (h.deactivatedOn === null || day < h.deactivatedOn);
}

export function computeArcStats(input: {
  startDate: DayKey;
  endDate: DayKey;
  today: DayKey;
  habits: StatsHabit[];
  logs: StatsLog[];
  records: Map<DayKey, RecordSnapshot>;
  tasks: Map<DayKey, TaskSnapshot[]>;
}): ArcStats {
  const { startDate, endDate, today, habits, logs, records, tasks } = input;

  const doneOn = new Map<DayKey, Set<string>>();
  for (const log of logs) {
    if (!log.completed) continue;
    let set = doneOn.get(log.date);
    if (!set) doneOn.set(log.date, (set = new Set()));
    set.add(log.habitId);
  }

  const totalDays = diffDays(startDate, endDate) + 1;
  const days: DayCell[] = [];
  const habitTally = new Map(habits.map((h) => [h.id, { done: 0, required: 0 }]));
  let scoreSum = 0;
  let scoredDays = 0;
  let run = 0;
  let bestStreak = 0;
  let completedDays = 0;

  for (let i = 0; i < totalDays; i++) {
    const key = addDays(startDate, i);
    if (key > today) {
      days.push({ key, index: i, status: "future", score: null, habitsDone: 0, habitsRequired: 0 });
      continue;
    }

    const active = habits.filter((h) => isHabitActiveOn(h, key));
    const doneSet = doneOn.get(key);
    const habitsDone = active.filter((h) => doneSet?.has(h.id)).length;
    const score = scoreDay({
      habitsRequired: active.length,
      habitsDone,
      record: records.get(key) ?? null,
      tasks: tasks.get(key) ?? [],
    });
    const counts = score !== null && score >= STREAK_THRESHOLD;
    const isToday = key === today;

    let status: DayStatus;
    if (score === null) status = "empty";
    else if (counts) status = "complete";
    else status = isToday ? "today" : "missed";
    days.push({ key, index: i, status, score, habitsDone, habitsRequired: active.length });

    // Unfinished today is neither a miss nor a break yet.
    if (isToday && !counts) continue;

    if (counts) {
      completedDays++;
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else if (score !== null) {
      run = 0;
    }

    if (score !== null) {
      scoreSum += score;
      scoredDays++;
    }
    for (const h of active) {
      const t = habitTally.get(h.id)!;
      t.required++;
      if (doneSet?.has(h.id)) t.done++;
    }
  }

  // `run` is the streak ending at the last counted day: today once it reaches
  // the threshold, otherwise yesterday.
  const lastCounted = days.findLast((d) => d.status !== "future" && d.status !== "today");
  const currentStreak =
    lastCounted && (lastCounted.key === today || lastCounted.key === addDays(today, -1)) ? run : 0;

  const perHabit: Record<string, number | null> = {};
  for (const [id, t] of habitTally) perHabit[id] = t.required ? t.done / t.required : null;

  return {
    days,
    currentStreak,
    bestStreak,
    completedDays,
    averageCompletion: scoredDays ? scoreSum / scoredDays : null,
    perHabit,
  };
}
