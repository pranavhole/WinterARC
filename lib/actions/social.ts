"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getFeed, type FeedScope } from "@/lib/social/feed";
import { createPost, deletePost, toggleReaction } from "@/lib/social/posts";
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

/** The next page of the feed, for "Load more". */
export async function loadFeedPage(scope: unknown, cursor: unknown) {
  const user = await requireUser();
  const s: FeedScope = scope === "friends" ? "friends" : "all";
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
