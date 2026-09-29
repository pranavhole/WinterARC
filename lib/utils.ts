/**
 * Days are handled as "YYYY-MM-DD" keys in the Arc's timezone and stored as
 * Postgres DATE values (UTC midnight). This keeps "today" stable for the user
 * no matter where the server runs.
 */

export const ARC_LENGTH = 90;

export type DayKey = string;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function todayKey(timeZone: string, now = new Date()): DayKey {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function localHour(timeZone: string, now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
}

export function keyToDate(key: DayKey): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToKey(d);
}

export function diffDays(from: DayKey, to: DayKey): number {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86_400_000);
}

export function formatDay(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(keyToDate(key));
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minutes after midnight right now in a timezone. */
export function localMinutes(timeZone: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
