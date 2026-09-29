"use server";

import { prisma } from "@/lib/db";
import { suggestPlan } from "@/lib/timetable";
import { timeBlockSchema, type TimeBlockInput } from "@/lib/validation";
import { arcContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

const MAX_BLOCKS = 60;
const INVALID = "Give the block a title, and a start and end time.";

/** A linked rule must be an active rule of this Arc. */
async function linkable(arcId: string, habitId: string | null) {
  if (habitId === null) return true;
  return (await prisma.habit.count({ where: { id: habitId, arcId, active: true } })) === 1;
}

async function ownedBlock(blockId: unknown) {
  if (typeof blockId !== "string" || blockId.length > 64) return null;
  const ctx = await arcContext();
  if (!ctx) return null;
  const block = await prisma.timeBlock.findFirst({
    where: { id: blockId, arcId: ctx.arc.id, userId: ctx.user.id },
    select: { id: true },
  });
  return block ? { ...ctx, block } : null;
}

export async function addBlock(input: TimeBlockInput): Promise<ActionResult> {
  const parsed = timeBlockSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID);
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    if (!(await linkable(ctx.arc.id, parsed.data.habitId))) return fail();
    const count = await prisma.timeBlock.count({ where: { arcId: ctx.arc.id } });
    if (count >= MAX_BLOCKS) return fail("Your plan is full. Remove a block first.");
    await prisma.timeBlock.create({ data: { userId: ctx.user.id, arcId: ctx.arc.id, ...parsed.data } });
  } catch (error) {
    logError("addBlock", error);
    return fail("Something went wrong. The block wasn't added. Try again.");
  }
  revalidateArc();
  return OK;
}

export async function updateBlock(blockId: string, input: TimeBlockInput): Promise<ActionResult> {
  const parsed = timeBlockSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID);
  try {
    const owned = await ownedBlock(blockId);
    if (!owned || !(await linkable(owned.arc.id, parsed.data.habitId))) return fail();
    await prisma.timeBlock.update({ where: { id: owned.block.id }, data: parsed.data });
  } catch (error) {
    logError("updateBlock", error);
    return fail("Something went wrong. The block wasn't changed. Try again.");
  }
  revalidateArc();
  return OK;
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  try {
    const owned = await ownedBlock(blockId);
    if (!owned) return fail();
    await prisma.timeBlock.delete({ where: { id: owned.block.id } });
  } catch (error) {
    logError("deleteBlock", error);
    return fail("Something went wrong. The block wasn't removed. Try again.");
  }
  revalidateArc();
  return OK;
}

/** Replace the plan with one suggested from the Arc's rules and goals. */
export async function applySuggestedPlan(): Promise<ActionResult> {
  try {
    const ctx = await arcContext();
    if (!ctx) return fail();
    const { user, arc } = ctx;
    const habits = await prisma.habit.findMany({
      where: { arcId: arc.id, active: true },
      orderBy: { position: "asc" },
      select: { id: true, title: true, category: true },
    });
    const blocks = suggestPlan({ habits, modules: arc.modules, goals: arc.goals, focusKind: arc.focusKind });
    await prisma.$transaction([
      prisma.timeBlock.deleteMany({ where: { arcId: arc.id, userId: user.id } }),
      prisma.timeBlock.createMany({ data: blocks.map((b) => ({ ...b, userId: user.id, arcId: arc.id })) }),
    ]);
  } catch (error) {
    logError("applySuggestedPlan", error);
    return fail("Something went wrong. Your plan wasn't changed. Try again.");
  }
  revalidateArc();
  return OK;
}
