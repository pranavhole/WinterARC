"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/app-url";
import { randomToken, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { getActiveArc } from "@/lib/arc";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { deleteImportedHealthData, disconnectHealth, syncGoogleHealth } from "@/lib/health/sync";
import { linkedInConfigured, linkedInStatus } from "@/lib/linkedin/oauth";
import { disconnectLinkedIn, publishToLinkedIn } from "@/lib/linkedin/posts";
import { LINKEDIN_MAX } from "@/lib/linkedin/templates";
import { isReached, milestoneKey, milestoneTitle, parseMilestone } from "@/lib/social/milestones";
import { createPost, getShareState } from "@/lib/social/posts";
import { ensureUsername } from "@/lib/social/profile";
import { fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

// ─── LinkedIn ───────────────────────────────────────────────────────────────

const shareSchema = z.object({
  subject: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("milestone"), milestoneType: z.string().max(20) }),
    z.object({ kind: z.literal("badge"), badgeKey: z.string().max(40) }),
  ]),
  text: z.string().trim().min(1).max(LINKEDIN_MAX),
  attachCard: z.boolean(),
});

export type LinkedInShareResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string; reconnect?: boolean };

/**
 * Publish to LinkedIn. Runs only when the user presses "Post to LinkedIn" on
 * the preview; nothing is ever posted automatically. The subject is checked
 * on the server: you can only share a milestone or badge you actually have.
 */
export async function shareToLinkedInAction(input: unknown): Promise<LinkedInShareResult> {
  const user = await requireUser();
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Write something to post (up to 3,000 characters)." };
  const { subject, text, attachCard } = parsed.data;

  try {
    const { badges, milestone } = await getShareState(user.id);
    let card: { type: "MILESTONE" | "BADGE"; milestoneType?: string; badgeKey?: string; title: string } | null = null;
    if (subject.kind === "milestone") {
      const m = parseMilestone(subject.milestoneType);
      if (!m || !milestone || !isReached(m, milestone)) return { ok: false, error: "You haven't reached that milestone yet." };
      card = { type: "MILESTONE", milestoneType: milestoneKey(m), title: milestoneTitle(m, milestone.arcLength || null) };
    } else {
      const def = BADGE_BY_KEY.get(subject.badgeKey);
      if (!def || !badges.has(def.key)) return { ok: false, error: "You haven't earned that badge yet." };
      card = { type: "BADGE", badgeKey: def.key, title: def.name };
    }

    if (!(await rateLimit(user.id, "linkedinPost"))) return { ok: false, error: "You've posted to LinkedIn a few times today. Try again tomorrow." };

    // Optional public milestone card on ARC: the link LinkedIn previews.
    let link = null;
    if (attachCard) {
      await ensureUsername(user.id);
      const post = await createPost(user.id, {
        type: card.type,
        content: "",
        visibility: "PUBLIC",
        milestoneType: card.milestoneType ?? null,
        badgeKey: card.badgeKey ?? null,
      });
      if (post.ok) link = { url: `${await appUrl()}/milestone/${post.id}`, title: `${card.title} · ARC`, description: "Build your Arc. Keep your promises. Track the proof." };
    }

    const result = await publishToLinkedIn(user.id, text, link);
    if (!result.ok) {
      if (result.reason === "not-connected") return { ok: false, error: "Connect LinkedIn first.", reconnect: true };
      if (result.reason === "expired") return { ok: false, error: "LinkedIn connection expired.", reconnect: true };
      return { ok: false, error: "LinkedIn didn't accept the post. Try again in a moment." };
    }
    revalidatePath("/social");
    return { ok: true, url: result.url };
  } catch (error) {
    logError("shareToLinkedIn", error);
    return { ok: false, error: "LinkedIn didn't accept the post. Try again in a moment." };
  }
}

export async function disconnectLinkedInAction(): Promise<ActionResult> {
  const user = await requireUser();
  await disconnectLinkedIn(user.id);
  revalidatePath("/arc/settings");
  return OK;
}

// ─── Health ─────────────────────────────────────────────────────────────────

export async function syncHealthNowAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (!(await rateLimit(user.id, "healthSync"))) return fail("You just synced. Try again in a little while.");
  const result = await syncGoogleHealth(user.id);
  if (!result.ok) {
    return fail(result.reason === "expired" ? "Health connection expired. Reconnect to keep syncing." : "Sync didn't finish. Try again in a moment.");
  }
  revalidatePath("/", "layout");
  return OK;
}

export async function disconnectHealthAction(provider: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const p = z.enum(["GOOGLE_HEALTH", "HEALTH_CONNECT"]).safeParse(provider);
  if (!p.success) return fail();
  try {
    await disconnectHealth(user.id, p.data);
  } catch (error) {
    logError("disconnectHealth", error);
    return fail();
  }
  revalidatePath("/", "layout");
  return OK;
}

export async function deleteHealthDataAction(confirm: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (confirm !== true) return fail();
  try {
    await deleteImportedHealthData(user.id);
  } catch (error) {
    logError("deleteHealthData", error);
    return fail("Imported data wasn't deleted. Try again.");
  }
  revalidatePath("/", "layout");
  return OK;
}

const integrationSchema = z.object({
  habitId: z.string().min(1).max(64),
  type: z.enum(["NONE", "STEPS", "SLEEP", "EXERCISE"]),
  // Steps, or minutes of sleep / exercise. Null = use the Arc's goal.
  target: z.number().int().min(1).max(100_000).nullable(),
});

/** Connect a rule to health data, so it completes itself when the data meets the target. */
export async function setHabitIntegrationAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = integrationSchema.safeParse(input);
  if (!parsed.success) return fail("That target doesn't look right.");
  const { habitId, type, target } = parsed.data;
  try {
    const arc = await getActiveArc(user.id);
    if (!arc) return fail();
    const { count } = await prisma.habit.updateMany({
      where: { id: habitId, arcId: arc.id, arc: { userId: user.id } },
      data: { integrationType: type, integrationTarget: type === "NONE" ? null : target },
    });
    if (!count) return fail();
  } catch (error) {
    logError("setHabitIntegration", error);
    return fail();
  }
  revalidateArc();
  return OK;
}

// ─── Android bridge tokens ──────────────────────────────────────────────────

const MAX_DEVICES = 5;

/** Create a bridge token. The plain token is returned once and only its hash is stored. */
export async function createBridgeTokenAction(name: unknown): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const label = typeof name === "string" && name.trim() ? name.trim().slice(0, 40) : "Android phone";
  if (!(await rateLimit(user.id, "deviceToken"))) return { ok: false, error: "Too many new devices today." };
  const count = await prisma.healthDeviceToken.count({ where: { userId: user.id } });
  if (count >= MAX_DEVICES) return { ok: false, error: `Remove a device first (up to ${MAX_DEVICES}).` };
  const token = `arc_hc_${randomToken(32)}`;
  await prisma.healthDeviceToken.create({ data: { userId: user.id, name: label, tokenHash: sha256(token) } });
  revalidatePath("/arc/settings");
  return { ok: true, token };
}

export async function revokeBridgeTokenAction(id: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (typeof id !== "string" || id.length > 64) return fail();
  await prisma.healthDeviceToken.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/arc/settings");
  return OK;
}

/** For the share dialog: whether LinkedIn is connected. Never includes the token. */
export async function getLinkedInStatusAction() {
  const user = await requireUser();
  return { configured: linkedInConfigured(), ...(await linkedInStatus(user.id)) };
}
