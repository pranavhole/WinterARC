import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getArcOverview } from "@/lib/arc";
import { BADGES } from "@/lib/gamification/badges";
import { SectionLabel } from "@/components/ui/label";
import { StoryCardStudio, type StoryData } from "@/components/social/story-card-studio";

export const metadata: Metadata = { title: "Arc Story Studio" };

export default async function SocialPage() {
  const user = await requireUser();

  const [dbUser, overview, userBadges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, username: true, image: true, totalXp: true },
    }),
    getArcOverview(user.id),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    }),
  ]);

  const earnedBadges = userBadges.map((ub) => ({
    key: ub.badge.key,
    name: ub.badge.name,
    description: ub.badge.description,
    icon: ub.badge.icon,
    xpReward: ub.badge.xpReward,
  }));

  const allBadgesList =
    earnedBadges.length > 0
      ? earnedBadges
      : BADGES.slice(0, 8).map((b) => ({
          key: b.key,
          name: b.name,
          description: b.description,
          icon: b.icon,
          xpReward: b.xpReward,
        }));

  const dayNum = overview?.arc.dayNumber ?? 1;
  const completedCount = overview?.stats.completedDays ?? 0;
  const calculatedConsistency = dayNum > 0 ? Math.round((completedCount / dayNum) * 100) : 100;

  const storyData: StoryData = {
    dayNumber: dayNum,
    arcLength: overview?.arc.length ?? 90,
    streak: overview?.stats.currentStreak ?? 0,
    bestStreak: overview?.stats.bestStreak ?? 0,
    statement: overview?.arc.statement || "Silence. Focus. Execution.",
    focusKind: overview?.arc.focusKind ?? "DISCIPLINE",
    xp: dbUser?.totalXp ?? 0,
    consistency: calculatedConsistency,
    completedDays: completedCount,
    user: {
      name: dbUser?.name ?? user.name ?? "Arc Athlete",
      username: dbUser?.username ?? null,
      image: dbUser?.image ?? null,
    },
    badges: allBadgesList,
  };


  return (
    <div className="animate-fade space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel as="h1">Story Studio</SectionLabel>
          <p className="mt-1 text-xs text-muted">
            Customize your daily Arc story card with live achievements, streak, and discipline metrics. Share directly to Instagram Story.
          </p>
        </div>
      </div>

      <StoryCardStudio data={storyData} />
    </div>
  );
}
