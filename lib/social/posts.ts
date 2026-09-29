import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getArcOverview } from "@/lib/arc";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { grantXp } from "@/lib/gamification/ledger";
import { XP } from "@/lib/gamification/xp";
import { isReached, milestoneKey, parseMilestone, type MilestoneState } from "@/lib/social/milestones";
import { canView, relationship } from "@/lib/social/privacy";
import { areFriends } from "@/lib/social/profile";
import { notify } from "@/lib/social/notifications";
import type { Reaction } from "@/lib/social/reactions";

export const POST_MAX = 500;

export const postInputSchema = z.object({
  type: z.enum(["PROGRESS", "MILESTONE", "BADGE", "REFLECTION", "CUSTOM"]),
  content: z
    .string()
    .max(POST_MAX)
    .transform((s) => s.replace(/\n{3,}/g, "\n\n").trim()),
  visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
  milestoneType: z.string().max(20).nullish(),
  badgeKey: z.string().max(40).nullish(),
});

export type PostInput = z.input<typeof postInputSchema>;

/** Everything the server needs to check a share: reached milestones and owned badges. */
export async function getShareState(userId: string) {
  const [overview, owned] = await Promise.all([
    getArcOverview(userId),
    prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { key: true } } } }),
  ]);
  const badges = new Set(owned.map((o) => o.badge.key));
  const today = overview?.stats.days.find((d) => d.key === overview.arc.today);
  const milestone: MilestoneState | null = overview
    ? {
        dayNumber: overview.arc.dayNumber,
        arcLength: overview.arc.length,
        todayComplete: today?.status === "complete",
        bestStreak: overview.stats.bestStreak,
        arcFinished: badges.has("NINETY_DAY_FINISHER"),
      }
    : badges.has("NINETY_DAY_FINISHER")
      ? { dayNumber: 0, arcLength: 0, todayComplete: false, bestStreak: 0, arcFinished: true }
      : null;
  return { overview, badges, milestone };
}

export type CreatePostResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Create a post. Milestone numbers are taken from the server's view of the
 * Arc, never from the client, so nobody can post a streak they don't have.
 */
export async function createPost(userId: string, raw: unknown): Promise<CreatePostResult> {
  const parsed = postInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: `Keep it under ${POST_MAX} characters.` };
  const input = parsed.data;
  const { overview, badges, milestone } = await getShareState(userId);
  const arc = overview?.arc ?? null;

  const data = {
    authorId: userId,
    type: input.type,
    content: input.content,
    visibility: input.visibility,
    arcId: arc?.id ?? null,
    dayNumber: arc?.dayNumber ?? null,
    arcLength: arc?.length ?? null,
    streak: overview?.stats.currentStreak ?? null,
    milestoneType: null as string | null,
    badgeKey: null as string | null,
  };

  switch (input.type) {
    case "PROGRESS":
      if (!arc) return { ok: false, error: "Start an Arc to share your progress." };
      break;
    case "MILESTONE": {
      const m = parseMilestone(input.milestoneType);
      if (!m || !milestone || !isReached(m, milestone)) return { ok: false, error: "You haven't reached that milestone yet." };
      data.milestoneType = milestoneKey(m);
      break;
    }
    case "BADGE":
      if (!input.badgeKey || !BADGE_BY_KEY.has(input.badgeKey) || !badges.has(input.badgeKey)) {
        return { ok: false, error: "You haven't earned that badge yet." };
      }
      data.badgeKey = input.badgeKey;
      break;
    case "REFLECTION":
    case "CUSTOM":
      if (!input.content) return { ok: false, error: "Write something first." };
      break;
  }

  const post = await prisma.post.create({ data, select: { id: true } });

  // Sharing earns a token amount, at most once a day. Likes and friends never earn XP.
  if (input.type === "MILESTONE" || input.type === "BADGE" || input.type === "PROGRESS") {
    await grantXp({
      userId,
      arcId: arc?.id ?? null,
      type: "MilestonePosted",
      amount: XP.MILESTONE_POST,
      referenceType: "PostDay",
      referenceId: new Date().toISOString().slice(0, 10),
    });
  }
  return { ok: true, id: post.id };
}

export async function deletePost(userId: string, postId: string): Promise<boolean> {
  const { count } = await prisma.post.deleteMany({ where: { id: postId, authorId: userId } });
  return count === 1;
}

/** A post the viewer is allowed to see, or null. Used by reactions and /milestone/[id]. */
export async function visiblePost(postId: string, viewerId: string | null) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
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
  if (!post) return null;
  const friend = viewerId ? await areFriends(viewerId, post.authorId) : false;
  return canView(post.visibility, relationship(post.authorId, viewerId, friend)) ? post : null;
}

/** Toggle a reaction on a post the user can see. */
export async function toggleReaction(userId: string, postId: string, type: Reaction): Promise<boolean> {
  const post = await visiblePost(postId, userId);
  if (!post) return false;
  const where = { postId_userId_type: { postId, userId, type } };
  const existing = await prisma.postReaction.findUnique({ where, select: { id: true } });
  if (existing) {
    await prisma.postReaction.delete({ where });
  } else {
    await prisma.postReaction.createMany({ data: [{ postId, userId, type }], skipDuplicates: true });
    // One notification per person per post, however often they toggle.
    await notify({ userId: post.authorId, actorId: userId, type: "REACTION", referenceId: postId, dedupeKey: `reaction:${postId}:${userId}` });
  }
  return true;
}
