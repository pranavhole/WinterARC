import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const reportSchema = z.object({
  reportedId: z.string().min(1).max(64),
  postId: z.string().min(1).max(64).nullish(),
  commentId: z.string().min(1).max(64).nullish(),
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "OTHER"]),
  notes: z.string().max(500).nullish(),
});

export type ReportInput = z.infer<typeof reportSchema>;

/** Block a user. Also dissolves friendships, pending requests, and follow links. */
export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  if (blockerId === blockedId) return false;

  await prisma.$transaction(async (tx) => {
    // 1. Create block
    await tx.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    // 2. Remove friendships in both directions
    await tx.friendship.deleteMany({
      where: {
        OR: [
          { userId: blockerId, friendId: blockedId },
          { userId: blockedId, friendId: blockerId },
        ],
      },
    });

    // 3. Remove friend requests
    const pairKey = [blockerId, blockedId].sort().join(":");
    await tx.friendRequest.deleteMany({ where: { pairKey } });

    // 4. Remove follows in both directions
    await tx.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });
  });

  return true;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const { count } = await prisma.userBlock.deleteMany({
    where: { blockerId, blockedId },
  });
  return count > 0;
}

/** Get all user IDs that are blocked by this user or have blocked this user. */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const [blockedByMe, blockedMe] = await Promise.all([
    prisma.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    prisma.userBlock.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ]);

  const set = new Set<string>();
  for (const b of blockedByMe) set.add(b.blockedId);
  for (const b of blockedMe) set.add(b.blockerId);
  return Array.from(set);
}

export async function isBlocked(userA: string, userB: string): Promise<boolean> {
  const count = await prisma.userBlock.count({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return count > 0;
}

export async function reportContent(reporterId: string, raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid report data." };

  const { reportedId, postId, commentId, reason, notes } = parsed.data;
  if (reporterId === reportedId) return { ok: false, error: "You cannot report yourself." };

  await prisma.report.create({
    data: {
      reporterId,
      reportedId,
      postId: postId ?? null,
      commentId: commentId ?? null,
      reason,
      notes: notes ?? null,
    },
  });

  return { ok: true };
}
