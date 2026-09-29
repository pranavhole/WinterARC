import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { computeArcStats, isHabitActiveOn, type StatsHabit } from "@/lib/streaks";
import type { RecordSnapshot, TaskSnapshot } from "@/lib/scoring";
import { focusGoalFor } from "@/lib/metrics";
import { parseFocusKind, parseModules, type ArcGoals } from "@/lib/modules";
import { dateToKey, diffDays, keyToDate, todayKey, type DayKey } from "@/lib/utils";
import type { HabitCategoryValue } from "@/lib/arc-engine";
import type { BlockView } from "@/lib/timetable";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The user's ACTIVE Arc. An Arc whose last day has passed is marked COMPLETED
 * here, so there is no background job to run.
 */
export const getActiveArc = cache(async (userId: string) => {
  const arc = await prisma.arc.findFirst({
    where: { userId, status: "ACTIVE" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      statement: true,
      timezone: true,
      modules: true,
      focusKind: true,
      stepGoal: true,
      sleepGoal: true,
      focusGoalWeekday: true,
      focusGoalWeekend: true,
      dsaGoal: true,
    },
  });
  if (!arc) return null;

  const today = todayKey(arc.timezone);
  const endDate = dateToKey(arc.endDate);
  if (today > endDate) {
    await prisma.arc.updateMany({ where: { id: arc.id, userId }, data: { status: "COMPLETED" } });
    return null;
  }

  const startDate = dateToKey(arc.startDate);
  const length = diffDays(startDate, endDate) + 1;
  const dayNumber = Math.min(length, Math.max(1, diffDays(startDate, today) + 1));
  const goals: ArcGoals = {
    stepGoal: arc.stepGoal,
    sleepGoal: arc.sleepGoal,
    focusGoalWeekday: arc.focusGoalWeekday,
    focusGoalWeekend: arc.focusGoalWeekend,
    dsaGoal: arc.dsaGoal,
  };
  return {
    id: arc.id,
    statement: arc.statement,
    timezone: arc.timezone,
    startDate,
    endDate,
    today,
    length,
    dayNumber,
    daysLeft: length - dayNumber,
    modules: parseModules(arc.modules),
    focusKind: parseFocusKind(arc.focusKind),
    goals,
  };
});

export type ActiveArc = NonNullable<Awaited<ReturnType<typeof getActiveArc>>>;

export const getLatestFinishedArc = cache(async (userId: string) => {
  return prisma.arc.findFirst({
    where: { userId, status: { in: ["COMPLETED", "ARCHIVED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, startDate: true, endDate: true },
  });
});

/** Parse ?date= into a day inside the Arc. Anything invalid falls back to today. */
export function resolveArcDate(arc: ActiveArc, raw: unknown): DayKey {
  if (typeof raw !== "string" || !DATE_KEY.test(raw)) return arc.today;
  const date = keyToDate(raw);
  if (Number.isNaN(date.getTime()) || dateToKey(date) !== raw) return arc.today;
  if (raw < arc.startDate) return arc.startDate;
  if (raw > arc.endDate) return arc.endDate;
  return raw;
}

/** Days that can be edited: from the start of the Arc up to today. */
export function isEditableDay(arc: ActiveArc, key: DayKey): boolean {
  return key >= arc.startDate && key <= arc.today;
}

/** The goals that apply to one day, given the modules enabled right now. Null = not tracked. */
export function goalSnapshot(arc: ActiveArc, key: DayKey) {
  const m = arc.modules;
  return {
    stepGoal: m.steps ? arc.goals.stepGoal : null,
    sleepGoal: m.sleep ? arc.goals.sleepGoal : null,
    focusGoal: m.focus ? focusGoalFor(arc.goals, key) : null,
    dsaGoal: m.dsa ? arc.goals.dsaGoal : null,
    trackTasks: m.tasks,
  };
}

/**
 * Create the day's record if needed. A new record snapshots the current goals.
 * Today's record follows settings changes; past records keep their snapshot.
 */
export async function ensureDailyRecord(arc: ActiveArc, userId: string, key: DayKey) {
  const snapshot = goalSnapshot(arc, key);
  return prisma.dailyRecord.upsert({
    where: { arcId_date: { arcId: arc.id, date: keyToDate(key) } },
    create: { userId, arcId: arc.id, date: keyToDate(key), ...snapshot },
    update: key === arc.today ? snapshot : {},
    select: { id: true },
  });
}

export type HabitView = {
  id: string;
  title: string;
  description: string | null;
  category: HabitCategoryValue;
  reason: string | null;
  active: boolean;
  integrationType: HabitIntegrationValue;
  integrationTarget: number | null;
};

export type HabitIntegrationValue = "NONE" | "STEPS" | "SLEEP" | "EXERCISE";

type ValueSource = "MANUAL" | "HEALTH" | null;

export type DailyRecordView = RecordSnapshot & {
  stepsSource: ValueSource;
  sleepSource: ValueSource;
  weightSource: ValueSource;
  weight: number | null;
  sleepQuality: number | null;
  journal: string | null;
};

export type TaskView = {
  id: string;
  title: string;
  note: string | null;
  startTime: number | null;
  duration: number | null;
  completed: boolean;
  carriedTo: DayKey | null;
};

/**
 * Everything the Arc screens need. Uncached, because the achievement engine
 * calls it right after a mutation. Pages use getArcOverview (once per request).
 */
export async function loadArcOverview(userId: string) {
  const arc = await getActiveArc(userId);
  if (!arc) return null;

  const [habits, logs, records, tasks, timeBlocks] = await Promise.all([
    prisma.habit.findMany({
      where: { arcId: arc.id, arc: { userId } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        reason: true,
        active: true,
        activeFrom: true,
        deactivatedOn: true,
        integrationType: true,
        integrationTarget: true,
      },
    }),
    prisma.habitLog.findMany({
      where: { userId, habit: { arcId: arc.id } },
      select: { habitId: true, date: true, completed: true, source: true },
    }),
    prisma.dailyRecord.findMany({
      where: { userId, arcId: arc.id },
      select: {
        date: true,
        steps: true,
        weight: true,
        studyHours: true,
        dsaProblems: true,
        bedtime: true,
        wakeTime: true,
        sleepQuality: true,
        journal: true,
        stepsSource: true,
        sleepSource: true,
        weightSource: true,
        stepGoal: true,
        sleepGoal: true,
        focusGoal: true,
        dsaGoal: true,
        trackTasks: true,
      },
    }),
    prisma.dailyTask.findMany({
      where: { userId, arcId: arc.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, date: true, title: true, note: true, startTime: true, duration: true, completed: true, carriedTo: true },
    }),
    prisma.timeBlock.findMany({
      where: { userId, arcId: arc.id },
      orderBy: { start: "asc" },
      select: { id: true, title: true, note: true, start: true, end: true, days: true, habitId: true },
    }),
  ]);

  const statsHabits: StatsHabit[] = habits.map((h) => ({
    id: h.id,
    activeFrom: dateToKey(h.activeFrom),
    deactivatedOn: h.deactivatedOn ? dateToKey(h.deactivatedOn) : null,
  }));

  const recordsByDay = new Map<DayKey, DailyRecordView>();
  for (const { date, ...rest } of records) recordsByDay.set(dateToKey(date), rest);

  const tasksByDay = new Map<DayKey, TaskView[]>();
  const taskSnapshots = new Map<DayKey, TaskSnapshot[]>();
  for (const t of tasks) {
    const key = dateToKey(t.date);
    const view: TaskView = {
      id: t.id,
      title: t.title,
      note: t.note,
      startTime: t.startTime,
      duration: t.duration,
      completed: t.completed,
      carriedTo: t.carriedTo ? dateToKey(t.carriedTo) : null,
    };
    (tasksByDay.get(key) ?? tasksByDay.set(key, []).get(key)!).push(view);
    (taskSnapshots.get(key) ?? taskSnapshots.set(key, []).get(key)!).push({
      completed: t.completed,
      carried: view.carriedTo !== null,
    });
  }

  // Timed tasks first, in time order; then the rest in the order they were added.
  for (const list of tasksByDay.values()) {
    list.sort((x, y) => (x.startTime ?? 1e9) - (y.startTime ?? 1e9));
  }

  const logEntries = logs.map((l) => ({ habitId: l.habitId, date: dateToKey(l.date), completed: l.completed }));
  const doneByDay = new Map<DayKey, Set<string>>();
  // Completions set by a health sync, shown as "Completed via Health".
  const healthDone = new Set<string>();
  for (const [i, l] of logEntries.entries()) {
    if (!l.completed) continue;
    (doneByDay.get(l.date) ?? doneByDay.set(l.date, new Set()).get(l.date)!).add(l.habitId);
    if (logs[i].source === "HEALTH") healthDone.add(`${l.habitId}:${l.date}`);
  }

  const stats = computeArcStats({
    startDate: arc.startDate,
    endDate: arc.endDate,
    today: arc.today,
    habits: statsHabits,
    logs: logEntries,
    records: recordsByDay,
    tasks: taskSnapshots,
  });

  const views: HabitView[] = habits.map((h) => ({
    id: h.id,
    title: h.title,
    description: h.description,
    category: h.category,
    reason: h.reason,
    active: h.active,
    integrationType: h.integrationType,
    integrationTarget: h.integrationTarget,
  }));

  function habitsOn(key: DayKey) {
    const done = doneByDay.get(key);
    return habits
      .filter((_, i) => isHabitActiveOn(statsHabits[i], key))
      .map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        category: h.category,
        completed: done?.has(h.id) ?? false,
        viaHealth: healthDone.has(`${h.id}:${key}`),
      }));
  }

  const blocks: BlockView[] = timeBlocks;

  const snapshotHabits = habits.map((h, i) => ({ ...statsHabits[i], category: h.category }));

  return { arc, habits: views, habitsOn, recordsByDay, tasksByDay, blocks, stats, doneByDay, snapshotHabits };
}

/** Everything the Arc screens need, loaded once per request. */
export const getArcOverview = cache(loadArcOverview);

export type ArcOverview = NonNullable<Awaited<ReturnType<typeof getArcOverview>>>;
