"use server";

import { prisma } from "@/lib/db";
import { ensureDailyRecord, isEditableDay } from "@/lib/arc";
import { runAchievements } from "@/lib/gamification/achievements";
import { addDays, dateToKey, keyToDate } from "@/lib/utils";
import { taskInputSchema, type TaskInput } from "@/lib/validation";
import { arcContext, dayContext, fail, logError, OK, revalidateArc, type ActionResult } from "@/lib/actions/context";

const MAX_TASKS_PER_DAY = 30;

async function ownedTask(taskId: unknown) {
  if (typeof taskId !== "string" || taskId.length > 64) return null;
  const ctx = await arcContext();
  if (!ctx) return null;
  const task = await prisma.dailyTask.findFirst({
    where: { id: taskId, arcId: ctx.arc.id, userId: ctx.user.id },
    select: { id: true, date: true, carriedTo: true, carriedFromId: true },
  });
  if (!task || !isEditableDay(ctx.arc, dateToKey(task.date))) return null;
  return { ...ctx, task };
}

export async function addTask(date: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return fail("Give the task a short title.");
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    const count = await prisma.dailyTask.count({ where: { arcId: arc.id, date: keyToDate(day) } });
    if (count >= MAX_TASKS_PER_DAY) return fail("That's a lot for one day. Finish a few first.");
    await ensureDailyRecord(arc, user.id, day);
    await prisma.dailyTask.create({
      data: { userId: user.id, arcId: arc.id, date: keyToDate(day), ...parsed.data },
    });
  } catch (error) {
    logError("addTask", error);
    return fail("Something went wrong. Your task wasn't added. Try again.");
  }
  revalidateArc();
  return OK;
}

export async function toggleTask(taskId: string, completed: boolean): Promise<ActionResult> {
  if (typeof completed !== "boolean") return fail();
  try {
    const owned = await ownedTask(taskId);
    if (!owned || owned.task.carriedTo) return fail();
    await prisma.dailyTask.update({ where: { id: owned.task.id }, data: { completed } });
    await runAchievements(owned.user.id, dateToKey(owned.task.date));
  } catch (error) {
    logError("toggleTask", error);
    return fail();
  }
  revalidateArc();
  return OK;
}

/** Change a task's title, note, time or duration. */
export async function updateTask(taskId: string, input: TaskInput): Promise<ActionResult> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return fail("Give the task a short title.");
  try {
    const owned = await ownedTask(taskId);
    if (!owned) return fail();
    await prisma.dailyTask.update({ where: { id: owned.task.id }, data: parsed.data });
  } catch (error) {
    logError("updateTask", error);
    return fail("Something went wrong. Your task wasn't changed. Try again.");
  }
  revalidateArc();
  return OK;
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    const owned = await ownedTask(taskId);
    if (!owned) return fail();
    const { task, arc } = owned;
    await prisma.$transaction([
      // Deleting a carried copy frees its original to be carried again.
      prisma.dailyTask.updateMany({
        where: { arcId: arc.id, id: task.carriedFromId ?? "" },
        data: { carriedTo: null },
      }),
      prisma.dailyTask.delete({ where: { id: task.id } }),
    ]);
  } catch (error) {
    logError("deleteTask", error);
    return fail("Something went wrong. Your task wasn't deleted. Try again.");
  }
  revalidateArc();
  return OK;
}

/**
 * Copy the day's unfinished tasks to the next day. Originals stay on their day
 * as history, marked as carried. Tasks already carried are skipped.
 */
export async function carryTasksForward(date: string): Promise<ActionResult> {
  try {
    const ctx = await dayContext(date);
    if (!ctx) return fail();
    const { user, arc, day } = ctx;
    const next = addDays(day, 1);
    if (next > arc.endDate) return fail("This is the last day of your Arc.");

    const unfinished = await prisma.dailyTask.findMany({
      where: { arcId: arc.id, userId: user.id, date: keyToDate(day), completed: false, carriedTo: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, note: true, startTime: true, duration: true },
    });
    if (unfinished.length === 0) return OK;

    await prisma.$transaction(async (tx) => {
      for (const task of unfinished) {
        await tx.dailyTask.create({
          data: {
            userId: user.id,
            arcId: arc.id,
            date: keyToDate(next),
            title: task.title,
            note: task.note,
            startTime: task.startTime,
            duration: task.duration,
            carriedFromId: task.id,
          },
        });
      }
      await tx.dailyTask.updateMany({
        where: { id: { in: unfinished.map((t) => t.id) } },
        data: { carriedTo: keyToDate(next) },
      });
    });
    if (next <= arc.today) await ensureDailyRecord(arc, user.id, next);
  } catch (error) {
    logError("carryTasksForward", error);
    return fail("Something went wrong. Your tasks weren't moved. Try again.");
  }
  revalidateArc();
  return OK;
}
