/**
 * Deterministic Arc generation. No AI, no randomness: the same answers always
 * produce the same Arc.
 *
 * 1. Every candidate rule collects points from the answers that call for it.
 * 2. Rules that mean the same thing share a group, and only one per group survives.
 * 3. Difficulty and current consistency decide how many rules (3–6) are kept.
 * 4. Kept rules are ordered through the day: work → body → mind → evening.
 */

import type { AssessmentAnswers } from "@/lib/assessment";
import { NO_MODULES, type ArcGoals, type ArcModules, type FocusKind, type ModuleKey } from "@/lib/modules";

export const HABIT_CATEGORIES = [
  "HEALTH",
  "FITNESS",
  "FOCUS",
  "CAREER",
  "LEARNING",
  "SLEEP",
  "DISCIPLINE",
  "MENTAL",
  "DIGITAL",
  "LIFESTYLE",
  "CUSTOM",
] as const;

export type HabitCategoryValue = (typeof HABIT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<HabitCategoryValue, string> = {
  HEALTH: "Health",
  FITNESS: "Fitness",
  FOCUS: "Focus",
  CAREER: "Career",
  LEARNING: "Learning",
  SLEEP: "Sleep",
  DISCIPLINE: "Discipline",
  MENTAL: "Mental",
  DIGITAL: "Digital",
  LIFESTYLE: "Lifestyle",
  CUSTOM: "Custom",
};

export type GeneratedHabit = {
  title: string;
  description: string;
  category: HabitCategoryValue;
  /** Which answers led to this rule, in plain words. */
  reason?: string;
};

export type GeneratedArc = {
  statement: string;
  habits: GeneratedHabit[];
  modules: ArcModules;
  focusKind: FocusKind;
  goals: ArcGoals;
};

export const MIN_HABITS = 3;
/** Rules picked from the answers. */
export const MAX_GENERATED_HABITS = 6;
/** Including the Winter Arc defaults and anything the user adds. */
export const MAX_HABITS = 8;

/**
 * Every Winter Arc starts with these two. They are ordinary rules: the user can
 * change the time, rename them or remove them.
 */
export const WINTER_ARC_DEFAULTS: GeneratedHabit[] = [
  {
    title: "Wake up at 5:30",
    description: "Out of bed by 5:30. No snooze.",
    category: "DISCIPLINE",
    reason: "A Winter Arc default. Change the time or remove it if it doesn't fit your life.",
  },
  {
    title: "Cold shower",
    description: "Finish with at least 30 seconds of cold water.",
    category: "HEALTH",
    reason: "A Winter Arc default. Remove it if you prefer.",
  },
];

type RuleId =
  | "deepWork"
  | "startBeforeReady"
  | "movement"
  | "reading"
  | "controlScroll"
  | "offline"
  | "journal"
  | "planTomorrow"
  | "eatWithIntention"
  | "noJunkFood"
  | "morningRoutine"
  | "keepOnePromise"
  | "protectSleep";

type Rule = {
  id: RuleId;
  /** Rules in the same group overlap; only the strongest one is kept. */
  group: string;
  /** Every number and phrase comes from the answers. */
  build: (a: AssessmentAnswers) => Omit<GeneratedHabit, "reason">;
};

const hoursLabel = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Number.isInteger(minutes / 60) ? minutes / 60 : (minutes / 60).toFixed(1)}h`;

/** Minutes of focused work per day, from Q6 (capacity) and Q13 (difficulty). */
export function focusMinutes(a: AssessmentAnswers): number {
  const easy = a.difficulty === "SUSTAINABLE";
  const hard = a.difficulty === "DEMANDING";
  switch (a.focus) {
    case "30_MIN":
      return 30;
    case "1_HOUR":
      return easy ? 45 : 60;
    case "2_HOURS":
      return easy ? 60 : hard ? 120 : 90;
    case "3_PLUS_HOURS":
      return easy ? 90 : hard ? 180 : 120;
  }
}

// Order here is the order rules appear in the Arc (roughly through the day).
const RULES: Rule[] = [
  {
    id: "morningRoutine",
    group: "morning",
    build: (a) => ({
      title: "Morning routine",
      description:
        a.scrolling === "1_2_HOURS" || a.scrolling === "2_PLUS_HOURS"
          ? "Water, daylight and your plan before you open your phone."
          : "Start every day the same way: water, daylight, and a plan.",
      category: "LIFESTYLE",
    }),
  },
  {
    id: "deepWork",
    group: "focus",
    build: (a) => {
      const minutes = focusMinutes(a);
      const time = hoursLabel(minutes);
      const titles: Record<AssessmentAnswers["focusKind"], string> = {
        STUDY: `${time} of study`,
        CODING: `${time} coding practice`,
        READING: `${time} of deep reading`,
        CREATIVE: `${time} of creative work`,
        CAREER: `${time} deep work`,
      };
      const parts: string[] = [];
      if (minutes >= 90) parts.push(`Two blocks of ${hoursLabel(minutes / 2)}, phone in another room.`);
      else parts.push("One block, one task, no distractions.");
      if (a.focusKind === "CODING") parts.push("Start with your DSA problems, then build.");
      if (a.obstacle === "PROCRASTINATION") parts.push("Do it before any entertainment. Start before you feel ready.");
      return {
        title: titles[a.focusKind],
        description: parts.join(" "),
        category:
          a.focusKind === "STUDY" || a.focusKind === "READING"
            ? "LEARNING"
            : a.focusKind === "CREATIVE"
              ? "FOCUS"
              : "CAREER",
      };
    },
  },
  {
    id: "startBeforeReady",
    group: "focus",
    build: () => ({
      title: "Start before you feel ready",
      description: "Complete one focused session before entertainment.",
      category: "DISCIPLINE",
    }),
  },
  {
    id: "movement",
    group: "body",
    build: (a) => {
      const base = { ALMOST_NEVER: 15, ONE_TWO: 20, THREE_FOUR: 30, ALMOST_DAILY: 45 }[a.activity];
      const extra = a.difficulty === "DEMANDING" ? 15 : a.difficulty === "CHALLENGING" ? 10 : 0;
      const minutes = Math.min(60, base + extra);
      return {
        title: `${minutes} min movement`,
        description:
          a.activity === "ALMOST_NEVER"
            ? "A walk counts. Start easy and keep the streak, not the intensity."
            : "Walk, train, run, stretch, or any intentional movement.",
        category: "FITNESS",
      };
    },
  },
  {
    id: "reading",
    group: "learning",
    build: (a) => {
      const pages = a.difficulty === "DEMANDING" ? 20 : a.difficulty === "CHALLENGING" ? 15 : 10;
      return {
        title: `Read ${pages} pages`,
        description: a.growth.includes("CAREER")
          ? "Something that makes you better at your work."
          : "Or 20 minutes of learning something that matters to you.",
        category: "LEARNING",
      };
    },
  },
  {
    id: "controlScroll",
    group: "digital",
    build: (a) => ({
      title: "Control the scroll",
      description:
        a.scrolling === "2_PLUS_HOURS"
          ? "Under 45 minutes of mindless scrolling. No phone for the first hour of the day."
          : a.scrolling === "1_2_HOURS"
            ? "Under 30 minutes of mindless scrolling. No phone for the first hour of the day."
            : "No phone for the first 30 minutes of the day.",
      category: "DIGITAL",
    }),
  },
  {
    id: "offline",
    group: "quiet",
    build: (a) => {
      const minutes = a.difficulty === "DEMANDING" ? 20 : a.difficulty === "CHALLENGING" ? 15 : 10;
      return {
        title: `${minutes} minutes offline`,
        description: `Spend ${minutes} quiet minutes without screens or distractions.`,
        category: "MENTAL",
      };
    },
  },
  {
    id: "eatWithIntention",
    group: "food",
    build: () => ({
      title: "Eat with intention",
      description: "Choose what you eat today instead of defaulting.",
      category: "LIFESTYLE",
    }),
  },
  {
    id: "noJunkFood",
    group: "food",
    build: () => ({
      title: "No junk food",
      description: "Skip the processed snacks and sugary drinks today.",
      category: "LIFESTYLE",
    }),
  },
  {
    id: "keepOnePromise",
    group: "promise",
    build: () => ({
      title: "Keep one promise",
      description: "Complete the most important rule of your Arc today.",
      category: "DISCIPLINE",
    }),
  },
  {
    id: "journal",
    group: "reflect",
    build: (a) => ({
      title: "Journal",
      description: a.growth.includes("CONFIDENCE")
        ? "Write a few honest lines, including one thing you did well."
        : "Write a few honest lines about the day.",
      category: "MENTAL",
    }),
  },
  {
    id: "planTomorrow",
    group: "plan",
    build: () => ({
      title: "Plan tomorrow",
      description: "Before bed, write down the one thing that matters most tomorrow.",
      category: "DISCIPLINE",
    }),
  },
  {
    id: "protectSleep",
    group: "sleep",
    build: (a) => ({
      title: "Protect your sleep",
      description:
        a.sleep === "POOR" || a.obstacle === "POOR_SLEEP"
          ? "Screens off 30 minutes before bed. In bed at your planned time."
          : a.sleep === "INCONSISTENT"
            ? "Same bedtime every night, weekends included."
            : "Be in bed at your planned time.",
      category: "SLEEP",
    }),
  },
];

// Point weights. An explicit daily commitment is the strongest signal:
// the user said they are willing to do it every day.
const W = { commit: 5, goal: 4, strong: 4, growth: 3, nonNegotiable: 2, weak: 1 } as const;

const GOAL_WORDS: Record<AssessmentAnswers["primaryGoal"], string> = {
  BODY: "your body",
  DISCIPLINE: "discipline",
  CAREER: "your career",
  MENTAL_CLARITY: "mental clarity",
  LIFESTYLE: "your lifestyle",
  EVERYTHING: "a bit of everything",
};

const goalReason = (g: AssessmentAnswers["primaryGoal"]) =>
  g === "EVERYTHING" ? "you want to change a little of everything" : `you want to change ${GOAL_WORDS[g]} most`;

type Contribution = { points: number; why: string };

/** Points per rule, plus which answers gave them (used to explain the rule). */
function score(a: AssessmentAnswers) {
  const s = Object.fromEntries(RULES.map((r) => [r.id, 0])) as Record<RuleId, number>;
  const why = Object.fromEntries(RULES.map((r) => [r.id, [] as Contribution[]])) as Record<RuleId, Contribution[]>;
  const add = (id: RuleId, points: number, reason: string) => {
    s[id] += points;
    why[id].push({ points, why: reason });
  };
  const goal = goalReason(a.primaryGoal);

  // Primary goal
  switch (a.primaryGoal) {
    case "BODY":
      add("movement", W.goal, goal);
      add("eatWithIntention", W.weak, goal);
      add("noJunkFood", W.weak, goal);
      add("protectSleep", W.weak, goal);
      break;
    case "DISCIPLINE":
      add("keepOnePromise", W.goal, goal);
      add("startBeforeReady", W.weak, goal);
      break;
    case "CAREER":
      add("deepWork", W.goal, goal);
      add("reading", W.weak, goal);
      break;
    case "MENTAL_CLARITY":
      add("offline", W.goal, goal);
      add("journal", W.weak, goal);
      break;
    case "LIFESTYLE":
      add("morningRoutine", W.growth, goal);
      add("protectSleep", W.growth, goal);
      add("eatWithIntention", W.weak, goal);
      add("movement", W.weak, goal);
      add("offline", W.weak, goal);
      break;
    case "EVERYTHING":
      add("deepWork", W.growth, goal);
      add("movement", W.growth, goal);
      add("reading", W.growth, goal);
      add("protectSleep", W.weak, goal);
      break;
  }

  // Consistency. Start-stop patterns benefit from a single anchor.
  if (a.consistency === "START_STOP") {
    add("keepOnePromise", W.weak, "you tend to start strong, then stop");
    add("morningRoutine", W.weak, "you tend to start strong, then stop");
  }

  // Obstacle
  switch (a.obstacle) {
    case "SOCIAL_MEDIA":
      add("controlScroll", W.strong, "social media gets in your way");
      break;
    case "LOW_ENERGY":
      add("protectSleep", W.growth, "low energy gets in your way");
      add("movement", W.weak, "low energy gets in your way");
      add("noJunkFood", W.weak, "low energy gets in your way");
      break;
    case "POOR_SLEEP":
      add("protectSleep", W.strong, "poor sleep gets in your way");
      break;
    case "PROCRASTINATION":
      add("startBeforeReady", W.strong, "procrastination gets in your way");
      break;
    case "NO_CLEAR_PLAN":
      add("planTomorrow", W.strong, "not having a clear plan gets in your way");
      break;
    case "LACK_OF_MOTIVATION":
      add("keepOnePromise", W.growth, "motivation comes and goes");
      break;
  }

  if (a.sleep === "POOR" || a.sleep === "INCONSISTENT")
    add("protectSleep", W.strong, `your sleep is ${a.sleep === "POOR" ? "poor" : "inconsistent"}`);
  if (a.activity === "ALMOST_NEVER" || a.activity === "ONE_TWO")
    add("movement", W.weak, "you're not very active yet");
  if (a.scrolling === "1_2_HOURS") add("controlScroll", W.growth, "you scroll 1–2 hours a day");
  if (a.scrolling === "2_PLUS_HOURS") add("controlScroll", W.strong, "you scroll 2+ hours a day");

  // Growth areas
  for (const g of a.growth) {
    if (g === "FITNESS") add("movement", W.growth, "you want to build fitness");
    if (g === "CAREER") add("deepWork", W.growth, "you want to build your career");
    if (g === "KNOWLEDGE") add("reading", W.growth, "you want to build knowledge");
    if (g === "CONFIDENCE") {
      add("keepOnePromise", W.weak, "you want to build confidence");
      add("journal", W.weak, "you want to build confidence");
    }
    if (g === "ROUTINES") {
      add("morningRoutine", W.growth, "you want to build routines");
      add("planTomorrow", W.growth, "you want to build routines");
      add("protectSleep", W.weak, "you want to build routines");
    }
    if (g === "MENTAL_CLARITY") add("offline", W.growth, "you want mental clarity");
  }

  // Daily commitments
  for (const c of a.commitments) {
    if (c === "MOVEMENT") add("movement", W.commit, "you're willing to move every day");
    if (c === "READ") add("reading", W.commit, "you're willing to read every day");
    if (c === "DEEP_WORK") add("deepWork", W.commit, "you're willing to do deep work every day");
    if (c === "JOURNAL") add("journal", W.commit, "you're willing to journal every day");
    if (c === "LIMIT_SOCIAL") add("controlScroll", W.commit, "you're willing to limit social media");
    if (c === "SLEEP_ON_TIME") add("protectSleep", W.commit, "you're willing to sleep on time");
    if (c === "EAT_INTENTIONALLY") add("eatWithIntention", W.commit, "you're willing to eat intentionally");
  }

  // Non-negotiables
  for (const n of a.nonNegotiables) {
    if (n === "SLEEP") add("protectSleep", W.nonNegotiable, "sleep is non-negotiable for you");
    if (n === "HEALTH") add("movement", W.nonNegotiable, "health is non-negotiable for you");
    if (n === "WORK") add("deepWork", W.nonNegotiable, "work is non-negotiable for you");
    if (n === "LEARNING") add("reading", W.nonNegotiable, "learning is non-negotiable for you");
    if (n === "PERSONAL_TIME") add("offline", W.weak, "personal time is non-negotiable for you");
  }

  // Deep work carries the "start before you feel ready" idea when procrastination
  // is the obstacle, so it absorbs that score and its reasons.
  if (s.deepWork > 0 && s.startBeforeReady > 0) {
    s.deepWork += s.startBeforeReady;
    why.deepWork.push(...why.startBeforeReady);
    s.startBeforeReady = 0;
  }

  // "Keep one promise" points at the other rules, so it should never outrank
  // a concrete rule the user explicitly committed to.
  s.keepOnePromise = Math.min(s.keepOnePromise, W.goal);

  return { points: s, why };
}

/** "Because you said you scroll 2+ hours a day and social media gets in your way." */
function explain(contributions: Contribution[]): string {
  const seen = new Set<string>();
  const top = [...contributions]
    .sort((x, y) => y.points - x.points)
    .filter((c) => (seen.has(c.why) ? false : (seen.add(c.why), true)))
    .slice(0, 2)
    .map((c) => c.why);
  return top.length ? `Because ${top.join(" and ")}.` : "";
}

function targetCount(a: AssessmentAnswers): number {
  const [low, high] =
    a.difficulty === "DEMANDING" ? [5, 6] : a.difficulty === "CHALLENGING" ? [4, 5] : [3, 4];
  const steady = a.consistency === "FAIRLY_CONSISTENT" || a.consistency === "DISCIPLINED";
  return steady ? high : low;
}

// When answers point at too few rules, fill from what the main goal needs most.
const GOAL_FALLBACK: Record<AssessmentAnswers["primaryGoal"], RuleId[]> = {
  BODY: ["movement", "protectSleep", "noJunkFood"],
  DISCIPLINE: ["morningRoutine", "planTomorrow", "protectSleep"],
  CAREER: ["deepWork", "reading", "planTomorrow"],
  MENTAL_CLARITY: ["offline", "journal", "protectSleep"],
  LIFESTYLE: ["morningRoutine", "protectSleep", "eatWithIntention"],
  EVERYTHING: ["movement", "deepWork", "protectSleep"],
};

export function buildStatement(futureSelf: string, primaryGoal: AssessmentAnswers["primaryGoal"]): string {
  let text = futureSelf.replace(/\s+/g, " ").trim().replace(/[.!\s]+$/, "");
  if (!text) {
    const defaults: Record<AssessmentAnswers["primaryGoal"], string> = {
      BODY: "I am becoming someone who takes care of my body.",
      DISCIPLINE: "I am becoming someone who keeps promises to myself.",
      CAREER: "I am becoming someone who does focused, meaningful work.",
      MENTAL_CLARITY: "I am becoming someone with a clear and quiet mind.",
      LIFESTYLE: "I am becoming someone who lives with intention.",
      EVERYTHING: "I am becoming someone who shows up every day.",
    };
    return defaults[primaryGoal];
  }
  if (/^someone\b/i.test(text)) text = `I am becoming s${text.slice(1)}`;
  else if (/^(i|i'm|i am)\b/i.test(text)) text = text.charAt(0).toUpperCase() + text.slice(1);
  else if (/^(a|an|the)\b/i.test(text)) text = `I am becoming ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  else text = `I am becoming ${text}`;
  return `${text}.`;
}

export function generateArc(answers: AssessmentAnswers): GeneratedArc {
  const { points, why } = score(answers);
  const target = Math.min(MAX_GENERATED_HABITS, Math.max(MIN_HABITS, targetCount(answers)));

  // Strongest rule per overlap group. Ties go to the earlier rule in RULES.
  const bestInGroup = new Map<string, Rule>();
  for (const rule of RULES) {
    if (points[rule.id] <= 0) continue;
    const current = bestInGroup.get(rule.group);
    if (!current || points[rule.id] > points[current.id]) bestInGroup.set(rule.group, rule);
  }

  const ranked = [...bestInGroup.values()].sort(
    (x, y) => points[y.id] - points[x.id] || RULES.indexOf(x) - RULES.indexOf(y),
  );
  const chosen = ranked.slice(0, target);

  const usedGroups = new Set(chosen.map((r) => r.group));
  for (const id of GOAL_FALLBACK[answers.primaryGoal]) {
    if (chosen.length >= MIN_HABITS) break;
    const rule = RULES.find((r) => r.id === id)!;
    if (!usedGroups.has(rule.group)) {
      chosen.push(rule);
      usedGroups.add(rule.group);
      why[rule.id].push({ points: 0, why: goalReason(answers.primaryGoal) });
    }
  }

  chosen.sort((x, y) => RULES.indexOf(x) - RULES.indexOf(y));

  return {
    statement: buildStatement(answers.futureSelf, answers.primaryGoal),
    habits: [
      ...WINTER_ARC_DEFAULTS,
      ...chosen.map((r) => ({ ...r.build(answers), reason: explain(why[r.id]) })),
    ],
    ...generateTracking(answers),
  };
}

/**
 * Which tracking modules fit these answers, and their starting goals.
 * Same idea as the rules: score, then keep only the strongest few so the
 * dashboard stays small.
 */
export function generateTracking(a: AssessmentAnswers): Pick<GeneratedArc, "modules" | "focusKind" | "goals"> {
  const s: Record<Exclude<ModuleKey, "dsa">, number> = { steps: 0, weight: 0, sleep: 0, focus: 0, tasks: 0, journal: 0 };
  const goal = a.primaryGoal;
  const has = <T,>(list: T[], v: T) => list.includes(v);

  if (goal === "BODY") { s.steps += 4; s.weight += 4; s.sleep += 2; }
  if (goal === "CAREER") { s.focus += 4; s.tasks += 3; s.sleep += 3; }
  if (goal === "MENTAL_CLARITY") { s.journal += 4; s.sleep += 3; }
  if (goal === "DISCIPLINE") { s.tasks += 2; s.sleep += 1; }
  if (goal === "LIFESTYLE") { s.sleep += 3; s.steps += 1; s.journal += 1; }
  if (goal === "EVERYTHING") { s.steps += 3; s.sleep += 3; s.focus += 3; s.tasks += 3; s.journal += 3; }

  if (has(a.growth, "FITNESS")) { s.steps += 3; s.weight += 2; }
  if (has(a.growth, "CAREER")) s.focus += 3;
  if (has(a.growth, "KNOWLEDGE")) s.focus += 2;
  if (has(a.growth, "CONFIDENCE")) s.journal += 2;
  if (has(a.growth, "ROUTINES")) s.tasks += 2;
  if (has(a.growth, "MENTAL_CLARITY")) s.journal += 2;

  if (has(a.commitments, "MOVEMENT")) s.steps += 3;
  if (has(a.commitments, "DEEP_WORK")) s.focus += 3;
  if (has(a.commitments, "JOURNAL")) s.journal += 4;
  if (has(a.commitments, "SLEEP_ON_TIME")) s.sleep += 3;

  if (a.sleep === "POOR" || a.sleep === "INCONSISTENT") s.sleep += 4;
  if (a.obstacle === "POOR_SLEEP") s.sleep += 4;
  if (a.obstacle === "LOW_ENERGY") s.sleep += 2;
  if (a.obstacle === "NO_CLEAR_PLAN") s.tasks += 4;
  if (a.obstacle === "PROCRASTINATION") { s.tasks += 2; s.focus += 2; }
  if (a.activity === "ALMOST_NEVER" || a.activity === "ONE_TWO") s.steps += 1;
  if (a.focusKind === "STUDY" || a.focusKind === "CODING") s.focus += 2;

  if (has(a.nonNegotiables, "SLEEP")) s.sleep += 3;
  if (has(a.nonNegotiables, "HEALTH")) s.steps += 1;
  if (has(a.nonNegotiables, "WORK")) s.focus += 2;
  if (has(a.nonNegotiables, "LEARNING")) s.focus += 1;

  // Weight is only offered to people who asked for body or fitness change.
  if (goal !== "BODY" && !has(a.growth, "FITNESS")) s.weight = 0;

  const limit = a.difficulty === "SUSTAINABLE" ? 4 : 5;
  const order = ["sleep", "steps", "focus", "tasks", "journal", "weight"] as const;
  const picked = [...order]
    .filter((k) => s[k] >= 3)
    .sort((x, y) => s[y] - s[x] || order.indexOf(x) - order.indexOf(y))
    .slice(0, limit);

  const modules: ArcModules = { ...NO_MODULES };
  for (const k of picked) modules[k] = true;
  modules.dsa = modules.focus && a.focusKind === "CODING";

  // Same amount as the focus rule, in half-hour steps. Weekends can hold more.
  const half = (h: number) => Math.max(0.5, Math.round(h * 2) / 2);
  const focusHours = half(focusMinutes(a) / 60);
  return {
    modules,
    focusKind: a.focusKind,
    goals: {
      stepGoal: a.activity === "ALMOST_NEVER" ? 7000 : 10000,
      sleepGoal: 7.5,
      focusGoalWeekday: focusHours,
      focusGoalWeekend: a.difficulty === "SUSTAINABLE" ? focusHours : Math.min(16, half(focusHours * 1.5)),
      dsaGoal: a.difficulty === "DEMANDING" ? 3 : a.difficulty === "CHALLENGING" ? 2 : 1,
    },
  };
}
