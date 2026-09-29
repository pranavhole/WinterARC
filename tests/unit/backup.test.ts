import { describe, expect, it } from "vitest";
import { parseBackup, BACKUP_VERSION } from "@/lib/backup";

const VALID_ARC = {
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  arc: {
    startDate: "2026-09-01",
    endDate: "2026-11-29",
    status: "ACTIVE",
    statement: "Winter Arc transformation",
    timezone: "UTC",
    modules: { sleep: true, tasks: true, journal: true },
    focusKind: "CODING",
    stepGoal: 10000,
    sleepGoal: 8,
    focusGoalWeekday: 2,
    focusGoalWeekend: 3,
    dsaGoal: 2,
  },
  assessment: { focus: "Coding", goal: "Discipline" },
  habits: [
    {
      ref: "h1",
      title: "Cold Shower",
      description: "2 min cold shower",
      category: "DISCIPLINE",
      reason: null,
      position: 0,
      active: true,
      activeFrom: "2026-09-01",
      deactivatedOn: null,
    },
  ],
  habitLogs: [{ habit: "h1", date: "2026-09-01", completed: true }],
  dailyRecords: [
    {
      date: "2026-09-01",
      steps: 12000,
      weight: 75,
      studyHours: 2.5,
      dsaProblems: 2,
      bedtime: 1380,
      wakeTime: 360,
      sleepQuality: 5,
      journal: "Great first day",
      stepGoal: 10000,
      sleepGoal: 8,
      focusGoal: 2,
      dsaGoal: 2,
      trackTasks: true,
    },
  ],
  tasks: [
    {
      ref: "t1",
      date: "2026-09-01",
      title: "Solve Two Sum",
      note: null,
      startTime: 600,
      duration: 30,
      completed: true,
      carriedFrom: null,
      carriedTo: null,
    },
  ],
  timeBlocks: [],
};

describe("ARC backup parser", () => {
  it("parses valid v1 backup without new fields and defaults them", () => {
    const v1Backup = { ...VALID_ARC, version: 1 };
    const res = parseBackup(JSON.stringify(v1Backup));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backup.posts).toEqual([]);
    expect(res.backup.xpLedger).toEqual([]);
    expect(res.backup.badges).toEqual([]);
    expect(res.backup.healthMetrics).toEqual([]);
  });

  it("parses valid backup with posts, xp, badges, and health data", () => {
    const fullBackup = {
      ...VALID_ARC,
      posts: [
        {
          type: "PROGRESS",
          content: "Day 1 completed with full focus!",
          visibility: "PUBLIC",
          milestoneType: null,
          badgeKey: null,
          dayNumber: 1,
          arcLength: 90,
          streak: 1,
          createdAt: "2026-09-01T20:00:00.000Z",
        },
      ],
      xpLedger: [
        {
          type: "DayCompleted",
          amount: 25,
          referenceType: "Day",
          referenceId: "2026-09-01",
          key: "day:2026-09-01",
          createdAt: "2026-09-01T21:00:00.000Z",
        },
      ],
      badges: [
        {
          badgeKey: "FIRST_STEP",
          earnedAt: "2026-09-01T21:00:00.000Z",
        },
      ],
      healthMetrics: [
        {
          date: "2026-09-01",
          steps: 12500,
          sleepMinutes: 480,
          sleepStart: "2026-08-31T23:00:00.000Z",
          sleepEnd: "2026-09-01T07:00:00.000Z",
          exerciseMinutes: 45,
          exerciseSessions: 1,
          weight: 75.2,
          source: "GOOGLE_HEALTH",
          syncedAt: "2026-09-01T08:00:00.000Z",
        },
      ],
    };

    const res = parseBackup(JSON.stringify(fullBackup));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.backup.posts).toHaveLength(1);
    expect(res.backup.posts[0].content).toBe("Day 1 completed with full focus!");
    expect(res.backup.xpLedger).toHaveLength(1);
    expect(res.backup.badges).toHaveLength(1);
    expect(res.backup.badges[0].badgeKey).toBe("FIRST_STEP");
    expect(res.backup.healthMetrics).toHaveLength(1);
    expect(res.backup.healthMetrics[0].steps).toBe(12500);
  });

  it("rejects invalid JSON and corrupted payloads", () => {
    expect(parseBackup("not a json").ok).toBe(false);
    expect(parseBackup("").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...VALID_ARC, arc: { ...VALID_ARC.arc, startDate: "invalid" } })).ok).toBe(false);
  });

  it("rejects duplicate habit/task refs or dangling pointers", () => {
    const broken = {
      ...VALID_ARC,
      habitLogs: [{ habit: "missing-h", date: "2026-09-01", completed: true }],
    };
    expect(parseBackup(JSON.stringify(broken)).ok).toBe(false);
  });
});

