/** Timezone helpers for turning Arc days into instants and back. Pure. */

import { addDays, type DayKey } from "@/lib/utils";

/** Offset of `timeZone` from UTC at `instant`, in minutes (e.g. +330 for Asia/Kolkata). */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/** The instant local midnight begins on `day` in `timeZone`. */
export function dayStartUtc(day: DayKey, timeZone: string): Date {
  const guess = new Date(`${day}T00:00:00.000Z`);
  let instant = new Date(guess.getTime() - tzOffsetMinutes(guess, timeZone) * 60000);
  // A second pass settles days where the offset changes (DST).
  instant = new Date(guess.getTime() - tzOffsetMinutes(instant, timeZone) * 60000);
  return instant;
}

/** [start, end) of a local day as UTC instants. */
export function dayRangeUtc(day: DayKey, timeZone: string): { start: Date; end: Date } {
  return { start: dayStartUtc(day, timeZone), end: dayStartUtc(addDays(day, 1), timeZone) };
}

/** Minutes after local midnight of an instant. */
export function localMinutesOf(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
