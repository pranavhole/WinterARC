/**
 * Every health source implements this. Sync only talks to this interface and
 * normalizes into HealthDailyMetric, so provider details never reach the
 * dashboard. Pull providers (Google Health) implement the getters; push
 * providers (the Health Connect bridge) deliver summaries to the ingest API.
 */

import type { DayRecords, ExerciseData, HealthDataType, SleepData } from "@/lib/health/types";
import type { DayKey } from "@/lib/utils";

export interface HealthProvider {
  readonly kind: "GOOGLE_HEALTH" | "HEALTH_CONNECT";

  /** Revoke ARC's access at the provider (best effort) and forget the credentials. */
  disconnect(): Promise<void>;

  getSteps(date: DayKey): Promise<number>;
  getSleep(date: DayKey): Promise<SleepData | null>;
  getExercise(date: DayKey): Promise<ExerciseData[]>;
  getWeight(date: DayKey): Promise<number | null>;

  /** All raw records for one local day, for the types the user allowed. */
  getDayRecords(date: DayKey, types: HealthDataType[]): Promise<DayRecords>;
}
