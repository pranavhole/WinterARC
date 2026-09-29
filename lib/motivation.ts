/**
 * One short, calm message a day. Milestone days get their own line; other
 * days rotate through a small set by day number, so the same day always
 * reads the same. No shouting, no emoji.
 */

const MILESTONES: Record<number, string> = {
  1: "Start small.\nShow up.",
  7: "One week.\nThe hardest part is behind you.",
  15: "You're no longer starting.\nYou're building.",
  30: "Thirty days of proof.",
  45: "Halfway.\nKeep the same pace.",
  60: "Consistency has become identity.",
  75: "The last stretch.\nFinish the way you started.",
};

const DAILY = [
  "Do the next right thing.",
  "Small days add up.",
  "Discipline is remembering what you want.",
  "No one needs to see it. You do.",
  "Keep the promise you made to yourself.",
  "Not perfect. Just consistent.",
  "Show up, then decide how you feel.",
  "The work is the reward.",
  "One day at a time.",
  "Quiet progress is still progress.",
  "You don't need motivation. You need a start.",
  "Protect the streak by protecting today.",
];

const FINAL = "Final day.\nFinish what you started.";

export function dailyMessage(dayNumber: number, arcLength: number): { text: string; milestone: boolean } {
  if (dayNumber === arcLength) return { text: FINAL, milestone: true };
  const milestone = MILESTONES[dayNumber];
  if (milestone) return { text: milestone, milestone: true };
  return { text: DAILY[(dayNumber - 1) % DAILY.length], milestone: false };
}

export const ARC_COMPLETE_MESSAGE = "You finished what you started.";
