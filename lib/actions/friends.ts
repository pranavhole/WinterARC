"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { acceptRequest, cancelRequest, rejectRequest, removeFriend, searchUsers, sendFriendRequest, type SearchResult } from "@/lib/social/friends";
import { ensureUsername } from "@/lib/social/profile";
import { fail, logError, type ActionResult } from "@/lib/actions/context";

const idSchema = z.string().min(1).max(64);

function done(result: { ok: true; message?: string } | { ok: false; error: string }): ActionResult {
  revalidatePath("/friends");
  revalidatePath("/social");
  revalidatePath("/u/[username]", "page");
  return result.ok ? { ok: true } : fail(result.error);
}

export async function sendFriendRequestAction(receiverId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(receiverId);
  if (!id.success) return fail();
  try {
    if (!(await rateLimit(user.id, "friendRequest"))) return fail("That's a lot of requests for one day. Try again tomorrow.");
    await ensureUsername(user.id);
    return done(await sendFriendRequest(user.id, id.data));
  } catch (error) {
    logError("sendFriendRequest", error);
    return fail("Your request wasn't sent. Try again.");
  }
}

export async function respondFriendRequestAction(requestId: unknown, accept: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success || typeof accept !== "boolean") return fail();
  try {
    if (accept) await ensureUsername(user.id);
    return done(accept ? await acceptRequest(user.id, id.data) : await rejectRequest(user.id, id.data));
  } catch (error) {
    logError("respondFriendRequest", error);
    return fail();
  }
}

export async function cancelFriendRequestAction(requestId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(requestId);
  if (!id.success) return fail();
  try {
    return done(await cancelRequest(user.id, id.data));
  } catch (error) {
    logError("cancelFriendRequest", error);
    return fail();
  }
}

export async function removeFriendAction(friendId: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const id = idSchema.safeParse(friendId);
  if (!id.success) return fail();
  try {
    return done(await removeFriend(user.id, id.data));
  } catch (error) {
    logError("removeFriend", error);
    return fail();
  }
}

export async function searchUsersAction(query: unknown): Promise<SearchResult[]> {
  const user = await requireUser();
  if (typeof query !== "string") return [];
  if (!(await rateLimit(user.id, "search"))) return [];
  return searchUsers(user.id, query);
}
