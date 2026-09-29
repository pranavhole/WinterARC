/**
 * The badge registry. Badges are earned from real Arc behaviour, judged on the
 * server (lib/gamification/achievements.ts). Each badge reports progress so a
 * locked badge can show "12 / 30".
 */

import { XP } from "@/lib/gamification/xp";
import type { AchievementSnapshot } from "@/lib/gamification/snapshot";

export const BADGE_CATEGORIES = ["STARTER", "CONSISTENCY", "LONG_RUN", "MASTERY", "FINISHER"] as const;
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

export const BADGE_ICONS = ["step", "flame", "mountain", "trophy", "star", "shield", "target", "check", "rotate", "list"] as const;
export type BadgeIcon = (typeof BADGE_ICONS)[number];

export type BadgeProgress = { current: number; target: number };

export type BadgeDefinition = {
  key: string;
  name: string;
  description: string;
  /** Short line for the unlock moment. */
  unlockLine: string;
  icon: BadgeIcon;
  category: BadgeCategory;
  xpReward: number;
  /** Major badges offer sharing when they unlock. */
  major: boolean;
  progress: (s: AchievementSnapshot) => BadgeProgress;
};

const count = (current: number, target: number): BadgeProgress => ({ current: Math.min(current, target), target });
const flag = (done: boolean): BadgeProgress => ({ current: done ? 1 : 0, target: 1 });

export const BADGES: readonly BadgeDefinition[] = [
  {
    key: "FIRST_STEP",
    name: "First Day",
    description: "Complete your first Arc day.",
    unlockLine: "The first day is the hardest one.\nYou did it.",
    icon: "step",
    category: "STARTER",
    xpReward: 25,
    major: false,
    progress: (s) => count(s.completedDays, 1),
  },
  {
    key: "EARLY_START",
    name: "Early Start",
    description: "Reach 80% on Day 1 of your Arc.",
    unlockLine: "You didn't wait for Monday.",
    icon: "star",
    category: "STARTER",
    xpReward: 25,
    major: false,
    progress: (s) => flag(s.firstDayComplete),
  },
  {
    key: "FIRST_WEEK",
    name: "First Week",
    description: "Complete 7 Arc days.",
    unlockLine: "Seven days of proof.",
    icon: "check",
    category: "STARTER",
    xpReward: 50,
    major: false,
    progress: (s) => count(s.completedDays, 7),
  },
  {
    key: "SEVEN_DAY_STREAK",
    name: "7 Day Discipline",
    description: "Keep a 7 day streak.",
    unlockLine: "You've shown up\nfor 7 days straight.",
    icon: "flame",
    category: "CONSISTENCY",
    xpReward: XP.STREAK_7,
    major: true,
    progress: (s) => count(s.bestStreak, 7),
  },
  {
    key: "FOURTEEN_DAY_STREAK",
    name: "14 Day Discipline",
    description: "Keep a 14 day streak.",
    unlockLine: "Two weeks without a break.",
    icon: "flame",
    category: "CONSISTENCY",
    xpReward: XP.STREAK_14,
    major: false,
    progress: (s) => count(s.bestStreak, 14),
  },
  {
    key: "THIRTY_DAY_STREAK",
    name: "30 Day Discipline",
    description: "Keep a 30 day streak.",
    unlockLine: "Thirty days of keeping\npromises to yourself.",
    icon: "flame",
    category: "CONSISTENCY",
    xpReward: XP.STREAK_30,
    major: true,
    progress: (s) => count(s.bestStreak, 30),
  },
  {
    key: "SIXTY_DAY_STREAK",
    name: "60 Day Discipline",
    description: "Keep a 60 day streak.",
    unlockLine: "Consistency has become identity.",
    icon: "flame",
    category: "CONSISTENCY",
    xpReward: XP.STREAK_60,
    major: true,
    progress: (s) => count(s.bestStreak, 60),
  },
  {
    key: "PERFECT_WEEK",
    name: "Perfect Week",
    description: "Seven days in a row at 100%.",
    unlockLine: "Every rule. Every day. For a week.",
    icon: "star",
    category: "CONSISTENCY",
    xpReward: 150,
    major: true,
    progress: (s) => count(s.bestPerfectRun, 7),
  },
  {
    key: "CONSISTENCY",
    name: "Consistency",
    description: "Average 80% or more over your first 21 days.",
    unlockLine: "Not perfect. Just consistent.",
    icon: "check",
    category: "CONSISTENCY",
    xpReward: 150,
    major: false,
    progress: (s) => (s.dayNumber < 21 ? count(s.dayNumber, 21) : flag((s.averageCompletion ?? 0) >= 0.8)),
  },
  {
    key: "COMEBACK",
    name: "Comeback",
    description: "Miss a day, then complete the next three.",
    unlockLine: "Missing a day isn't the end.\nComing back is what counts.",
    icon: "rotate",
    category: "CONSISTENCY",
    xpReward: 50,
    major: false,
    progress: (s) => flag(s.cameBack),
  },
  {
    key: "HALFWAY",
    name: "Halfway",
    description: "Reach the middle of your Arc.",
    unlockLine: "You're no longer starting.\nYou're building.",
    icon: "mountain",
    category: "LONG_RUN",
    xpReward: 100,
    major: false,
    progress: (s) => count(s.dayNumber, Math.ceil(s.arcLength / 2)),
  },
  {
    key: "THIRTY_DAYS",
    name: "30 Days In",
    description: "Complete 30 Arc days.",
    unlockLine: "Thirty days of proof.",
    icon: "mountain",
    category: "LONG_RUN",
    xpReward: 150,
    major: true,
    progress: (s) => count(s.completedDays, 30),
  },
  {
    key: "SIXTY_DAYS_STRONG",
    name: "60 Days Strong",
    description: "Complete 60 Arc days.",
    unlockLine: "Sixty days. This is who you are now.",
    icon: "mountain",
    category: "LONG_RUN",
    xpReward: 300,
    major: true,
    progress: (s) => count(s.completedDays, 60),
  },
  {
    key: "FOCUS_WEEK",
    name: "Focus Week",
    description: "Meet your focus goal seven days in a row.",
    unlockLine: "A week of deep work.",
    icon: "target",
    category: "MASTERY",
    xpReward: 100,
    major: false,
    progress: (s) => count(s.bestFocusRun, 7),
  },
  {
    key: "HABIT_MASTER",
    name: "Habit Master",
    description: "Complete one rule on 30 days.",
    unlockLine: "One rule, thirty times.\nIt's a habit now.",
    icon: "check",
    category: "MASTERY",
    xpReward: 150,
    major: false,
    progress: (s) => count(s.bestHabitDays, 30),
  },
  {
    key: "DISCIPLINE_MASTER",
    name: "Discipline Master",
    description: "Keep every discipline rule on 30 days.",
    unlockLine: "Thirty days of saying no.",
    icon: "shield",
    category: "MASTERY",
    xpReward: 200,
    major: true,
    progress: (s) => count(s.disciplineDays, 30),
  },
  {
    key: "TASK_MASTER",
    name: "Task Master",
    description: "Finish 100 tasks.",
    unlockLine: "A hundred things done.",
    icon: "list",
    category: "MASTERY",
    xpReward: 100,
    major: false,
    progress: (s) => count(s.tasksCompleted, 100),
  },
  {
    key: "NINETY_DAY_FINISHER",
    name: "Arc Finisher",
    description: "Complete the full Arc.",
    unlockLine: "You finished what you started.",
    icon: "trophy",
    category: "FINISHER",
    xpReward: XP.ARC_COMPLETED,
    major: true,
    // Today is still in progress, so only the days before it count toward the finish.
    progress: (s) =>
      s.arcFinished ? count(s.arcLength, s.arcLength) : { current: Math.min(s.dayNumber - 1, s.arcLength - 1), target: s.arcLength },
  },
];

export const BADGE_BY_KEY = new Map(BADGES.map((b) => [b.key, b]));

export function isEarned(p: BadgeProgress): boolean {
  return p.current >= p.target;
}

/** Keys of every badge the snapshot satisfies. */
export function earnedBadgeKeys(s: AchievementSnapshot): string[] {
  return BADGES.filter((b) => isEarned(b.progress(s))).map((b) => b.key);
}
