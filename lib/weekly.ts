/**
 * Last-7-days summary and plain-language insights. Deterministic: the same
 * data always produces the same sentences. Only metrics the Arc tracks appear.
 */

import { sleepMinutes, formatDuration, formatHours, formatSteps } from "@/lib/metrics";
import type { ArcModules } from "@/lib/modules";
import type { DayCell } from "@/lib/streaks";
import { addDays, formatDay, type DayKey } from "@/lib/utils";

type RecordLike = {
  steps: number | null;
  studyHours: number | null;
  dsaProblems: number | null;
  bedtime: number | null;
  wakeTime: number | null;
  sleepGoal: number | null;
};

export type WeeklyStat = { label: string; value: string };

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function weeklySummary(input: {
  end: DayKey;
  days: DayCell[];
  records: Map<DayKey, RecordLike>;
  tasks: Map<DayKey, { completed: boolean }[]>;
  modules: ArcModules;
  focusName: string;
  sleepGoal: number;
  currentStreak: number;
}) {
  const { end, days, records, tasks, modules } = input;
  const keys = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  const window = days.filter((d) => keys.includes(d.key));
  const counted = window.filter((d) => d.score !== null && d.status !== "today");
  const recs = keys.map((k) => records.get(k)).filter((r): r is RecordLike => r !== undefined);

  const avgCompletion = mean(counted.map((d) => d.score!));
  const stats: WeeklyStat[] = [];
  if (avgCompletion !== null) stats.push({ label: "Average completion", value: `${Math.round(avgCompletion * 100)}%` });

  if (modules.focus) {
    const hours = recs.reduce((sum, r) => sum + (r.studyHours ?? 0), 0);
    stats.push({ label: input.focusName, value: formatHours(hours) });
  }
  if (modules.dsa) {
    stats.push({ label: "DSA problems", value: String(recs.reduce((sum, r) => sum + (r.dsaProblems ?? 0), 0)) });
  }
  const sleeps = recs.map((r) => sleepMinutes(r.bedtime, r.wakeTime)).filter((m): m is number => m !== null);
  if (modules.sleep) stats.push({ label: "Average sleep", value: formatDuration(mean(sleeps)) });
  if (modules.steps) {
    const steps = recs.map((r) => r.steps).filter((s): s is number => s !== null);
    const avg = mean(steps);
    stats.push({ label: "Average steps", value: avg === null ? "—" : formatSteps(Math.round(avg)) });
  }
  if (modules.tasks) {
    const completed = keys.reduce((sum, k) => sum + (tasks.get(k)?.filter((t) => t.completed).length ?? 0), 0);
    stats.push({ label: "Tasks completed", value: String(completed) });
  }

  // Insights
  const insights: string[] = [];
  if (avgCompletion !== null) insights.push(`You completed ${Math.round(avgCompletion * 100)}% of your Arc this week.`);
  if (counted.length >= 3) {
    const best = counted.reduce((a, b) => (b.score! > a.score! ? b : a));
    if (best.score! > 0) insights.push(`Your strongest day was ${formatDay(best.key, { weekday: "long" })}.`);
  }
  if (modules.sleep && sleeps.length) {
    const met = recs.filter((r) => {
      const m = sleepMinutes(r.bedtime, r.wakeTime);
      return m !== null && m / 60 >= (r.sleepGoal ?? input.sleepGoal);
    }).length;
    const elapsed = window.filter((d) => d.status !== "future").length;
    insights.push(`You reached your sleep goal on ${met} of ${elapsed} ${elapsed === 1 ? "day" : "days"}.`);
  }
  if (input.currentStreak > 1) insights.push(`Your current streak is ${input.currentStreak} days.`);

  return { stats, insights };
}
