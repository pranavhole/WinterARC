/** Input schemas for every mutation. Client-side limits are a convenience; these are the rules. */

import { z } from "zod";
import { HABIT_CATEGORIES } from "@/lib/arc-engine";
import { HABIT_DESCRIPTION_MAX, HABIT_TITLE_MAX, JOURNAL_MAX, TASK_TITLE_MAX } from "@/lib/limits";
import { FOCUS_KINDS, GOAL_LIMITS, MODULE_KEYS } from "@/lib/modules";
import { BLOCK_DAYS } from "@/lib/timetable";


export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

export const habitInputSchema = z.object({
  title: cleanText(HABIT_TITLE_MAX),
  description: z
    .string()
    .max(HABIT_DESCRIPTION_MAX)
    .optional()
    .transform((s) => s?.trim() ?? ""),
  category: z.enum(HABIT_CATEGORIES),
});

export type HabitInput = z.infer<typeof habitInputSchema>;

const minutesOfDay = z.number().int().min(0).max(1439);

/** A partial update of one day's metrics. `null` clears a value. */
export const dailyRecordPatchSchema = z
  .object({
    steps: z.number().int().min(0).max(200_000).nullable(),
    weight: z
      .number()
      .gt(0)
      .max(500)
      .transform((w) => Math.round(w * 10) / 10)
      .nullable(),
    studyHours: z
      .number()
      .min(0)
      .max(24)
      .refine((h) => Number.isInteger(h * 2), "Use half-hour steps")
      .nullable(),
    dsaProblems: z.number().int().min(0).max(100).nullable(),
    bedtime: minutesOfDay.nullable(),
    wakeTime: minutesOfDay.nullable(),
    sleepQuality: z.number().int().min(1).max(5).nullable(),
    journal: z
      .string()
      .max(JOURNAL_MAX)
      .transform((s) => (s.trim() ? s : null))
      .nullable(),
  })
  .partial()
  .strict();

export type DailyRecordPatch = z.infer<typeof dailyRecordPatchSchema>;

export const taskTitleSchema = cleanText(TASK_TITLE_MAX);

export const TASK_NOTE_MAX = 500;

/** A task: title, plus an optional note, start time and duration (minutes). */
export const taskInputSchema = z.object({
  title: taskTitleSchema,
  note: z
    .string()
    .max(TASK_NOTE_MAX)
    .nullish()
    .transform((s) => (s?.trim() ? s.trim() : null)),
  startTime: z.number().int().min(0).max(1439).nullish().transform((v) => v ?? null),
  duration: z.number().int().min(5).max(720).nullish().transform((v) => v ?? null),
});

export type TaskInput = z.input<typeof taskInputSchema>;

export const settingsSchema = z.object({
  startDate: dayKeySchema,
  length: z.number().int().min(GOAL_LIMITS.arcLength.min).max(GOAL_LIMITS.arcLength.max),
  stepGoal: z.number().int().min(GOAL_LIMITS.stepGoal.min).max(GOAL_LIMITS.stepGoal.max),
  sleepGoal: z
    .number()
    .min(GOAL_LIMITS.sleepGoal.min)
    .max(GOAL_LIMITS.sleepGoal.max)
    .refine((h) => Number.isInteger(h * 4), "Use quarter-hour steps"),
  focusGoalWeekday: z
    .number()
    .min(GOAL_LIMITS.focusGoal.min)
    .max(GOAL_LIMITS.focusGoal.max)
    .refine((h) => Number.isInteger(h * 2)),
  focusGoalWeekend: z
    .number()
    .min(GOAL_LIMITS.focusGoal.min)
    .max(GOAL_LIMITS.focusGoal.max)
    .refine((h) => Number.isInteger(h * 2)),
  dsaGoal: z.number().int().min(GOAL_LIMITS.dsaGoal.min).max(GOAL_LIMITS.dsaGoal.max),
  focusKind: z.enum(FOCUS_KINDS),
  modules: z.object(Object.fromEntries(MODULE_KEYS.map((k) => [k, z.boolean()])) as Record<(typeof MODULE_KEYS)[number], z.ZodBoolean>),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const timeBlockSchema = z
  .object({
    title: cleanText(60),
    note: z
      .string()
      .max(200)
      .nullish()
      .transform((v) => (v?.trim() ? v.trim() : null)),
    start: z.number().int().min(0).max(1439),
    end: z.number().int().min(0).max(1439),
    days: z.enum(BLOCK_DAYS),
    habitId: z.string().max(64).nullish().transform((v) => v || null),
  })
  .refine((b) => b.start !== b.end, "A block needs a length");

export type TimeBlockInput = z.input<typeof timeBlockSchema>;
