import { addDays, dateToKey, todayKey } from "@/lib/utils";

export type CachedStats = {
  statsStreak: number;
  statsStreakThrough: Date | null;
  statsTimezone: string | null;
};

/**
 * The cached streak, but only while it's still alive: it must have counted
 * through yesterday or today in the owner's timezone. A user who stopped
 * showing up doesn't keep a stale streak on the leaderboard.
 */
export function liveStreak(s: CachedStats, now = new Date()): number {
  if (!s.statsStreak || !s.statsStreakThrough || !s.statsTimezone) return 0;
  const today = todayKey(s.statsTimezone, now);
  return dateToKey(s.statsStreakThrough) >= addDays(today, -1) ? s.statsStreak : 0;
}
