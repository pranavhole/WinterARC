import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { levelForXp } from "@/lib/gamification/levels";
import { friendIds } from "@/lib/social/profile";
import { liveStreak } from "@/lib/social/stats";

/**
 * Separate rankings, never one combined score. Each board says exactly what
 * it measures. Users who hide themselves are excluded; anonymous users are
 * listed without name or link. A user who hides a stat from their profile
 * is left off that stat's board too.
 */

export const BOARDS = {
  xp: { label: "XP", measures: "XP earned", periodic: true },
  streak: { label: "Streak", measures: "Current streak (days at 80%+ in a row)", periodic: false },
  completion: { label: "Arc completion", measures: "Average daily completion in the current Arc", periodic: false },
  badges: { label: "Badges", measures: "Badges earned", periodic: true },
} as const;

export const PERIODS = { week: "This week", month: "This month", arc: "Current Arc" } as const;

export type Board = keyof typeof BOARDS;
export type Period = keyof typeof PERIODS;
export type Scope = "everyone" | "friends";

export const TOP = 50;
// Completion needs a few days behind it, or day one at 100% tops the board.
const MIN_COMPLETION_DAYS = 3;
const STALE_MS = 3 * 24 * 60 * 60 * 1000;

export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === "arc") return null;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "month") d.setUTCDate(1);
  else d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return d;
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  leaderboardVisibility: true,
  totalXp: true,
  statsStreak: true,
  statsStreakThrough: true,
  statsTimezone: true,
  statsAvgCompletion: true,
  statsArcDay: true,
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

export type LeaderboardEntry = {
  rank: number;
  isMe: boolean;
  anonymous: boolean;
  name: string | null;
  username: string | null;
  image: string | null;
  level: number;
  value: number;
};

export async function getLeaderboard(viewerId: string, board: Board, period: Period, scope: Scope): Promise<LeaderboardEntry[]> {
  const scopeIds = scope === "friends" ? [viewerId, ...(await friendIds(viewerId))] : null;
  const visible: Prisma.UserWhereInput = {
    leaderboardVisibility: { not: "HIDDEN" },
    ...(scopeIds ? { id: { in: scopeIds } } : {}),
  };
  const start = periodStart(period);

  let ranked: { user: Row; value: number }[] = [];

  if (board === "xp" || board === "badges") {
    const who: Prisma.UserWhereInput = { ...visible, ...(board === "xp" ? { showXp: true } : { showBadges: true }) };
    const totals =
      board === "xp"
        ? (
            await prisma.xPEvent.groupBy({
              by: ["userId"],
              where: { user: who, ...(start ? { createdAt: { gte: start } } : { arc: { status: "ACTIVE" } }) },
              _sum: { amount: true },
              orderBy: { _sum: { amount: "desc" } },
              take: TOP,
            })
          ).map((r) => ({ userId: r.userId, value: r._sum.amount ?? 0 }))
        : await badgeTotals(who, start);

    const rows = await prisma.user.findMany({ where: { id: { in: totals.map((t) => t.userId) } }, select: USER_SELECT });
    const byId = new Map(rows.map((r) => [r.id, r]));
    ranked = totals.flatMap((t) => (byId.has(t.userId) && t.value > 0 ? [{ user: byId.get(t.userId)!, value: t.value }] : []));
  } else if (board === "streak") {
    const rows = await prisma.user.findMany({
      where: { ...visible, showStreak: true, statsStreak: { gt: 0 } },
      orderBy: { statsStreak: "desc" },
      take: TOP * 3,
      select: USER_SELECT,
    });
    ranked = rows
      .map((user) => ({ user, value: liveStreak(user) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  } else {
    const rows = await prisma.user.findMany({
      where: {
        ...visible,
        statsAvgCompletion: { not: null },
        statsArcDay: { gte: MIN_COMPLETION_DAYS },
        statsUpdatedAt: { gte: new Date(Date.now() - STALE_MS) },
        arcs: { some: { status: "ACTIVE" } },
      },
      orderBy: { statsAvgCompletion: "desc" },
      take: TOP,
      select: USER_SELECT,
    });
    ranked = rows.map((user) => ({ user, value: Math.round((user.statsAvgCompletion ?? 0) * 100) }));
  }

  return ranked.slice(0, TOP).map(({ user, value }, i) => {
    const isMe = user.id === viewerId;
    const anonymous = !isMe && user.leaderboardVisibility === "ANONYMOUS";
    return {
      rank: i + 1,
      isMe,
      anonymous,
      name: anonymous ? null : user.name,
      username: anonymous ? null : user.username,
      image: anonymous ? null : user.image,
      level: levelForXp(user.totalXp).level,
      value,
    };
  });
}

async function badgeTotals(who: Prisma.UserWhereInput, start: Date | null) {
  const where: Prisma.UserBadgeWhereInput = { user: who };
  if (start) where.earnedAt = { gte: start };
  else {
    // Badges earned during the Arc that is active now.
    const active = await prisma.arc.findMany({ where: { user: who, status: "ACTIVE" }, select: { id: true } });
    where.arcId = { in: active.map((a) => a.id) };
  }
  const rows = await prisma.userBadge.groupBy({
    by: ["userId"],
    where,
    _count: { _all: true },
    orderBy: { _count: { userId: "desc" } },
    take: TOP,
  });
  return rows.map((r) => ({ userId: r.userId, value: r._count._all }));
}
