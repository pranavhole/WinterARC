/**
 * The ARC assessment. Pure configuration + validation, safe to import on the
 * client (for the question flow) and the server (to re-validate answers).
 */

type Option<V extends string> = { value: V; label: string };

const options = <const V extends string>(list: ReadonlyArray<readonly [V, string]>) =>
  list.map(([value, label]) => ({ value, label })) as Option<V>[];

export const PRIMARY_GOALS = options([
  ["BODY", "Body"],
  ["DISCIPLINE", "Discipline"],
  ["CAREER", "Career"],
  ["MENTAL_CLARITY", "Mental clarity"],
  ["LIFESTYLE", "Lifestyle"],
  ["EVERYTHING", "A little bit of everything"],
] as const);

export const CONSISTENCY = options([
  ["START_STOP", "I start strong, then stop"],
  ["INCONSISTENT", "Inconsistent"],
  ["FAIRLY_CONSISTENT", "Fairly consistent"],
  ["DISCIPLINED", "Disciplined"],
] as const);

export const OBSTACLES = options([
  ["SOCIAL_MEDIA", "Social media"],
  ["LOW_ENERGY", "Low energy"],
  ["POOR_SLEEP", "Poor sleep"],
  ["PROCRASTINATION", "Procrastination"],
  ["NO_CLEAR_PLAN", "No clear plan"],
  ["LACK_OF_MOTIVATION", "Lack of motivation"],
  ["NOTHING_SPECIFIC", "Nothing specific"],
] as const);

export const SLEEP = options([
  ["POOR", "Poor"],
  ["INCONSISTENT", "Inconsistent"],
  ["OKAY", "Okay"],
  ["GOOD", "Good"],
] as const);

export const ACTIVITY = options([
  ["ALMOST_NEVER", "Almost never"],
  ["ONE_TWO", "1–2 days a week"],
  ["THREE_FOUR", "3–4 days a week"],
  ["ALMOST_DAILY", "Almost daily"],
] as const);

export const FOCUS = options([
  ["30_MIN", "30 minutes"],
  ["1_HOUR", "1 hour"],
  ["2_HOURS", "2 hours"],
  ["3_PLUS_HOURS", "3+ hours"],
] as const);

export const FOCUS_KIND = options([
  ["STUDY", "Study"],
  ["CODING", "Coding or interview prep"],
  ["READING", "Reading and learning"],
  ["CREATIVE", "Creative work"],
  ["CAREER", "Career work"],
] as const);

export const SCROLLING = options([
  ["UNDER_30", "Under 30 minutes"],
  ["30_60", "30–60 minutes"],
  ["1_2_HOURS", "1–2 hours"],
  ["2_PLUS_HOURS", "2+ hours"],
] as const);

export const GROWTH = options([
  ["FITNESS", "Fitness"],
  ["CAREER", "Career"],
  ["KNOWLEDGE", "Knowledge"],
  ["CONFIDENCE", "Confidence"],
  ["ROUTINES", "Routines"],
  ["MENTAL_CLARITY", "Mental clarity"],
] as const);

export const COMMITMENTS = options([
  ["MOVEMENT", "Move my body"],
  ["READ", "Read"],
  ["DEEP_WORK", "Deep work"],
  ["JOURNAL", "Journal"],
  ["LIMIT_SOCIAL", "Limit social media"],
  ["SLEEP_ON_TIME", "Sleep on time"],
  ["EAT_INTENTIONALLY", "Eat intentionally"],
] as const);

export const NON_NEGOTIABLES = options([
  ["SLEEP", "Sleep"],
  ["HEALTH", "Health"],
  ["WORK", "Work"],
  ["LEARNING", "Learning"],
  ["RELATIONSHIPS", "Relationships"],
  ["PERSONAL_TIME", "Personal time"],
] as const);

export const DIFFICULTY = options([
  ["SUSTAINABLE", "Sustainable"],
  ["CHALLENGING", "Challenging"],
  ["DEMANDING", "Demanding"],
] as const);

type Values<T extends Option<string>[]> = T[number]["value"];

export type AssessmentAnswers = {
  primaryGoal: Values<typeof PRIMARY_GOALS>;
  consistency: Values<typeof CONSISTENCY>;
  obstacle: Values<typeof OBSTACLES>;
  sleep: Values<typeof SLEEP>;
  activity: Values<typeof ACTIVITY>;
  focus: Values<typeof FOCUS>;
  focusKind: Values<typeof FOCUS_KIND>;
  scrolling: Values<typeof SCROLLING>;
  growth: Values<typeof GROWTH>[];
  commitments: Values<typeof COMMITMENTS>[];
  futureSelf: string;
  nonNegotiables: Values<typeof NON_NEGOTIABLES>[];
  difficulty: Values<typeof DIFFICULTY>;
};

export type QuestionKey = keyof AssessmentAnswers;

type BaseQuestion = { key: QuestionKey; title: string; hint?: string };

export type Question =
  | (BaseQuestion & { type: "single"; options: Option<string>[]; icons?: boolean })
  | (BaseQuestion & { type: "multi"; options: Option<string>[] })
  | (BaseQuestion & { type: "text"; placeholder: string; maxLength: number });

export const FUTURE_SELF_MAX = 200;

export const QUESTIONS: Question[] = [
  {
    key: "primaryGoal",
    type: "single",
    title: "What do you want to change most over the next 90 days?",
    options: PRIMARY_GOALS,
    icons: true,
  },
  {
    key: "consistency",
    type: "single",
    title: "How would you describe your current consistency?",
    options: CONSISTENCY,
  },
  { key: "obstacle", type: "single", title: "What usually gets in your way?", options: OBSTACLES },
  { key: "sleep", type: "single", title: "How is your sleep currently?", options: SLEEP },
  { key: "activity", type: "single", title: "How active are you currently?", options: ACTIVITY },
  {
    key: "focus",
    type: "single",
    title: "How much focused work can you realistically give yourself daily?",
    options: FOCUS,
  },
  {
    key: "focusKind",
    type: "single",
    title: "What will that focused time go to?",
    options: FOCUS_KIND,
  },
  {
    key: "scrolling",
    type: "single",
    title: "How much time do you spend mindlessly scrolling?",
    options: SCROLLING,
  },
  {
    key: "growth",
    type: "multi",
    title: "What do you want to build?",
    hint: "Choose all that apply.",
    options: GROWTH,
  },
  {
    key: "commitments",
    type: "multi",
    title: "What are you willing to do every day?",
    hint: "Choose all that apply.",
    options: COMMITMENTS,
  },
  {
    key: "futureSelf",
    type: "text",
    title: "90 days from now, who do you want to be?",
    placeholder: "Someone who...",
    maxLength: FUTURE_SELF_MAX,
  },
  {
    key: "nonNegotiables",
    type: "multi",
    title: "What are you unwilling to compromise?",
    hint: "Your Arc will work around these.",
    options: NON_NEGOTIABLES,
  },
  {
    key: "difficulty",
    type: "single",
    title: "How hard should your Arc be?",
    hint: "Consistency beats intensity.",
    options: DIFFICULTY,
  },
];

export type DraftAnswers = Partial<AssessmentAnswers>;

export const DEFAULT_DRAFT: DraftAnswers = { difficulty: "SUSTAINABLE" };

export function isAnswered(q: Question, draft: DraftAnswers): boolean {
  const value = draft[q.key];
  if (q.type === "text") return true; // optional; a default statement is used when empty
  if (q.type === "multi") return Array.isArray(value) && value.length > 0;
  return typeof value === "string" && value.length > 0;
}

/** Strictly validate untrusted input into a complete AssessmentAnswers object. */
export function parseAnswers(input: unknown): AssessmentAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const q of QUESTIONS) {
    const value = raw[q.key];
    if (q.type === "text") {
      if (value !== undefined && typeof value !== "string") return null;
      out[q.key] = (value ?? "").trim().slice(0, q.maxLength);
      continue;
    }
    const allowed = new Set(q.options.map((o) => o.value));
    if (q.type === "single") {
      if (typeof value !== "string" || !allowed.has(value)) return null;
      out[q.key] = value;
    } else {
      if (!Array.isArray(value) || value.length === 0) return null;
      if (!value.every((v) => typeof v === "string" && allowed.has(v))) return null;
      out[q.key] = Array.from(new Set(value as string[]));
    }
  }
  return out as AssessmentAnswers;
}
