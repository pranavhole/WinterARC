/**
 * Level progression. The first steps come from the product spec
 * (0, 100, 250, 500, 850); after that each level costs 100 XP more than the
 * last. A full, consistent 90-day Arc lands around level 14–16.
 */

const FIRST_STEPS = [100, 150, 250, 350];
const STEP_GROWTH = 100;
export const MAX_LEVEL = 60;

/** XP needed to reach each level, index 0 = level 1. */
export const LEVEL_THRESHOLDS: readonly number[] = (() => {
  const out = [0];
  let step = 0;
  for (let level = 2; level <= MAX_LEVEL; level++) {
    step = FIRST_STEPS[level - 2] ?? step + STEP_GROWTH;
    out.push(out[out.length - 1] + step);
  }
  return out;
})();

const TITLES = [
  "Starting out",
  "Showing up",
  "Finding rhythm",
  "Steady",
  "Committed",
  "Consistent",
  "Arc builder",
  "Disciplined",
  "Relentless",
  "Unbroken",
];

export function levelTitle(level: number): string {
  return TITLES[Math.min(level, TITLES.length) - 1] ?? TITLES[TITLES.length - 1];
}

export type LevelInfo = {
  level: number;
  title: string;
  xp: number;
  /** XP at which this level started. */
  floor: number;
  /** XP needed for the next level; null at the max level. */
  next: number | null;
  /** 0..1 progress through this level. */
  progress: number;
};

export function levelForXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let index = 0;
  while (index + 1 < LEVEL_THRESHOLDS.length && LEVEL_THRESHOLDS[index + 1] <= total) index++;
  const level = index + 1;
  const floor = LEVEL_THRESHOLDS[index];
  const next = LEVEL_THRESHOLDS[index + 1] ?? null;
  return {
    level,
    title: levelTitle(level),
    xp: total,
    floor,
    next,
    progress: next === null ? 1 : (total - floor) / (next - floor),
  };
}
