/**
 * Shareable milestones. A milestone is only offered (and only accepted by the
 * server) when the user has actually reached it.
 */

export const DAY_MILESTONES = [7, 30, 60, 90] as const;
export const STREAK_MILESTONES = [7, 14, 30, 60, 90] as const;

export type Milestone =
  | { kind: "DAY"; n: number }
  | { kind: "STREAK"; n: number }
  | { kind: "ARC_COMPLETE" };

export function milestoneKey(m: Milestone): string {
  return m.kind === "ARC_COMPLETE" ? "ARC_COMPLETE" : `${m.kind}_${m.n}`;
}

export function parseMilestone(value: unknown): Milestone | null {
  if (value === "ARC_COMPLETE") return { kind: "ARC_COMPLETE" };
  if (typeof value !== "string") return null;
  const match = /^(DAY|STREAK)_(\d{1,3})$/.exec(value);
  if (!match) return null;
  const n = Number(match[2]);
  if (match[1] === "DAY" && (DAY_MILESTONES as readonly number[]).includes(n)) return { kind: "DAY", n };
  if (match[1] === "STREAK" && (STREAK_MILESTONES as readonly number[]).includes(n)) return { kind: "STREAK", n };
  return null;
}

export type MilestoneState = {
  dayNumber: number;
  arcLength: number;
  /** Today is at 80%+ (so "Day N" is done, not just started). */
  todayComplete: boolean;
  bestStreak: number;
  arcFinished: boolean;
};

/** A day milestone counts once that day is done: either today at 80%+ or already in the past. */
function dayReached(s: MilestoneState, n: number) {
  return n <= s.arcLength && (s.dayNumber > n || (s.dayNumber === n && s.todayComplete));
}

export function isReached(m: Milestone, s: MilestoneState): boolean {
  if (m.kind === "ARC_COMPLETE") return s.arcFinished;
  if (m.kind === "DAY") return dayReached(s, m.n);
  return s.bestStreak >= m.n;
}

/** Reached milestones, most impressive first. */
export function reachedMilestones(s: MilestoneState): Milestone[] {
  const out: Milestone[] = [];
  if (s.arcFinished) out.push({ kind: "ARC_COMPLETE" });
  for (const n of [...DAY_MILESTONES].reverse()) if (dayReached(s, n)) out.push({ kind: "DAY", n });
  for (const n of [...STREAK_MILESTONES].reverse()) if (s.bestStreak >= n) out.push({ kind: "STREAK", n });
  return out;
}

export function milestoneTitle(m: Milestone, arcLength: number | null): string {
  if (m.kind === "ARC_COMPLETE") return "Arc complete";
  if (m.kind === "DAY") return `Day ${m.n}${arcLength ? ` / ${arcLength}` : ""}`;
  return `${m.n} day streak`;
}

/** The one-line feed headline, e.g. "completed Day 30 of their Arc." */
export function milestoneHeadline(m: Milestone): string {
  if (m.kind === "ARC_COMPLETE") return "finished their Arc.";
  if (m.kind === "DAY") return `completed Day ${m.n} of their Arc.`;
  return `reached a ${m.n} day streak.`;
}
