import "server-only";
import type { HealthProviderKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureDailyRecord, getActiveArc, type ActiveArc } from "@/lib/arc";
import { runAchievements } from "@/lib/gamification/achievements";
import { isHabitActiveOn } from "@/lib/streaks";
import { localMinutesOf } from "@/lib/tz";
import { addDays, dateToKey, keyToDate, todayKey, type DayKey } from "@/lib/utils";
import { GoogleHealthProvider } from "@/lib/health/google-health";
import { normalizeDay } from "@/lib/health/normalize";
import { parseDataTypes } from "@/lib/health/permissions";
import type { HealthProvider } from "@/lib/health/provider";
import { HealthAuthError, type DailyHealth, type HealthDataType } from "@/lib/health/types";

/**
 * Provider → normalize → HealthDailyMetric → the Arc.
 * Every step is idempotent: a day whose records hash hasn't changed is skipped,
 * and re-applying a metric writes the same values.
 */

const RECENT_DAYS = 3;
const INITIAL_DAYS = 7;
/** Opportunistic sync when a page is viewed and the data is older than this. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
/** The daily cron picks up connections not synced for this long. */
const DAILY_AFTER_MS = 20 * 60 * 60 * 1000;

export type SyncOutcome = { ok: true; changedDays: number } | { ok: false; reason: "expired" | "failed" | "not-connected" };

/** Fetch, normalize and store days. Returns only the days whose data changed. */
export async function syncDays(
  userId: string,
  provider: HealthProvider,
  source: HealthProviderKind,
  days: DayKey[],
  types: HealthDataType[],
): Promise<DailyHealth[]> {
  const existing = await prisma.healthDailyMetric.findMany({
    where: { userId, date: { in: days.map(keyToDate) } },
    select: { date: true, sourceRecordHash: true, source: true },
  });
  const known = new Map(existing.map((e) => [dateToKey(e.date), e]));
  const changed: DailyHealth[] = [];

  for (const day of days) {
    const metric = normalizeDay(day, await provider.getDayRecords(day, types), types);
    const prior = known.get(day);
    if (prior && prior.sourceRecordHash === metric.sourceRecordHash && prior.source === source) continue;
    const { date, ...values } = metric;
    await prisma.healthDailyMetric.upsert({
      where: { userId_date: { userId, date: keyToDate(date) } },
      create: { userId, date: keyToDate(date), source, ...values },
      update: { source, ...values, syncedAt: new Date() },
    });
    changed.push(metric);
  }
  return changed;
}

/**
 * Feed imported metrics into the Arc: day-record metrics the user hasn't
 * entered by hand, and health-connected rules. Manual entries always win.
 */
export async function applyHealthToArc(userId: string, metrics: DailyHealth[]) {
  const arc = await getActiveArc(userId);
  if (!arc || !metrics.length) return;
  const inArc = metrics.filter((m) => m.date >= arc.startDate && m.date <= arc.today);
  if (!inArc.length) return;

  const habits = await prisma.habit.findMany({
    where: { arcId: arc.id, integrationType: { not: "NONE" } },
    select: { id: true, integrationType: true, integrationTarget: true, activeFrom: true, deactivatedOn: true },
  });

  for (const m of inArc) {
    await applyDay(arc, userId, m, habits);
  }
  await runAchievements(userId);
}

type IntegratedHabit = {
  id: string;
  integrationType: "NONE" | "STEPS" | "SLEEP" | "EXERCISE";
  integrationTarget: number | null;
  activeFrom: Date;
  deactivatedOn: Date | null;
};

async function applyDay(arc: ActiveArc, userId: string, m: DailyHealth, habits: IntegratedHabit[]) {
  const date = keyToDate(m.date);
  const where = { arcId: arc.id, userId, date };
  await ensureDailyRecord(arc, userId, m.date);

  if (arc.modules.steps && m.steps !== null) {
    await prisma.dailyRecord.updateMany({
      where: { ...where, OR: [{ steps: null }, { stepsSource: "HEALTH" }] },
      data: { steps: Math.min(m.steps, 200_000), stepsSource: "HEALTH" },
    });
  }
  if (arc.modules.sleep && m.sleepStart && m.sleepEnd) {
    await prisma.dailyRecord.updateMany({
      where: { ...where, OR: [{ bedtime: null, wakeTime: null }, { sleepSource: "HEALTH" }] },
      data: {
        bedtime: localMinutesOf(m.sleepStart, arc.timezone),
        wakeTime: localMinutesOf(m.sleepEnd, arc.timezone),
        sleepSource: "HEALTH",
      },
    });
  }
  if (arc.modules.weight && m.weight !== null) {
    await prisma.dailyRecord.updateMany({
      where: { ...where, OR: [{ weight: null }, { weightSource: "HEALTH" }] },
      data: { weight: m.weight, weightSource: "HEALTH" },
    });
  }

  const active = habits.filter((h) =>
    isHabitActiveOn({ id: h.id, activeFrom: dateToKey(h.activeFrom), deactivatedOn: h.deactivatedOn ? dateToKey(h.deactivatedOn) : null }, m.date),
  );
  if (!active.length) return;
  const logs = await prisma.habitLog.findMany({
    where: { habitId: { in: active.map((h) => h.id) }, date },
    select: { habitId: true, source: true },
  });
  const logFor = new Map(logs.map((l) => [l.habitId, l]));

  for (const h of active) {
    const met = habitMet(h, m, arc);
    if (met === null) continue; // No data for this rule's type: leave it alone.
    const log = logFor.get(h.id);
    if (log?.source === "MANUAL") continue; // The user decided; never overwrite.
    if (!log && !met) continue;
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: h.id, date } },
      create: { habitId: h.id, userId, date, completed: met, source: "HEALTH" },
      update: { completed: met, source: "HEALTH" },
    });
  }
}

/** Whether imported data completes a rule. Null when there's no data to judge. */
export function habitMet(
  h: Pick<IntegratedHabit, "integrationType" | "integrationTarget">,
  m: Pick<DailyHealth, "steps" | "sleepMinutes" | "exerciseMinutes" | "exerciseSessions">,
  arc: { goals: { stepGoal: number; sleepGoal: number } },
): boolean | null {
  switch (h.integrationType) {
    case "STEPS":
      return m.steps === null ? null : m.steps >= (h.integrationTarget ?? arc.goals.stepGoal);
    case "SLEEP":
      return m.sleepMinutes === null ? null : m.sleepMinutes >= (h.integrationTarget ?? Math.round(arc.goals.sleepGoal * 60));
    case "EXERCISE":
      if (m.exerciseSessions === null) return null;
      return m.exerciseSessions > 0 && (m.exerciseMinutes ?? 0) >= (h.integrationTarget ?? 1);
    default:
      return null;
  }
}

/** Pull recent days from Google Health for one user. */
export async function syncGoogleHealth(userId: string, opts: { initial?: boolean } = {}): Promise<SyncOutcome> {
  const conn = await prisma.healthConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE_HEALTH" } },
    select: { id: true, accessTokenEncrypted: true, refreshTokenEncrypted: true, expiresAt: true, dataTypes: true, status: true },
  });
  if (!conn || conn.status !== "ACTIVE") return { ok: false, reason: conn ? "expired" : "not-connected" };

  const arc = await getActiveArc(userId);
  const timeZone = arc?.timezone ?? "UTC";
  const today = todayKey(timeZone);
  const count = opts.initial ? INITIAL_DAYS : RECENT_DAYS;
  const days = Array.from({ length: count }, (_, i) => addDays(today, -i));
  const types = parseDataTypes(conn.dataTypes);

  try {
    const provider = new GoogleHealthProvider(conn, timeZone);
    const changed = await syncDays(userId, provider, "GOOGLE_HEALTH", days, types);
    await prisma.healthConnection.update({ where: { id: conn.id }, data: { lastSyncedAt: new Date() } });
    await applyHealthToArc(userId, changed);
    return { ok: true, changedDays: changed.length };
  } catch (error) {
    if (error instanceof HealthAuthError) {
      await prisma.healthConnection.update({ where: { id: conn.id }, data: { status: "EXPIRED" } });
      return { ok: false, reason: "expired" };
    }
    console.error("Google Health sync failed", error);
    return { ok: false, reason: "failed" };
  }
}

/** Sync when a page is viewed and the last sync is stale. Cheap no-op otherwise. */
export async function syncIfStale(userId: string) {
  const conn = await prisma.healthConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE_HEALTH" } },
    select: { status: true, lastSyncedAt: true },
  });
  if (!conn || conn.status !== "ACTIVE") return;
  if (conn.lastSyncedAt && Date.now() - conn.lastSyncedAt.getTime() < STALE_AFTER_MS) return;
  await syncGoogleHealth(userId);
}

/** The daily background sync: every active Google Health connection not synced in ~a day. */
export async function syncDueConnections(limit = 50) {
  const due = await prisma.healthConnection.findMany({
    where: {
      provider: "GOOGLE_HEALTH",
      status: "ACTIVE",
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - DAILY_AFTER_MS) } }],
    },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { userId: true },
  });
  let synced = 0;
  for (const { userId } of due) {
    const result = await syncGoogleHealth(userId);
    if (result.ok) synced++;
  }
  return { due: due.length, synced };
}

export async function disconnectHealth(userId: string, provider: HealthProviderKind) {
  if (provider === "GOOGLE_HEALTH") {
    const conn = await prisma.healthConnection.findUnique({
      where: { userId_provider: { userId, provider } },
      select: { id: true, accessTokenEncrypted: true, refreshTokenEncrypted: true, expiresAt: true },
    });
    if (conn) await new GoogleHealthProvider(conn, "UTC").disconnect();
  } else {
    await prisma.$transaction([
      prisma.healthConnection.deleteMany({ where: { userId, provider } }),
      prisma.healthDeviceToken.deleteMany({ where: { userId } }),
    ]);
  }
}

/**
 * Delete ARC's copy of imported health data. Values on day records that came
 * from a sync are cleared too; anything typed by hand stays. The user's data
 * at Google / on their phone is not touched.
 */
export async function deleteImportedHealthData(userId: string) {
  await prisma.$transaction([
    prisma.healthDailyMetric.deleteMany({ where: { userId } }),
    prisma.dailyRecord.updateMany({ where: { userId, stepsSource: "HEALTH" }, data: { steps: null, stepsSource: null } }),
    prisma.dailyRecord.updateMany({ where: { userId, sleepSource: "HEALTH" }, data: { bedtime: null, wakeTime: null, sleepSource: null } }),
    prisma.dailyRecord.updateMany({ where: { userId, weightSource: "HEALTH" }, data: { weight: null, weightSource: null } }),
    prisma.habitLog.deleteMany({ where: { userId, source: "HEALTH" } }),
  ]);
}
