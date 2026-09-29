import "server-only";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getActiveArc, isEditableDay, type ActiveArc } from "@/lib/arc";
import { dayKeySchema } from "@/lib/validation";
import type { CurrentUser } from "@/lib/auth";
import type { DayKey } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const FAILED = "Something went wrong. Your progress wasn't changed. Try again.";
export const fail = (error = FAILED): ActionResult => ({ ok: false, error });
export const OK: ActionResult = { ok: true };

/**
 * Every mutation starts here: the user comes from the session, the Arc is the
 * user's own ACTIVE Arc. Nothing from the client identifies either.
 */
export async function arcContext(): Promise<{ user: CurrentUser; arc: ActiveArc } | null> {
  const user = await requireUser();
  const arc = await getActiveArc(user.id);
  return arc ? { user, arc } : null;
}

/** Same, plus a day that belongs to the Arc and isn't in the future. */
export async function dayContext(
  date: unknown,
): Promise<{ user: CurrentUser; arc: ActiveArc; day: DayKey } | null> {
  const parsed = dayKeySchema.safeParse(date);
  if (!parsed.success) return null;
  const ctx = await arcContext();
  if (!ctx || !isEditableDay(ctx.arc, parsed.data)) return null;
  return { ...ctx, day: parsed.data };
}

export function revalidateArc() {
  revalidatePath("/arc", "layout");
}

export function logError(action: string, error: unknown) {
  console.error(`${action} failed`, error);
}
