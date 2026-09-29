"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getFeed, type FeedScope } from "@/lib/social/feed";
import { createPost, deletePost, toggleReaction } from "@/lib/social/posts";
import { addComment, deleteComment, listComments, type CommentView } from "@/lib/social/comments";
import { toggleFollow } from "@/lib/social/following";
import { blockUser, reportContent, unblockUser } from "@/lib/social/blocking";
import { ensureUsername } from "@/lib/social/profile";
import { REACTIONS } from "@/lib/social/reactions";
import { fail, logError, OK, type ActionResult } from "@/lib/actions/context";

const idSchema = z.string().min(1).max(64);

function revalidateSocial() {
  revalidatePath("/social");
  revalidatePath("/profile");
  revalidatePath("/u/[username]", "page");
}

export async function createPostAction(input: unknown): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  try {
    if (!(await rateLimit(user.id, "post"))) return fail("You're posting a lot. Try again in a while.");
    await ensureUsername(user.id);
    const result = await createPost(user.id, input);
    if (!result.ok) return fail(result.error);
    revalidateSocial();
    return { ok: true, id: result.id };
  } catch (error) {
    logError("createPost", error);
    return fail("Your post wasn't shared. Try again.");
  }
}

export async function deletePostAction(postId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return fail();
  try {
    if (!(await deletePost(user.id, id.data))) return fail();
  } catch (error) {
    logError("deletePost", error);
    return fail();
  }
  revalidateSocial();
  return OK;
}

export async function reactAction(postId: unknown, type: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  const reaction = z.enum(REACTIONS).safeParse(type);
  if (!id.success || !reaction.success) return fail();
  try {
    if (!(await rateLimit(user.id, "reaction"))) return fail("Slow down a little.");
    if (!(await toggleReaction(user.id, id.data, reaction.data))) return fail();
  } catch (error) {
    logError("react", error);
    return fail();
  }
  revalidatePath("/social");
  return OK;
}

export async function addCommentAction(
  postId: unknown,
  content: unknown,
): Promise<ActionResult & { comment?: CommentView }> {
  const user = await requireUser();
  const post = idSchema.safeParse(postId);
  const text = z.string().safeParse(content);
  if (!post.success || !text.success) return fail("Invalid comment input.");

  try {
    if (!(await rateLimit(user.id, "comment"))) return fail("You're commenting quickly. Please wait a moment.");
    await ensureUsername(user.id);
    const result = await addComment(user.id, { postId: post.data, content: text.data });
    if (!result.ok) return fail(result.error);
    revalidatePath("/social");
    return { ok: true, comment: result.comment };
  } catch (error) {
    logError("addComment", error);
    return fail("Could not post comment.");
  }
}

export async function deleteCommentAction(commentId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(commentId);
  if (!id.success) return fail();

  try {
    if (!(await deleteComment(user.id, id.data))) return fail("Could not delete comment.");
    revalidatePath("/social");
    return OK;
  } catch (error) {
    logError("deleteComment", error);
    return fail();
  }
}

export async function getCommentsAction(postId: unknown): Promise<{ ok: boolean; comments: CommentView[] }> {
  const user = await requireUser();
  const id = idSchema.safeParse(postId);
  if (!id.success) return { ok: false, comments: [] };

  try {
    const comments = await listComments(id.data, user.id);
    return { ok: true, comments };
  } catch (error) {
    logError("getComments", error);
    return { ok: false, comments: [] };
  }
}

export async function toggleFollowAction(targetUserId: unknown): Promise<ActionResult & { following?: boolean }> {
  const user = await requireUser();
  const target = idSchema.safeParse(targetUserId);
  if (!target.success) return fail("Invalid user.");

  try {
    if (!(await rateLimit(user.id, "follow"))) return fail("Slow down a bit.");
    const following = await toggleFollow(user.id, target.data);
    revalidateSocial();
    return { ok: true, following };
  } catch (error) {
    logError("toggleFollow", error);
    return fail("Could not update follow status.");
  }
}

export async function blockUserAction(targetUserId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const target = idSchema.safeParse(targetUserId);
  if (!target.success) return fail("Invalid user.");

  try {
    await blockUser(user.id, target.data);
    revalidateSocial();
    return OK;
  } catch (error) {
    logError("blockUser", error);
    return fail("Could not block user.");
  }
}

export async function unblockUserAction(targetUserId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const target = idSchema.safeParse(targetUserId);
  if (!target.success) return fail("Invalid user.");

  try {
    await unblockUser(user.id, target.data);
    revalidateSocial();
    return OK;
  } catch (error) {
    logError("unblockUser", error);
    return fail("Could not unblock user.");
  }
}

export async function reportAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  try {
    if (!(await rateLimit(user.id, "report"))) return fail("Too many reports submitted recently.");
    const result = await reportContent(user.id, input);
    if (!result.ok) return fail(result.error);
    return OK;
  } catch (error) {
    logError("report", error);
    return fail("Could not submit report.");
  }
}

/** The next page of the feed, for "Load more". */
export async function loadFeedPage(scope: unknown, cursor: unknown) {
  const user = await requireUser();
  const s: FeedScope = scope === "friends" ? "friends" : scope === "following" ? "following" : "all";
  const c = idSchema.safeParse(cursor);
  if (!c.success) return { items: [], nextCursor: null };
  return getFeed(user.id, s, c.data);
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
  return OK;
}
