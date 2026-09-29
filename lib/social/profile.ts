import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { levelForXp } from "@/lib/gamification/levels";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { canView, relationship, usernameBase, visibleStats, type Relationship } from "@/lib/social/privacy";
import { liveStreak } from "@/lib/social/stats";

/** The user's username, creating one from their name on first use. */
export async function ensureUsername(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true, email: true } });
  if (!user) throw new Error("User not found");
  if (user.username) return user.username;

  const base = usernameBase(user.name, user.email);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 16)}${Math.floor(Math.random() * 9000) + 100}`;
    try {
      const { count } = await prisma.user.updateMany({ where: { id: userId, username: null }, data: { username: candidate } });
      if (count === 1) return candidate;
      // Set concurrently by another request: use that one.
      const again = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (again?.username) return again.username;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Could not assign a username");
}

export const friendIds = cache(async (userId: string): Promise<string[]> => {
  const rows = await prisma.friendship.findMany({ where: { userId }, select: { friendId: true } });
  return rows.map((r) => r.friendId);
});

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const row = await prisma.friendship.findUnique({ where: { userId_friendId: { userId: a, friendId: b } }, select: { userId: true } });
  return row !== null;
}

export const PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  image: true,
  profileVisibility: true,
  showXp: true,
  showStreak: true,
  showBadges: true,
  showArcDay: true,
  totalXp: true,
  statsArcDay: true,
  statsArcLength: true,
  statsStreak: true,
  statsStreakThrough: true,
  statsTimezone: true,
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

/** What a viewer may see of a user. Hidden values are null. */
export function profileCard(user: ProfileRow, rel: Relationship) {
  const stats = visibleStats(
    user,
    {
      xp: user.totalXp,
      level: levelForXp(user.totalXp).level,
      streak: liveStreak(user),
      arcDay: user.statsArcDay,
      arcLength: user.statsArcLength,
    },
    rel,
  );
  return { id: user.id, name: user.name, username: user.username, image: user.image, ...stats };
}

export type ProfileCard = ReturnType<typeof profileCard>;

/** Full profile for /u/[username], or null when the viewer may not see it. */
export async function getProfile(username: string, viewerId: string | null) {
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: PROFILE_SELECT });
  if (!user) return null;
  const friend = viewerId ? await areFriends(viewerId, user.id) : false;
  const rel = relationship(user.id, viewerId, friend);
  if (!canView(user.profileVisibility, rel)) return { visible: false as const, name: user.name, username: user.username, rel };

  const card = profileCard(user, rel);
  const [badges, friendCount, milestones] = await Promise.all([
    card.showBadges
      ? prisma.userBadge.findMany({ where: { userId: user.id }, orderBy: { earnedAt: "desc" }, select: { earnedAt: true, badge: { select: { key: true } } } })
      : Promise.resolve([]),
    prisma.friendship.count({ where: { userId: user.id } }),
    prisma.post.findMany({
      where: {
        authorId: user.id,
        type: { in: ["MILESTONE", "BADGE", "PROGRESS"] },
        visibility: { in: rel === "self" ? ["PUBLIC", "FRIENDS", "PRIVATE"] : rel === "friend" ? ["PUBLIC", "FRIENDS"] : ["PUBLIC"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, content: true, milestoneType: true, badgeKey: true, dayNumber: true, arcLength: true, createdAt: true },
    }),
  ]);

  return {
    visible: true as const,
    rel,
    card,
    friendCount,
    badges: badges.flatMap((b) => {
      const def = BADGE_BY_KEY.get(b.badge.key);
      return def ? [{ key: def.key, name: def.name, icon: def.icon, earnedAt: b.earnedAt }] : [];
    }),
    milestones,
  };
}
