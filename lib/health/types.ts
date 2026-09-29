/** Provider-neutral health types. Every provider normalizes into DailyHealth. */

import type { DayKey } from "@/lib/utils";

export const HEALTH_DATA_TYPES = ["steps", "sleep", "exercise", "weight"] as const;
export type HealthDataType = (typeof HEALTH_DATA_TYPES)[number];

export const HEALTH_DATA_LABELS: Record<HealthDataType, string> = {
  steps: "Steps",
  sleep: "Sleep",
  exercise: "Exercise",
  weight: "Weight",
};

/** Raw provider records, reduced to what ARC needs. `id` is the provider's record id. */
export type StepRecord = { id: string; start: Date; end: Date; count: number };
export type SleepData = { id: string; start: Date; end: Date; minutesAsleep: number };
export type ExerciseData = { id: string; start: Date; end: Date; minutes: number; type: string };
export type WeightRecord = { id: string; time: Date; kg: number };

export type DayRecords = {
  steps: StepRecord[];
  sleep: SleepData[];
  exercise: ExerciseData[];
  weight: WeightRecord[];
};

/** ARC's normalized daily summary (one HealthDailyMetric row). Null = no data. */
export type DailyHealth = {
  date: DayKey;
  steps: number | null;
  sleepMinutes: number | null;
  sleepStart: Date | null;
  sleepEnd: Date | null;
  exerciseMinutes: number | null;
  exerciseSessions: number | null;
  weight: number | null;
  sourceRecordHash: string;
};

export class HealthAuthError extends Error {
  constructor(message = "Health connection expired") {
    super(message);
    this.name = "HealthAuthError";
  }
}
