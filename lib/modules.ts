/**
 * Tracking modules an Arc can use. Habits are commitments; modules are
 * measurements (steps, sleep…), tasks and reflection. Each Arc only shows the
 * modules it has enabled, so the dashboard stays personal.
 */

export const MODULE_KEYS = ["steps", "weight", "sleep", "focus", "dsa", "tasks", "journal"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];
export type ArcModules = Record<ModuleKey, boolean>;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  steps: "Steps",
  weight: "Weight",
  sleep: "Sleep",
  focus: "Focus",
  dsa: "DSA problems",
  tasks: "Tasks",
  journal: "Journal",
};

export const FOCUS_KINDS = ["STUDY", "CODING", "READING", "CREATIVE", "CAREER"] as const;
export type FocusKind = (typeof FOCUS_KINDS)[number];

export const NO_MODULES: ArcModules = {
  steps: false,
  weight: false,
  sleep: false,
  focus: false,
  dsa: false,
  tasks: false,
  journal: false,
};

/** Tolerant read of the JSON column: unknown keys are dropped, missing keys are off. */
export function parseModules(value: unknown): ArcModules {
  const out = { ...NO_MODULES };
  if (value && typeof value === "object") {
    for (const key of MODULE_KEYS) out[key] = (value as Record<string, unknown>)[key] === true;
  }
  // DSA only makes sense as part of focused work.
  if (!out.focus) out.dsa = false;
  return out;
}

export function parseFocusKind(value: unknown): FocusKind | null {
  return typeof value === "string" && (FOCUS_KINDS as readonly string[]).includes(value)
    ? (value as FocusKind)
    : null;
}

/** "Study" when the Arc is about studying or coding, otherwise the neutral "Focus". */
export function focusLabel(kind: FocusKind | null): { section: string; metric: string } {
  if (kind === "STUDY") return { section: "Study", metric: "Study" };
  if (kind === "CODING") return { section: "Study", metric: "Coding practice" };
  if (kind === "READING") return { section: "Focus", metric: "Reading & learning" };
  if (kind === "CREATIVE") return { section: "Focus", metric: "Creative work" };
  return { section: "Focus", metric: "Focused time" };
}

export type ArcGoals = {
  stepGoal: number;
  sleepGoal: number;
  focusGoalWeekday: number;
  focusGoalWeekend: number;
  dsaGoal: number;
};

export const GOAL_LIMITS = {
  stepGoal: { min: 1000, max: 100000 },
  sleepGoal: { min: 4, max: 12 },
  focusGoal: { min: 0.5, max: 16 },
  dsaGoal: { min: 1, max: 30 },
  arcLength: { min: 7, max: 365 },
} as const;
