import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { friendIds } from "@/lib/social/profile";
import { REACTIONS } from "@/lib/social/reactions";

export const FEED_PAGE = 20;

export type FeedScope = "all" | "friends";

/**
 * Visibility is enforced here, in the query: your own posts, public posts,
 * and friends-only posts from your friends. Private posts never leave their
 * author. Chronological, cursor-paginated, no ranking.
 */
export function feedWhere(viewerId: string, friends: string[], scope: FeedScope): Prisma.PostWhereInput {
  if (scope === "friends") {
    return { authorId: { in: [viewerId, ...friends] }, OR: [{ authorId: viewerId }, { visibility: { in: ["PUBLIC", "FRIENDS"] } }] };
  }
  return {
    OR: [{ authorId: viewerId }, { visibility: "PUBLIC" }, { visibility: "FRIENDS", authorId: { in: friends } }],
  };
}

export async function getFeed(viewerId: string, scope: FeedScope, cursor?: string | null) {
  const friends = await friendIds(viewerId);
  const rows = await prisma.post.findMany({
    where: feedWhere(viewerId, friends, scope),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: FEED_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      authorId: true,
      type: true,
      content: true,
      visibility: true,
      milestoneType: true,
      badgeKey: true,
      dayNumber: true,
      arcLength: true,
      streak: true,
      createdAt: true,
      author: { select: { name: true, username: true, image: true } },
    },
  });
  const page = rows.slice(0, FEED_PAGE);
  const ids = page.map((p) => p.id);

  const [counts, mine] = ids.length
    ? await Promise.all([
        prisma.postReaction.groupBy({ by: ["postId", "type"], where: { postId: { in: ids } }, _count: { _all: true } }),
        prisma.postReaction.findMany({ where: { postId: { in: ids }, userId: viewerId }, select: { postId: true, type: true } }),
      ])
    : [[], []];

  const items = page.map((p) => ({
    ...p,
    isMine: p.authorId === viewerId,
    reactions: REACTIONS.map((type) => ({
      type,
      count: counts.find((c) => c.postId === p.id && c.type === type)?._count._all ?? 0,
      mine: mine.some((m) => m.postId === p.id && m.type === type),
    })),
  }));

  return { items, nextCursor: rows.length > FEED_PAGE ? page[page.length - 1].id : null };
}

export type FeedItem = Awaited<ReturnType<typeof getFeed>>["items"][number];
