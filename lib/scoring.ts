/**
 * Daily completion score.
 *
 * - Arc habits are the core commitment and weigh double.
 * - Metrics (steps, sleep, focus, DSA) add partial credit toward their goal,
 *   but only on days where that module was tracked (the goal snapshot on the
 *   DailyRecord is set). A user who doesn't track steps is never scored on steps.
 * - Tasks count one each, if tasks were tracked that day. Tasks carried to
 *   another day are left out, so deferring doesn't count against you twice.
 * - Weight and the journal are recorded, never scored.
 */

import { sleepMinutes } from "@/lib/metrics";

export const HABIT_WEIGHT = 2;
export const STREAK_THRESHOLD = 0.8;

export type RecordSnapshot = {
  steps: number | null;
  studyHours: number | null;
  dsaProblems: number | null;
  bedtime: number | null;
  wakeTime: number | null;
  stepGoal: number | null;
  sleepGoal: number | null;
  focusGoal: number | null;
  dsaGoal: number | null;
  trackTasks: boolean;
};

export type TaskSnapshot = { completed: boolean; carried: boolean };

const part = (value: number | null, goal: number) => Math.min(1, Math.max(0, (value ?? 0) / goal));

/** Returns 0..1, or null when nothing was required that day. */
export function scoreDay(input: {
  habitsRequired: number;
  habitsDone: number;
  record: RecordSnapshot | null;
  tasks: TaskSnapshot[];
}): number | null {
  let earned = input.habitsDone * HABIT_WEIGHT;
  let possible = input.habitsRequired * HABIT_WEIGHT;
  const r = input.record;

  if (r) {
    if (r.stepGoal) {
      earned += part(r.steps, r.stepGoal);
      possible += 1;
    }
    if (r.sleepGoal) {
      const minutes = sleepMinutes(r.bedtime, r.wakeTime);
      earned += part(minutes === null ? null : minutes / 60, r.sleepGoal);
      possible += 1;
    }
    if (r.focusGoal) {
      earned += part(r.studyHours, r.focusGoal);
      possible += 1;
    }
    if (r.dsaGoal) {
      earned += part(r.dsaProblems, r.dsaGoal);
      possible += 1;
    }
    if (r.trackTasks) {
      for (const t of input.tasks) {
        if (t.carried) continue;
        possible += 1;
        if (t.completed) earned += 1;
      }
    }
  }

  return possible > 0 ? earned / possible : null;
}

/** Neutral heatmap level: 0 none, 1 under 50%, 2 50–79%, 3 80–99%, 4 100%. */
export function scoreLevel(score: number | null): 0 | 1 | 2 | 3 | 4 {
  if (score === null || score <= 0) return 0;
  if (score >= 0.999) return 4;
  if (score >= STREAK_THRESHOLD) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

export function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
