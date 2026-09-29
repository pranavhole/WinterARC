import { describe, expect, it, vi } from "vitest";
import { normalizeDay } from "@/lib/health/normalize";
import { grantedTypes, parseDataTypes, scopesFor } from "@/lib/health/permissions";
import { dayRangeUtc, localMinutesOf } from "@/lib/tz";
import type { DayRecords } from "@/lib/health/types";

vi.mock("@/lib/db", () => ({ prisma: {} }));

const t = (iso: string) => new Date(iso);
const ALL = ["steps", "sleep", "exercise", "weight"] as const;

function records(): DayRecords {
  return {
    steps: [
      { id: "s1", start: t("2026-09-29T06:00:00Z"), end: t("2026-09-29T07:00:00Z"), count: 3000 },
      { id: "s2", start: t("2026-09-29T12:00:00Z"), end: t("2026-09-29T13:00:00Z"), count: 5420 },
    ],
    sleep: [{ id: "n1", start: t("2026-09-28T22:30:00Z"), end: t("2026-09-29T06:12:00Z"), minutesAsleep: 442 }],
    exercise: [{ id: "e1", start: t("2026-09-29T17:00:00Z"), end: t("2026-09-29T17:46:00Z"), minutes: 46, type: "RUNNING" }],
    weight: [
      { id: "w1", time: t("2026-09-29T07:00:00Z"), kg: 72.44 },
      { id: "w0", time: t("2026-09-29T05:00:00Z"), kg: 73.1 },
    ],
  };
}

describe("health normalization", () => {
  it("summarises a day", () => {
    expect(normalizeDay("2026-09-29", records(), [...ALL])).toMatchObject({
      steps: 8420,
      sleepMinutes: 442,
      exerciseMinutes: 46,
      exerciseSessions: 1,
      weight: 72.4,
    });
  });

  it("does not duplicate metrics when the same records arrive twice", () => {
    const once = normalizeDay("2026-09-29", records(), [...ALL]);
    const r = records();
    const doubled: DayRecords = {
      steps: [...r.steps, ...r.steps],
      sleep: [...r.sleep, ...r.sleep],
      exercise: [...r.exercise, ...r.exercise],
      weight: [...r.weight, ...r.weight],
    };
    const twice = normalizeDay("2026-09-29", doubled, [...ALL]);
    expect(twice.steps).toBe(8420);
    expect(twice.exerciseSessions).toBe(1);
    expect(twice.sourceRecordHash).toBe(once.sourceRecordHash);
  });

  it("gives the same hash regardless of record order, so re-syncs are no-ops", () => {
    const a = normalizeDay("2026-09-29", records(), [...ALL]);
    const r = records();
    const b = normalizeDay("2026-09-29", { ...r, steps: [...r.steps].reverse() }, [...ALL]);
    expect(b.sourceRecordHash).toBe(a.sourceRecordHash);
  });

  it("changes the hash when the data changes", () => {
    const a = normalizeDay("2026-09-29", records(), [...ALL]);
    const r = records();
    r.steps[0].count += 1;
    expect(normalizeDay("2026-09-29", r, [...ALL]).sourceRecordHash).not.toBe(a.sourceRecordHash);
  });

  it("ignores data types the user didn't allow", () => {
    const day = normalizeDay("2026-09-29", records(), ["steps"]);
    expect(day).toMatchObject({ steps: 8420, sleepMinutes: null, exerciseMinutes: null, weight: null });
  });
});

describe("health habits", async () => {
  const { habitMet } = await import("@/lib/health/sync");
  const arc = { goals: { stepGoal: 10000, sleepGoal: 7 } };
  const day = { steps: 10240, sleepMinutes: 400, exerciseMinutes: 46, exerciseSessions: 1 };

  it("completes only rules connected to health data", () => {
    expect(habitMet({ integrationType: "NONE", integrationTarget: null }, day, arc)).toBeNull();
    expect(habitMet({ integrationType: "STEPS", integrationTarget: null }, day, arc)).toBe(true);
    expect(habitMet({ integrationType: "STEPS", integrationTarget: 12000 }, day, arc)).toBe(false);
    expect(habitMet({ integrationType: "SLEEP", integrationTarget: null }, day, arc)).toBe(false);
    expect(habitMet({ integrationType: "EXERCISE", integrationTarget: 30 }, day, arc)).toBe(true);
  });

  it("leaves a rule alone when there's no data for it", () => {
    expect(habitMet({ integrationType: "STEPS", integrationTarget: null }, { ...day, steps: null }, arc)).toBeNull();
  });
});

describe("health permissions", () => {
  it("asks only for the scopes behind the chosen types", () => {
    expect(scopesFor(["steps", "exercise"])).toEqual(["https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly"]);
    expect(scopesFor(["sleep"])).toEqual(["https://www.googleapis.com/auth/googlehealth.sleep.readonly"]);
  });

  it("drops types whose scope was unticked on the consent screen", () => {
    expect(grantedTypes(["steps", "weight"], scopesFor(["steps"]))).toEqual(["steps"]);
  });

  it("parses only known types", () => {
    expect(parseDataTypes("steps,heart_rate sleep")).toEqual(["steps", "sleep"]);
  });
});

describe("timezones", () => {
  it("finds local midnight as a UTC instant", () => {
    const { start, end } = dayRangeUtc("2026-09-29", "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-09-28T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-29T18:30:00.000Z");
  });

  it("handles DST days", () => {
    const { start, end } = dayRangeUtc("2026-03-08", "America/New_York");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("converts instants to local minutes", () => {
    expect(localMinutesOf(t("2026-09-29T00:42:00Z"), "Asia/Kolkata")).toBe(6 * 60 + 12);
  });
});
