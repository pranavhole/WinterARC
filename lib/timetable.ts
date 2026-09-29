/**
 * The daily timetable: a repeating template of time blocks (every day,
 * weekdays or weekends). Pure helpers, safe on client and server.
 */

import { isWeekend } from "@/lib/metrics";
import { focusLabel, type ArcGoals, type ArcModules, type FocusKind } from "@/lib/modules";
import type { HabitCategoryValue } from "@/lib/arc-engine";
import type { DayKey } from "@/lib/utils";

export const BLOCK_DAYS = ["EVERYDAY", "WEEKDAYS", "WEEKENDS"] as const;
export type BlockDaysValue = (typeof BLOCK_DAYS)[number];

export const BLOCK_DAYS_LABELS: Record<BlockDaysValue, string> = {
  EVERYDAY: "Every day",
  WEEKDAYS: "Weekdays",
  WEEKENDS: "Weekends",
};

export type BlockInput = {
  title: string;
  note: string | null;
  start: number;
  end: number;
  days: BlockDaysValue;
  /** Checking the block off checks off this rule. */
  habitId: string | null;
};
export type BlockView = BlockInput & { id: string };

/** Length in minutes. A block may run past midnight (end before start). */
export function blockLength(start: number, end: number): number {
  return (end - start + 1440) % 1440 || 1440;
}

export function appliesOn(days: BlockDaysValue, key: DayKey): boolean {
  if (days === "EVERYDAY") return true;
  return isWeekend(key) ? days === "WEEKENDS" : days === "WEEKDAYS";
}

/** Blocks for one day, in time order. */
export function blocksFor<T extends BlockInput>(blocks: T[], key: DayKey): T[] {
  return blocks.filter((b) => appliesOn(b.days, key)).sort((a, b) => a.start - b.start);
}

export function isNow(block: { start: number; end: number }, minutesNow: number): boolean {
  const offset = (minutesNow - block.start + 1440) % 1440;
  return offset < blockLength(block.start, block.end);
}

const wrap = (m: number) => ((m % 1440) + 1440) % 1440;

export const DEFAULT_WAKE = 5 * 60 + 30;

/** "Wake up at 5:30" → 330. Understands 5:30, 05:30, 6.15 and "6 am". */
export function wakeTimeFrom(title: string): number | null {
  const m = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/i.exec(title);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3]?.toLowerCase() === "pm" && h < 12) h += 12;
  return h < 24 && min < 60 ? h * 60 + min : null;
}

type PlanHabit = { id: string; title: string; category: HabitCategoryValue };

/** Split focused hours into blocks of at most 2h with 15-minute breaks. */
function focusBlocks(hours: number, startAt: number, title: string, days: BlockDaysValue, note: string | null, habitId: string | null) {
  const total = Math.round(hours * 60);
  const count = Math.max(1, Math.ceil(total / 120));
  const each = Math.round(total / count / 15) * 15 || total;
  const out: BlockInput[] = [];
  let t = startAt;
  for (let i = 0; i < count; i++) {
    out.push({
      title: count > 1 ? `${title} · block ${i + 1}` : title,
      note: i === 0 ? note : null,
      start: t,
      end: wrap(t + each),
      days,
      habitId,
    });
    t = wrap(t + each + 15);
  }
  return out;
}

/**
 * A starting timetable built from the Arc: its rules, focus goals and sleep
 * goal. Blocks that come from a rule are linked to it, so the day is one list.
 * Deterministic and fully editable.
 */
export function suggestPlan(input: {
  habits: PlanHabit[];
  modules: ArcModules;
  goals: ArcGoals;
  focusKind: FocusKind | null;
}): BlockInput[] {
  const { habits, modules, goals, focusKind } = input;
  const find = (pred: (h: PlanHabit) => boolean) => habits.find(pred);
  const blocks: BlockInput[] = [];

  const wakeHabit = find((h) => /wake/i.test(h.title));
  const wake = (wakeHabit && wakeTimeFrom(wakeHabit.title)) ?? DEFAULT_WAKE;
  const bedtime = wrap(wake - Math.round(goals.sleepGoal * 60));
  let t = wake;
  const next = (title: string, minutes: number, habit: PlanHabit | undefined, note: string | null = null) => {
    blocks.push({ title: habit?.title ?? title, note, start: t, end: wrap(t + minutes), days: "EVERYDAY", habitId: habit?.id ?? null });
    t = wrap(t + minutes);
  };

  // Morning: wake, cold shower, routine.
  next("Wake up", 10, wakeHabit, "Out of bed, no snooze.");
  const cold = find((h) => /cold/i.test(h.title));
  if (cold) next("Cold shower", 15, cold);
  const morning = find((h) => /morning/i.test(h.title));
  next("Water, daylight, plan the day", 20, morning, "Phone stays off for now.");

  const focusHabit = find((h) => h.category === "CAREER" || h.category === "FOCUS" || /study|deep work|coding|reading|creative/i.test(h.title));
  if (modules.focus || focusHabit) {
    const name = focusHabit?.title ?? focusLabel(focusKind).metric;
    const note = modules.dsa ? "Start with your DSA problems, then the main work." : null;
    const id = focusHabit?.id ?? null;
    if (goals.focusGoalWeekday === goals.focusGoalWeekend) {
      blocks.push(...focusBlocks(goals.focusGoalWeekday, 9 * 60, name, "EVERYDAY", note, id));
    } else {
      blocks.push(...focusBlocks(goals.focusGoalWeekday, 9 * 60, name, "WEEKDAYS", note, id));
      blocks.push(...focusBlocks(goals.focusGoalWeekend, 9 * 60 + 30, name, "WEEKENDS", note, id));
    }
  }

  const movement = find((h) => h.category === "FITNESS");
  if (movement) {
    const minutes = Number(/(\d+)\s*min/i.exec(movement.title)?.[1] ?? 30);
    blocks.push({ title: movement.title, note: null, start: 18 * 60, end: 18 * 60 + minutes, days: "EVERYDAY", habitId: movement.id });
  }

  const reading = find((h) => /^read/i.test(h.title) && h.id !== focusHabit?.id);
  if (reading) blocks.push({ title: reading.title, note: null, start: wrap(bedtime - 90), end: wrap(bedtime - 60), days: "EVERYDAY", habitId: reading.id });

  const review = find((h) => /journal|plan tomorrow|review/i.test(h.title));
  blocks.push({
    title: review?.title ?? "Night review",
    note: "What went well, what to fix tomorrow.",
    start: wrap(bedtime - 45),
    end: wrap(bedtime - 30),
    days: "EVERYDAY",
    habitId: review?.id ?? null,
  });
  const sleep = find((h) => h.category === "SLEEP");
  blocks.push({ title: "Wind down", note: "Screens off.", start: wrap(bedtime - 30), end: bedtime, days: "EVERYDAY", habitId: null });
  blocks.push({ title: sleep?.title ?? "Sleep", note: null, start: bedtime, end: wake, days: "EVERYDAY", habitId: sleep?.id ?? null });

  return blocks.sort((a, b) => a.start - b.start);
}
