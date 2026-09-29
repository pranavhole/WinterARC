"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidUsername } from "@/lib/social/privacy";
import { fail, logError, OK, type ActionResult } from "@/lib/actions/context";

const privacySchema = z
  .object({
    profileVisibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
    leaderboardVisibility: z.enum(["SHOW", "ANONYMOUS", "HIDDEN"]),
    showXp: z.boolean(),
    showStreak: z.boolean(),
    showBadges: z.boolean(),
    showArcDay: z.boolean(),
  })
  .partial()
  .strict();

export async function updatePrivacyAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = privacySchema.safeParse(input);
  if (!parsed.success || !Object.keys(parsed.data).length) return fail();
  try {
    await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  } catch (error) {
    logError("updatePrivacy", error);
    return fail("Your privacy settings weren't saved. Try again.");
  }
  revalidatePath("/", "layout");
  return OK;
}

export async function updateUsernameAction(value: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const username = typeof value === "string" ? value.trim().toLowerCase().replace(/^@/, "") : "";
  if (!isValidUsername(username)) return fail("3–20 characters: lowercase letters, numbers and _.");
  try {
    await prisma.user.update({ where: { id: user.id }, data: { username } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("That username is taken.");
    logError("updateUsername", error);
    return fail();
  }
  revalidatePath("/", "layout");
  return OK;
}

/** Mark a badge unlock as shown, so the unlock moment appears once. */
export async function markBadgeSeenAction(badgeKey: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (typeof badgeKey !== "string" || badgeKey.length > 40) return fail();
  await prisma.userBadge.updateMany({ where: { userId: user.id, seenAt: null, badge: { key: badgeKey } }, data: { seenAt: new Date() } });
  revalidatePath("/", "layout");
  return OK;
}
