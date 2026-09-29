import "server-only";
import { prisma } from "@/lib/db";
import { loadArcOverview } from "@/lib/arc";
import { BADGES, earnedBadgeKeys } from "@/lib/gamification/badges";
import { grantXpBatch } from "@/lib/gamification/ledger";
import { snapshotFromOverview } from "@/lib/gamification/snapshot";
import { HABIT_AWARDS_PER_DAY, XP, XP_GRACE_DAYS, type XPAward } from "@/lib/gamification/xp";
import { STREAK_THRESHOLD } from "@/lib/scoring";
import { addDays, keyToDate, type DayKey } from "@/lib/utils";

/**
 * The server-side achievement engine. Runs after every tracking mutation and
 * turns the Arc's current state into XP events, badges and notifications.
 * Every award is idempotent, so running it again is always safe.
 */

const WEEK = 7;
const STREAK_NOTIFY_AT = [7, 14, 30, 60, 90];

let badgeSync: Promise<Map<string, string>> | null = null;

/** Upsert the code registry into the Badge table once per process. Returns key → id. */
export function ensureBadges(): Promise<Map<string, string>> {
  badgeSync ??= (async () => {
    const rows = await prisma.$transaction(
      BADGES.map((b, position) =>
        prisma.badge.upsert({
          where: { key: b.key },
          create: { key: b.key, name: b.name, description: b.description, icon: b.icon, xpReward: b.xpReward, category: b.category, position },
          update: { name: b.name, description: b.description, icon: b.icon, xpReward: b.xpReward, category: b.category, position },
          select: { id: true, key: true },
        }),
      ),
    );
    return new Map(rows.map((r) => [r.key, r.id]));
  })().catch((error) => {
    badgeSync = null;
    throw error;
  });
  return badgeSync;
}

/** Never throws: gamification must not break the tracking action that triggered it. */
export async function runAchievements(userId: string, touchedDay?: DayKey) {
  try {
    await evaluateAchievements(userId, touchedDay);
  } catch (error) {
    console.error("achievements failed", error);
  }
}

export async function evaluateAchievements(userId: string, touchedDay?: DayKey) {
  const overview = await loadArcOverview(userId);
  if (!overview) {
    await prisma.user.update({
      where: { id: userId },
      data: { statsArcDay: null, statsArcLength: null, statsStreak: 0, statsAvgCompletion: null, statsUpdatedAt: new Date() },
    });
    return;
  }
  const { arc, stats, doneByDay, snapshotHabits } = overview;
  const cellByDay = new Map(stats.days.map((d) => [d.key, d]));
  const awards: XPAward[] = [];
  const award = (type: XPAward["type"], amount: number, referenceType: string, referenceId: string) =>
    awards.push({ userId, arcId: arc.id, type, amount, referenceType, referenceId });

  // Rule and daily XP only for today and the grace window: editing history earns nothing.
  const earliest = addDays(arc.today, -XP_GRACE_DAYS);
  const candidates = touchedDay ? [touchedDay] : [arc.today, addDays(arc.today, -1)];
  const xpDays = candidates.filter((d) => d >= earliest && d >= arc.startDate && d <= arc.today);

  // Rule awards already paid on these days, for the per-day cap (one query for all days).
  const paidRules = xpDays.length
    ? await prisma.xPEvent.findMany({
        where: { userId, type: { in: ["HabitCompleted", "DisciplineCompleted"] }, OR: xpDays.map((d) => ({ referenceId: { endsWith: `:${d}` } })) },
        select: { referenceId: true },
      })
    : [];
  const paid = new Set(paidRules.map((e) => e.referenceId));

  for (const day of xpDays) {
    const done = doneByDay.get(day) ?? new Set<string>();
    let room = HABIT_AWARDS_PER_DAY - [...paid].filter((r) => r.endsWith(`:${day}`)).length;
    for (const habit of snapshotHabits) {
      const referenceId = `${habit.id}:${day}`;
      if (!done.has(habit.id) || paid.has(referenceId) || room <= 0) continue;
      const discipline = habit.category === "DISCIPLINE";
      award(discipline ? "DisciplineCompleted" : "HabitCompleted", discipline ? XP.DISCIPLINE_COMPLETED : XP.HABIT_COMPLETED, "HabitDay", referenceId);
      room--;
    }

    const cell = cellByDay.get(day);
    if (cell?.score != null && cell.score >= STREAK_THRESHOLD) {
      award("DailyArcCompleted", XP.DAILY_ARC_COMPLETED, "ArcDay", `${arc.id}:${day}`);
    }

    // A full Arc week (days 1–7, 8–14, …) at 80%+ every day.
    const index = cell?.index ?? -1;
    const week = Math.floor(index / WEEK);
    const weekDays = stats.days.slice(week * WEEK, week * WEEK + WEEK);
    if (index >= 0 && weekDays.length === WEEK && weekDays.every((d) => d.status === "complete")) {
      award("WeeklyArcCompleted", XP.WEEKLY_ARC_COMPLETED, "ArcWeek", `${arc.id}:${week + 1}`);
    }
  }

  const notifications: { type: "BADGE" | "STREAK"; referenceId: string; dedupeKey: string }[] = [];

  // Badges, judged on the whole Arc.
  const earned = earnedBadgeKeys(snapshotFromOverview(overview));
  if (earned.length) {
    const owned = await prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { key: true } } } });
    const ownedKeys = new Set(owned.map((o) => o.badge.key));
    const fresh = earned.filter((key) => !ownedKeys.has(key));
    if (fresh.length) {
      const ids = await ensureBadges();
      await prisma.userBadge.createMany({ data: fresh.map((key) => ({ userId, badgeId: ids.get(key)!, arcId: arc.id })), skipDuplicates: true });
      for (const key of fresh) {
        const def = BADGES.find((b) => b.key === key)!;
        // Keyed on the badge, so a badge pays out once even if two requests race here.
        award("BadgeUnlocked", def.xpReward, "Badge", key);
        notifications.push({ type: "BADGE", referenceId: key, dedupeKey: `badge:${key}` });
      }
    }
  }

  for (const n of STREAK_NOTIFY_AT) {
    if (stats.currentStreak >= n) notifications.push({ type: "STREAK", referenceId: String(n), dedupeKey: `streak:${arc.id}:${n}` });
  }

  const todayCell = cellByDay.get(arc.today);
  const streakThrough = todayCell?.status === "complete" ? arc.today : addDays(arc.today, -1);

  await Promise.all([
    grantXpBatch(userId, awards),
    notifications.length
      ? prisma.notification.createMany({ data: notifications.map((n) => ({ userId, ...n })), skipDuplicates: true })
      : null,
    // Cached snapshot for leaderboards and profiles.
    prisma.user.update({
      where: { id: userId },
      data: {
        statsArcDay: arc.dayNumber,
        statsArcLength: arc.length,
        statsStreak: stats.currentStreak,
        statsStreakThrough: keyToDate(streakThrough),
        statsTimezone: arc.timezone,
        statsAvgCompletion: stats.averageCompletion,
        statsUpdatedAt: new Date(),
      },
    }),
  ]);
}
