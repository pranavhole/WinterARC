import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/social/notifications";
import { isBlocked } from "@/lib/social/blocking";

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  if (await isBlocked(followerId, followingId)) return false;

  const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
  if (!target) return false;

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return false; // unfollowed
  } else {
    await prisma.follow.create({
      data: { followerId, followingId },
    });
    await notify({
      userId: followingId,
      actorId: followerId,
      type: "FOLLOW",
      referenceId: followerId,
      dedupeKey: `follow:${followerId}:${followingId}`,
    });
    return true; // followed
  }
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const count = await prisma.follow.count({
    where: { followerId, followingId },
  });
  return count > 0;
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}
