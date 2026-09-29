/**
 * Android Health Connect, through the ARC bridge app (android-bridge/).
 * Health Connect is an on-device store, so the website can't read it; the
 * bridge reads it with the user's permission and pushes raw records to
 * POST /api/health/ingest. Records keep their Health Connect ids, so the same
 * normalize step de-duplicates them exactly like Google Health data.
 */

import { z } from "zod";
import type { HealthProvider } from "@/lib/health/provider";
import type { DayRecords } from "@/lib/health/types";
import type { DayKey } from "@/lib/utils";

const id = z.string().min(1).max(200);
const instant = z.iso.datetime({ offset: true }).transform((s) => new Date(s));
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ingestSchema = z.object({
  timeZone: z.string().max(64).optional(),
  permissions: z.array(z.enum(["steps", "sleep", "exercise", "weight"])).max(4),
  days: z
    .array(
      z.object({
        date: day,
        steps: z.array(z.object({ id, start: instant, end: instant, count: z.number().int().min(0).max(200_000) })).max(3000).default([]),
        sleep: z
          .array(z.object({ id, start: instant, end: instant, minutesAsleep: z.number().int().min(0).max(1440).optional() }))
          .max(20)
          .default([]),
        exercise: z
          .array(z.object({ id, start: instant, end: instant, minutes: z.number().int().min(0).max(1440).optional(), type: z.string().max(60).default("OTHER") }))
          .max(50)
          .default([]),
        weight: z.array(z.object({ id, time: instant, kg: z.number().gt(0).max(500) })).max(20).default([]),
      }),
    )
    .min(1)
    .max(14),
});

export type IngestPayload = z.infer<typeof ingestSchema>;

/** A push provider: serves the records one bridge upload delivered. */
export class HealthConnectBatch implements HealthProvider {
  readonly kind = "HEALTH_CONNECT" as const;
  private byDay: Map<DayKey, DayRecords>;

  constructor(payload: IngestPayload) {
    this.byDay = new Map(
      payload.days.map((d) => [
        d.date,
        {
          steps: d.steps,
          sleep: d.sleep.map((s) => ({ ...s, minutesAsleep: s.minutesAsleep ?? Math.round((s.end.getTime() - s.start.getTime()) / 60000) })),
          exercise: d.exercise.map((e) => ({ ...e, minutes: e.minutes ?? Math.round((e.end.getTime() - e.start.getTime()) / 60000) })),
          weight: d.weight,
        },
      ]),
    );
  }

  days(): DayKey[] {
    return [...this.byDay.keys()];
  }

  private records(date: DayKey): DayRecords {
    return this.byDay.get(date) ?? { steps: [], sleep: [], exercise: [], weight: [] };
  }

  async disconnect() {}

  async getSteps(date: DayKey) {
    return this.records(date).steps.reduce((sum, s) => sum + s.count, 0);
  }

  async getSleep(date: DayKey) {
    return this.records(date).sleep.reduce<DayRecords["sleep"][number] | null>((b, s) => (!b || s.minutesAsleep > b.minutesAsleep ? s : b), null);
  }

  async getExercise(date: DayKey) {
    return this.records(date).exercise;
  }

  async getWeight(date: DayKey) {
    const w = [...this.records(date).weight].sort((a, b) => b.time.getTime() - a.time.getTime())[0];
    return w ? w.kg : null;
  }

  async getDayRecords(date: DayKey) {
    return this.records(date);
  }
}
