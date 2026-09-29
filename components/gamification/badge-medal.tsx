import type { BadgeIcon as BadgeIconKey } from "@/lib/gamification/badges";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  FlameIcon,
  ListIcon,
  MountainIcon,
  RotateIcon,
  ShieldIcon,
  StarIcon,
  StepIcon,
  TargetIcon,
  TrophyIcon,
} from "@/components/ui/icons";

const ICONS: Record<BadgeIconKey, typeof CheckIcon> = {
  step: StepIcon,
  flame: FlameIcon,
  mountain: MountainIcon,
  trophy: TrophyIcon,
  star: StarIcon,
  shield: ShieldIcon,
  target: TargetIcon,
  check: CheckIcon,
  rotate: RotateIcon,
  list: ListIcon,
};

/** A quiet medallion: solid when earned, dashed outline while locked. */
export function BadgeMedal({ icon, earned, size = 44, className }: { icon: BadgeIconKey; earned: boolean; size?: number; className?: string }) {
  const Glyph = ICONS[icon] ?? StarIcon;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        earned ? "bg-fg text-bg" : "border border-dashed border-line text-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Glyph size={Math.round(size * 0.45)} />
    </span>
  );
}
