import type { LevelInfo } from "@/lib/gamification/levels";
import { ProgressBar } from "@/components/ui/progress-bar";

/** LEVEL 7 · ARC BUILDER · 1,240 XP · ████──── · 160 XP to Level 8 */
export function LevelMeter({ info, compact = false }: { info: LevelInfo; compact?: boolean }) {
  const toNext = info.next === null ? null : info.next - info.xp;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em]">
          Level {info.level}
          {compact ? null : <span className="ml-2 text-muted">{info.title}</span>}
        </p>
        <p className="tabular text-xs text-muted">{info.xp.toLocaleString("en-US")} XP</p>
      </div>
      <ProgressBar value={info.progress} label={`Progress to level ${info.level + 1}`} className="mt-2" thin />
      {toNext !== null && !compact ? (
        <p className="tabular mt-2 text-xs text-muted">
          {toNext.toLocaleString("en-US")} XP to Level {info.level + 1}
        </p>
      ) : null}
    </div>
  );
}
