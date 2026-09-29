/** Pure helpers for daily metrics. Safe on client and server. */

import { keyToDate, type DayKey } from "@/lib/utils";

/** Sleep duration in minutes from bedtime (night before) to wake time, across midnight. */
export function sleepMinutes(bedtime: number | null | undefined, wakeTime: number | null | undefined): number | null {
  if (bedtime == null || wakeTime == null) return null;
  const minutes = (wakeTime - bedtime + 1440) % 1440;
  return minutes === 0 ? null : minutes;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

/** "HH:MM" (input type=time) ⇄ minutes after midnight. */
export function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function minutesToTime(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function isWeekend(key: DayKey): boolean {
  const day = keyToDate(key).getUTCDay();
  return day === 0 || day === 6;
}

export function focusGoalFor(goals: { focusGoalWeekday: number; focusGoalWeekend: number }, key: DayKey): number {
  return isWeekend(key) ? goals.focusGoalWeekend : goals.focusGoalWeekday;
}

export function formatSteps(steps: number): string {
  return steps.toLocaleString("en-US");
}
