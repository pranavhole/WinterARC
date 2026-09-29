/**
 * Turn one day's raw provider records into ARC's DailyHealth summary.
 * Pure and deterministic: records are de-duplicated by provider id, and the
 * hash covers the de-duplicated records, so re-syncing the same data is a no-op
 * and a record delivered twice never counts twice.
 */

import { createHash } from "node:crypto";
import type { DailyHealth, DayRecords, HealthDataType } from "@/lib/health/types";
import type { DayKey } from "@/lib/utils";

function uniqueById<T extends { id: string }>(records: T[]): T[] {
  const seen = new Map<string, T>();
  for (const r of records) seen.set(r.id, r);
  return [...seen.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

export function normalizeDay(date: DayKey, raw: DayRecords, types: HealthDataType[]): DailyHealth {
  const want = new Set(types);
  const steps = want.has("steps") ? uniqueById(raw.steps) : [];
  const sleep = want.has("sleep") ? uniqueById(raw.sleep) : [];
  const exercise = want.has("exercise") ? uniqueById(raw.exercise) : [];
  const weight = want.has("weight") ? uniqueById(raw.weight) : [];

  // The main sleep is the longest session ending on this day.
  const main = sleep.reduce<(typeof sleep)[number] | null>((best, s) => (!best || s.minutesAsleep > best.minutesAsleep ? s : best), null);
  const latestWeight = weight.reduce<(typeof weight)[number] | null>((last, w) => (!last || w.time > last.time ? w : last), null);

  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        steps: steps.map((s) => [s.id, s.count]),
        sleep: sleep.map((s) => [s.id, s.start.getTime(), s.end.getTime(), s.minutesAsleep]),
        exercise: exercise.map((e) => [e.id, e.minutes]),
        weight: weight.map((w) => [w.id, w.time.getTime(), w.kg]),
      }),
    )
    .digest("hex");

  return {
    date,
    steps: want.has("steps") && steps.length ? steps.reduce((sum, s) => sum + s.count, 0) : null,
    sleepMinutes: sleep.length ? sleep.reduce((sum, s) => sum + s.minutesAsleep, 0) : null,
    sleepStart: main?.start ?? null,
    sleepEnd: main?.end ?? null,
    exerciseMinutes: exercise.length ? exercise.reduce((sum, e) => sum + (e.minutes || minutesBetween(e.start, e.end)), 0) : null,
    exerciseSessions: want.has("exercise") ? exercise.length : null,
    weight: latestWeight ? Math.round(latestWeight.kg * 10) / 10 : null,
    sourceRecordHash: hash,
  };
}
