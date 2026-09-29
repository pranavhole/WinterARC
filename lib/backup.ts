import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HABIT_CATEGORIES } from "@/lib/arc-engine";
import { HABIT_DESCRIPTION_MAX, HABIT_TITLE_MAX, JOURNAL_MAX, TASK_TITLE_MAX } from "@/lib/limits";
import { FOCUS_KINDS, parseFocusKind, parseModules } from "@/lib/modules";
import { BLOCK_DAYS } from "@/lib/timetable";
import { dateToKey, diffDays, isValidTimeZone, keyToDate, todayKey } from "@/lib/utils";

/**
 * ARC backup format, version 1. Contains the user's Arc data only: no user id,
 * no OAuth or session tokens. Rows reference each other by backup-local refs.
 */

export const BACKUP_VERSION = 2;
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((k) => {
    try {
      const d = keyToDate(k);
      return !isNaN(d.getTime()) && dateToKey(d) === k;
    } catch {
      return false;
    }
  }, "Invalid date");
const ref = z.string().min(1).max(40);
const minutes = z.number().int().min(0).max(1439).nullable();

const backupSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    exportedAt: z.string().max(40),
    arc: z.object({
      startDate: day,
      endDate: day,
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
      statement: z.string().min(1).max(500),
      timezone: z.string().max(64).refine(isValidTimeZone, "Invalid timezone"),
      modules: z.record(z.string(), z.boolean()),
      focusKind: z.enum(FOCUS_KINDS).nullable(),
      stepGoal: z.number().int().min(1000).max(100000),
      sleepGoal: z.number().min(4).max(12),
      focusGoalWeekday: z.number().min(0.5).max(16),
      focusGoalWeekend: z.number().min(0.5).max(16),
      dsaGoal: z.number().int().min(1).max(30),
    }),
    assessment: z.record(z.string().max(40), z.json()).refine((a) => Object.keys(a).length <= 30),
    habits: z
      .array(
        z.object({
          ref,
          title: z.string().min(1).max(HABIT_TITLE_MAX),
          description: z.string().max(HABIT_DESCRIPTION_MAX).nullable(),
          category: z.enum(HABIT_CATEGORIES),
          reason: z.string().max(300).nullable().default(null),
          position: z.number().int().min(0).max(1000),
          active: z.boolean(),
          activeFrom: day,
          deactivatedOn: day.nullable(),
        }),
      )
      .min(1)
      .max(60),
    habitLogs: z.array(z.object({ habit: ref, date: day, completed: z.boolean() })).max(30000),
    dailyRecords: z
      .array(
        z.object({
          date: day,
          steps: z.number().int().min(0).max(200000).nullable(),
          weight: z.number().gt(0).max(500).nullable(),
          studyHours: z.number().min(0).max(24).nullable(),
          dsaProblems: z.number().int().min(0).max(100).nullable(),
          bedtime: minutes,
          wakeTime: minutes,
          sleepQuality: z.number().int().min(1).max(5).nullable(),
          journal: z.string().max(JOURNAL_MAX).nullable(),
          stepGoal: z.number().int().positive().nullable(),
          sleepGoal: z.number().positive().nullable(),
          focusGoal: z.number().positive().nullable(),
          dsaGoal: z.number().int().positive().nullable(),
          trackTasks: z.boolean(),
        }),
      )
      .max(400),
    tasks: z
      .array(
        z.object({
          ref,
          date: day,
          title: z.string().min(1).max(TASK_TITLE_MAX),
          note: z.string().max(500).nullable().default(null),
          startTime: minutes.default(null),
          duration: z.number().int().min(5).max(720).nullable().default(null),
          completed: z.boolean(),
          carriedFrom: ref.nullable(),
          carriedTo: day.nullable(),
        }),
      )
      .max(10000),
    timeBlocks: z
      .array(
        z.object({
          title: z.string().min(1).max(60),
          note: z.string().max(200).nullable(),
          start: z.number().int().min(0).max(1439),
          end: z.number().int().min(0).max(1439),
          days: z.enum(BLOCK_DAYS),
          habit: ref.nullable().default(null),
        }),
      )
      .max(60)
      .default([]),
    posts: z
      .array(
        z.object({
          type: z.enum(["PROGRESS", "MILESTONE", "BADGE", "REFLECTION", "CUSTOM"]),
          content: z.string().max(500),
          visibility: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
          milestoneType: z.string().nullable().default(null),
          badgeKey: z.string().nullable().default(null),
          dayNumber: z.number().int().nullable().default(null),
          arcLength: z.number().int().nullable().default(null),
          streak: z.number().int().nullable().default(null),
          createdAt: z.string().max(40),
        }),
      )
      .max(1000)
      .default([]),
    xpLedger: z
      .array(
        z.object({
          type: z.string().max(64),
          amount: z.number().int(),
          referenceType: z.string().max(64),
          referenceId: z.string().max(64),
          key: z.string().max(128),
          createdAt: z.string().max(40),
        }),
      )
      .max(50000)
      .default([]),
    badges: z
      .array(
        z.object({
          badgeKey: z.string().max(64),
          earnedAt: z.string().max(40),
        }),
      )
      .max(100)
      .default([]),
    healthMetrics: z
      .array(
        z.object({
          date: day,
          steps: z.number().int().min(0).max(200000).nullable().default(null),
          sleepMinutes: z.number().int().min(0).max(1440).nullable().default(null),
          sleepStart: z.string().max(40).nullable().default(null),
          sleepEnd: z.string().max(40).nullable().default(null),
          exerciseMinutes: z.number().int().min(0).max(1440).nullable().default(null),
          exerciseSessions: z.number().int().min(0).max(50).nullable().default(null),
          weight: z.number().gt(0).max(500).nullable().default(null),
          source: z.enum(["GOOGLE_HEALTH", "HEALTH_CONNECT"]),
          syncedAt: z.string().max(40),
        }),
      )
      .max(400)
      .default([]),
  })
  .superRefine((b, ctx) => {
    const length = diffDays(b.arc.startDate, b.arc.endDate) + 1;
    if (length < 7 || length > 365) ctx.addIssue({ code: "custom", message: "Arc length out of range" });
    const habitRefs = new Set(b.habits.map((h) => h.ref));
    const taskRefs = new Set(b.tasks.map((t) => t.ref));
    if (habitRefs.size !== b.habits.length || taskRefs.size !== b.tasks.length)
      ctx.addIssue({ code: "custom", message: "Duplicate references" });
    if (b.habitLogs.some((l) => !habitRefs.has(l.habit)))
      ctx.addIssue({ code: "custom", message: "A log points at a missing habit" });
    if (b.timeBlocks.some((t) => t.habit !== null && !habitRefs.has(t.habit)))
      ctx.addIssue({ code: "custom", message: "A time block points at a missing habit" });
    if (b.tasks.some((t) => t.carriedFrom !== null && !taskRefs.has(t.carriedFrom)))
      ctx.addIssue({ code: "custom", message: "A task points at a missing task" });
    const logKeys = new Set(b.habitLogs.map((l) => `${l.habit}|${l.date}`));
    const recordDays = new Set(b.dailyRecords.map((r) => r.date));
    if (logKeys.size !== b.habitLogs.length || recordDays.size !== b.dailyRecords.length)
      ctx.addIssue({ code: "custom", message: "Duplicate days" });
  });

export type Backup = z.infer<typeof backupSchema>;

export function parseBackup(text: unknown): { ok: true; backup: Backup } | { ok: false; error: string } {
  if (typeof text !== "string" || text.length === 0) return { ok: false, error: "That file is empty." };
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: "That file is too large to be an ARC backup." };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: "That file isn't a valid ARC backup." };
  return { ok: true, backup: parsed.data };
}

/** Build a backup of the user's current Arc (or their most recent one). */
export async function buildBackup(userId: string): Promise<Backup | null> {
  const arc =
    (await prisma.arc.findFirst({ where: { userId, status: "ACTIVE" } })) ??
    (await prisma.arc.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }));
  if (!arc) return null;

  const [answers, habits, logs, records, tasks, blocks, posts, xpEvents, userBadges, healthMetrics] = await Promise.all([
    prisma.assessmentAnswer.findMany({ where: { arcId: arc.id } }),
    prisma.habit.findMany({ where: { arcId: arc.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.habitLog.findMany({ where: { userId, habit: { arcId: arc.id } }, orderBy: { date: "asc" } }),
    prisma.dailyRecord.findMany({ where: { userId, arcId: arc.id }, orderBy: { date: "asc" } }),
    prisma.dailyTask.findMany({ where: { userId, arcId: arc.id }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.timeBlock.findMany({ where: { userId, arcId: arc.id }, orderBy: { start: "asc" } }),
    prisma.post.findMany({ where: { authorId: userId }, orderBy: { createdAt: "asc" } }),
    prisma.xPEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: { select: { key: true } } }, orderBy: { earnedAt: "asc" } }),
    prisma.healthDailyMetric.findMany({ where: { userId }, orderBy: { date: "asc" } }),
  ]);

  const habitRef = new Map(habits.map((h, i) => [h.id, `h${i + 1}`]));
  const taskRef = new Map(tasks.map((t, i) => [t.id, `t${i + 1}`]));

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    arc: {
      startDate: dateToKey(arc.startDate),
      endDate: dateToKey(arc.endDate),
      status: arc.status,
      statement: arc.statement,
      timezone: arc.timezone,
      modules: parseModules(arc.modules),
      focusKind: parseFocusKind(arc.focusKind),
      stepGoal: arc.stepGoal,
      sleepGoal: arc.sleepGoal,
      focusGoalWeekday: arc.focusGoalWeekday,
      focusGoalWeekend: arc.focusGoalWeekend,
      dsaGoal: arc.dsaGoal,
    },
    assessment: Object.fromEntries(answers.map((a) => [a.questionKey, a.answer as z.infer<ReturnType<typeof z.json>>])),
    habits: habits.map((h) => ({
      ref: habitRef.get(h.id)!,
      title: h.title,
      description: h.description,
      category: h.category,
      reason: h.reason,
      position: h.position,
      active: h.active,
      activeFrom: dateToKey(h.activeFrom),
      deactivatedOn: h.deactivatedOn ? dateToKey(h.deactivatedOn) : null,
    })),
    habitLogs: logs.map((l) => ({ habit: habitRef.get(l.habitId)!, date: dateToKey(l.date), completed: l.completed })),
    dailyRecords: records.map((r) => ({
      date: dateToKey(r.date),
      steps: r.steps,
      weight: r.weight,
      studyHours: r.studyHours,
      dsaProblems: r.dsaProblems,
      bedtime: r.bedtime,
      wakeTime: r.wakeTime,
      sleepQuality: r.sleepQuality,
      journal: r.journal,
      stepGoal: r.stepGoal,
      sleepGoal: r.sleepGoal,
      focusGoal: r.focusGoal,
      dsaGoal: r.dsaGoal,
      trackTasks: r.trackTasks,
    })),
    tasks: tasks.map((t) => ({
      ref: taskRef.get(t.id)!,
      date: dateToKey(t.date),
      title: t.title,
      note: t.note,
      startTime: t.startTime,
      duration: t.duration,
      completed: t.completed,
      carriedFrom: t.carriedFromId ? (taskRef.get(t.carriedFromId) ?? null) : null,
      carriedTo: t.carriedTo ? dateToKey(t.carriedTo) : null,
    })),
    timeBlocks: blocks.map((b) => ({
      title: b.title,
      note: b.note,
      start: b.start,
      end: b.end,
      days: b.days,
      habit: b.habitId ? (habitRef.get(b.habitId) ?? null) : null,
    })),
    posts: posts.map((p) => ({
      type: p.type,
      content: p.content,
      visibility: p.visibility,
      milestoneType: p.milestoneType,
      badgeKey: p.badgeKey,
      dayNumber: p.dayNumber,
      arcLength: p.arcLength,
      streak: p.streak,
      createdAt: p.createdAt.toISOString(),
    })),
    xpLedger: xpEvents.map((x) => ({
      type: x.type,
      amount: x.amount,
      referenceType: x.referenceType,
      referenceId: x.referenceId,
      key: x.key,
      createdAt: x.createdAt.toISOString(),
    })),
    badges: userBadges.map((b) => ({
      badgeKey: b.badge.key,
      earnedAt: b.earnedAt.toISOString(),
    })),
    healthMetrics: healthMetrics.map((h) => ({
      date: dateToKey(h.date),
      steps: h.steps,
      sleepMinutes: h.sleepMinutes,
      sleepStart: h.sleepStart?.toISOString() ?? null,
      sleepEnd: h.sleepEnd?.toISOString() ?? null,
      exerciseMinutes: h.exerciseMinutes,
      exerciseSessions: h.exerciseSessions,
      weight: h.weight,
      source: h.source,
      syncedAt: h.syncedAt.toISOString(),
    })),
  };
}

/** Whether the restored Arc would be the user's active one (it hasn't ended yet). */
export function restoresAsActive(backup: Backup): boolean {
  return backup.arc.status !== "ARCHIVED" && todayKey(backup.arc.timezone) <= backup.arc.endDate;
}

/**
 * Restore a backup as a new Arc. Nothing existing is overwritten: if the backup
 * restores as active and the user already has an active Arc, that Arc is
 * archived (kept, not deleted).
 */
export async function restoreBackup(userId: string, b: Backup): Promise<void> {
  const active = restoresAsActive(b);
  await prisma.$transaction(
    async (tx) => {
      if (active) {
        await tx.arc.updateMany({ where: { userId, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
      }
      const arc = await tx.arc.create({
        data: {
          userId,
          startDate: keyToDate(b.arc.startDate),
          endDate: keyToDate(b.arc.endDate),
          status: active ? "ACTIVE" : b.arc.status === "ARCHIVED" ? "ARCHIVED" : "COMPLETED",
          statement: b.arc.statement,
          timezone: b.arc.timezone,
          modules: parseModules(b.arc.modules),
          focusKind: b.arc.focusKind,
          stepGoal: b.arc.stepGoal,
          sleepGoal: b.arc.sleepGoal,
          focusGoalWeekday: b.arc.focusGoalWeekday,
          focusGoalWeekend: b.arc.focusGoalWeekend,
          dsaGoal: b.arc.dsaGoal,
        },
      });

      await tx.assessmentAnswer.createMany({
        data: Object.entries(b.assessment).map(([questionKey, answer]) => ({
          arcId: arc.id,
          questionKey,
          answer: (answer ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        })),
      });

      const habitIds = new Map<string, string>();
      for (const h of b.habits) {
        const created = await tx.habit.create({
          data: {
            arcId: arc.id,
            title: h.title,
            description: h.description,
            category: h.category,
            reason: h.reason,
            position: h.position,
            active: h.active,
            activeFrom: keyToDate(h.activeFrom),
            deactivatedOn: h.deactivatedOn ? keyToDate(h.deactivatedOn) : null,
          },
          select: { id: true },
        });
        habitIds.set(h.ref, created.id);
      }

      await tx.habitLog.createMany({
        data: b.habitLogs.map((l) => ({
          habitId: habitIds.get(l.habit)!,
          userId,
          date: keyToDate(l.date),
          completed: l.completed,
        })),
      });

      await tx.dailyRecord.createMany({
        data: b.dailyRecords.map(({ date, ...r }) => ({ ...r, userId, arcId: arc.id, date: keyToDate(date) })),
      });

      // Originals first, so carried copies can point at them.
      const taskIds = new Map<string, string>();
      const ordered = [...b.tasks].sort((x, y) => Number(x.carriedFrom !== null) - Number(y.carriedFrom !== null));
      for (const t of ordered) {
        const created = await tx.dailyTask.create({
          data: {
            userId,
            arcId: arc.id,
            date: keyToDate(t.date),
            title: t.title,
            note: t.note,
            startTime: t.startTime,
            duration: t.duration,
            completed: t.completed,
            carriedTo: t.carriedTo ? keyToDate(t.carriedTo) : null,
            carriedFromId: t.carriedFrom ? (taskIds.get(t.carriedFrom) ?? null) : null,
          },
          select: { id: true },
        });
        taskIds.set(t.ref, created.id);
      }

      await tx.timeBlock.createMany({
        data: b.timeBlocks.map(({ habit, ...block }) => ({
          ...block,
          habitId: habit ? (habitIds.get(habit) ?? null) : null,
          userId,
          arcId: arc.id,
        })),
      });

      if (b.posts && b.posts.length > 0) {
        await tx.post.createMany({
          data: b.posts.map((p) => ({
            authorId: userId,
            arcId: arc.id,
            type: p.type,
            content: p.content,
            visibility: p.visibility,
            milestoneType: p.milestoneType,
            badgeKey: p.badgeKey,
            dayNumber: p.dayNumber,
            arcLength: p.arcLength,
            streak: p.streak,
            createdAt: new Date(p.createdAt),
          })),
        });
      }

      if (b.xpLedger && b.xpLedger.length > 0) {
        await tx.xPEvent.createMany({
          data: b.xpLedger.map((x) => ({
            userId,
            arcId: arc.id,
            type: x.type,
            amount: x.amount,
            referenceType: x.referenceType,
            referenceId: x.referenceId,
            key: x.key,
            createdAt: new Date(x.createdAt),
          })),
          skipDuplicates: true,
        });
      }

      if (b.badges && b.badges.length > 0) {
        const dbBadges = await tx.badge.findMany({
          where: { key: { in: b.badges.map((x) => x.badgeKey) } },
          select: { id: true, key: true },
        });
        const badgeMap = new Map(dbBadges.map((dbB) => [dbB.key, dbB.id]));
        const badgeData = b.badges
          .filter((x) => badgeMap.has(x.badgeKey))
          .map((x) => ({
            userId,
            badgeId: badgeMap.get(x.badgeKey)!,
            arcId: arc.id,
            earnedAt: new Date(x.earnedAt),
          }));
        if (badgeData.length > 0) {
          await tx.userBadge.createMany({
            data: badgeData,
            skipDuplicates: true,
          });
        }
      }

      if (b.healthMetrics && b.healthMetrics.length > 0) {
        await tx.healthDailyMetric.createMany({
          data: b.healthMetrics.map((h) => ({
            userId,
            date: keyToDate(h.date),
            steps: h.steps,
            sleepMinutes: h.sleepMinutes,
            sleepStart: h.sleepStart ? new Date(h.sleepStart) : null,
            sleepEnd: h.sleepEnd ? new Date(h.sleepEnd) : null,
            exerciseMinutes: h.exerciseMinutes,
            exerciseSessions: h.exerciseSessions,
            weight: h.weight,
            source: h.source,
            sourceRecordHash: `backup-restored-${h.date}`,
            syncedAt: new Date(h.syncedAt),
          })),
          skipDuplicates: true,
        });
      }
    },
    { timeout: 30_000 },
  );
}
