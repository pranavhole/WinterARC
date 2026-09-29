/**
 * XP rewards consistency and meaningful completion. Every value lives here;
 * components and actions never hard-code XP.
 *
 * XP is only ever awarded by the server-side achievement engine
 * (lib/gamification/achievements.ts), as immutable XPEvent rows. Each award
 * has an idempotency key (event type + reference), so:
 *  - checking / unchecking a rule repeatedly pays once per rule per day;
 *  - only today and yesterday earn rule XP, so editing history pays nothing;
 *  - rule XP per day is capped, so creating and deleting rules can't farm it;
 *  - tasks earn no XP of their own (they only feed the daily score).
 * Likes, comments and friend counts never earn XP.
 */

import { MAX_HABITS } from "@/lib/arc-engine";
import { levelForXp } from "@/lib/gamification/levels";

export const XP = {
  HABIT_COMPLETED: 10,
  DISCIPLINE_COMPLETED: 5,
  DAILY_ARC_COMPLETED: 25,
  WEEKLY_ARC_COMPLETED: 100,
  STREAK_7: 50,
  STREAK_14: 100,
  STREAK_30: 250,
  STREAK_60: 500,
  ARC_COMPLETED: 1000,
  MILESTONE_POST: 5,
} as const;

/** Days (counting back from today) whose rule completions still earn XP. 1 = today and yesterday. */
export const XP_GRACE_DAYS = 1;
/** Most rule-completion awards on one day. Matches the rule limit. */
export const HABIT_AWARDS_PER_DAY = MAX_HABITS;
/** Milestone posts earn XP at most once per day. */
export const POST_AWARDS_PER_DAY = 1;

export const XP_EVENT_TYPES = [
  "HabitCompleted",
  "DisciplineCompleted",
  "DailyArcCompleted",
  "WeeklyArcCompleted",
  "BadgeUnlocked",
  "MilestonePosted",
] as const;

export type XPEventType = (typeof XP_EVENT_TYPES)[number];

export type XPAward = {
  userId: string;
  arcId: string | null;
  type: XPEventType;
  amount: number;
  referenceType: string;
  referenceId: string;
};

/** The idempotency key: one award per user + event type + reference. */
export function xpKey(award: Pick<XPAward, "type" | "referenceType" | "referenceId">): string {
  return `${award.type}:${award.referenceType}:${award.referenceId}`;
}

/** Storage used by awardXp. Implemented with Prisma in ledger.ts and in memory in tests. */
export interface XPStore {
  /** Insert the event. False when an event with the same (userId, key) already exists. */
  insertEvent(award: XPAward & { key: string }): Promise<boolean>;
  /** Add to the cached total and return the new total. */
  incrementTotal(userId: string, amount: number): Promise<number>;
  setLevel(userId: string, level: number): Promise<void>;
}

/** Award XP once. Returns the amount awarded (0 when it was already awarded). */
export async function awardXp(store: XPStore, award: XPAward): Promise<number> {
  if (!Number.isInteger(award.amount) || award.amount <= 0) return 0;
  const inserted = await store.insertEvent({ ...award, key: xpKey(award) });
  if (!inserted) return 0;
  const total = await store.incrementTotal(award.userId, award.amount);
  await store.setLevel(award.userId, levelForXp(total).level);
  return award.amount;
}
