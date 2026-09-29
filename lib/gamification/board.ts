import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getArcOverview } from "@/lib/arc";
import { BADGES, isEarned, type BadgeDefinition, type BadgeProgress } from "@/lib/gamification/badges";
import { levelForXp } from "@/lib/gamification/levels";
import { snapshotFromOverview } from "@/lib/gamification/snapshot";

export type BadgeCard = Omit<BadgeDefinition, "progress"> & {
  earnedAt: Date | null;
  progress: BadgeProgress | null;
};

/** The signed-in user's badges: earned ones with dates, locked ones with progress. */
export const getBadgeBoard = cache(async (userId: string): Promise<BadgeCard[]> => {
  const [owned, overview] = await Promise.all([
    prisma.userBadge.findMany({ where: { userId }, select: { earnedAt: true, badge: { select: { key: true } } } }),
    getArcOverview(userId),
  ]);
  const earnedAt = new Map(owned.map((o) => [o.badge.key, o.earnedAt]));

  const snapshot = overview ? snapshotFromOverview(overview) : null;

  return BADGES.map(({ progress, ...def }) => {
    const p = snapshot ? progress(snapshot) : null;
    return {
      ...def,
      earnedAt: earnedAt.get(def.key) ?? null,
      // Locked badges only show progress while it's still short of the target.
      progress: p && !isEarned(p) ? p : null,
    };
  });
});

export const getXpSummary = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalXp: true } });
  return levelForXp(user?.totalXp ?? 0);
});

/** Earned badges not yet shown to the user, oldest first. */
export async function unseenBadges(userId: string) {
  return prisma.userBadge.findMany({
    where: { userId, seenAt: null },
    orderBy: { earnedAt: "asc" },
    take: 3,
    select: { id: true, badge: { select: { key: true } } },
  });
}
