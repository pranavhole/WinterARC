import Link from "next/link";
import { formatDuration, formatSteps } from "@/lib/metrics";
import { percent, scoreLevel } from "@/lib/scoring";
import type { DayCell } from "@/lib/streaks";
import type { BadgeIcon } from "@/lib/gamification/badges";
import { cn, formatDay, type DayKey } from "@/lib/utils";
import { DashCard } from "@/components/arc/dashboard/card";
import { BadgeGlyph } from "@/components/gamification/badge-medal";
import { SyncButton } from "@/components/health/sync-button";
import {
  ActivityIcon,
  BadgeIcon as BadgesIcon,
  ChevronRightIcon,
  DumbbellIcon,
  FlameIcon,
  LockIcon,
  MoonIcon,
  ScaleIcon,
  StepIcon,
  TodayIcon,
} from "@/components/ui/icons";

// ─── 90 Day Journey ──────────────────────────────────────────────────────────

const LEVEL = ["bg-line/70", "bg-[#c9c6ba]", "bg-[#a7a496]", "bg-[#7d7a6c]", "bg-[#4f4d44]"] as const;

export function JourneyStrip({ days, today, selected }: { days: DayCell[]; today: DayKey; selected: DayKey }) {
  const reached = days.filter((d) => d.key <= today).length;
  return (
    <DashCard
      icon={TodayIcon}
      title={`${days.length} Day Journey`}
      aside={
        <span className="tabular text-xs text-muted">
          {reached} / {days.length}
        </span>
      }
      href="/arc/progress"
    >
      <ol className="flex flex-wrap gap-[5px]">
        {days.map((d) => {
          const label = `Day ${d.index + 1}, ${formatDay(d.key, { month: "short", day: "numeric" })}: ${
            d.status === "future" ? "upcoming" : d.score === null ? "no data" : `${percent(d.score)}`
          }`;
          return (
            <li key={d.key}>
              <Link
                href={d.key === today ? "/arc" : `/arc?date=${d.key}`}
                prefetch={false}
                scroll={false}
                title={label}
                aria-label={label}
                aria-current={d.key === selected ? "date" : undefined}
                className={cn(
                  "block h-3 w-3 rounded-[3px] transition-opacity hover:opacity-70",
                  d.status === "future" ? "bg-line/45" : LEVEL[scoreLevel(d.score)],
                  d.key === today && "ring-1 ring-fg ring-offset-1 ring-offset-bg",
                  d.key === selected && d.key !== today && "outline outline-1 outline-offset-1 outline-fg",
                )}
              />
            </li>
          );
        })}
      </ol>
    </DashCard>
  );
}

// ─── Today (health) ──────────────────────────────────────────────────────────

export type TodayMetrics = {
  steps: number | null;
  stepGoal: number;
  sleepMinutes: number | null;
  sleepGoalMinutes: number;
  exerciseMinutes: number | null;
  weight: number | null;
};

export function TodayHealthCard({
  metrics,
  syncedAt,
  connected,
  expired,
  canSync,
  timeZone,
}: {
  metrics: TodayMetrics;
  syncedAt: Date | null;
  connected: boolean;
  expired: boolean;
  canSync: boolean;
  timeZone: string;
}) {
  const time = syncedAt ? syncedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone }) : null;
  const status = expired ? (
    <Link href="/arc/settings#health" prefetch={false} className="text-[0.6875rem] text-muted underline underline-offset-2">
      Reconnect
    </Link>
  ) : connected ? (
    <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6f9a6a]" aria-hidden="true" />
      {time ? `Synced · ${time}` : "Connected"}
    </span>
  ) : (
    <Link href="/arc/settings#health" prefetch={false} className="text-[0.6875rem] text-muted underline underline-offset-2 hover:text-fg">
      Connect Health
    </Link>
  );

  const rows = [
    { icon: StepIcon, label: "Steps", value: metrics.steps !== null ? `${formatSteps(metrics.steps)} / ${formatSteps(metrics.stepGoal)}` : "—", ratio: metrics.steps !== null ? metrics.steps / metrics.stepGoal : 0 },
    { icon: MoonIcon, label: "Sleep", value: metrics.sleepMinutes !== null ? formatDuration(metrics.sleepMinutes) : "—", ratio: metrics.sleepMinutes !== null ? metrics.sleepMinutes / metrics.sleepGoalMinutes : 0 },
    { icon: DumbbellIcon, label: "Exercise", value: metrics.exerciseMinutes !== null ? `${metrics.exerciseMinutes} min` : "—", ratio: metrics.exerciseMinutes !== null ? metrics.exerciseMinutes / 60 : 0 },
    { icon: ScaleIcon, label: "Weight", value: metrics.weight !== null ? `${metrics.weight.toFixed(1)} kg` : "—", ratio: null },
  ];

  return (
    <DashCard icon={ActivityIcon} title="Today" aside={status}>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3.5 py-2.5 first:pt-0 last:pb-0">
            <r.icon size={19} className="shrink-0 text-fg/80" />
            <div className="w-24 shrink-0">
              <p className="text-[0.6875rem] text-muted">{r.label}</p>
              <p className="tabular text-[0.8125rem] font-medium">{r.value}</p>
            </div>
            {r.ratio !== null ? (
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
                <span className="block h-full rounded-full bg-[#8a8778]" style={{ width: `${Math.round(Math.min(1, Math.max(0, r.ratio)) * 100)}%` }} />
              </span>
            ) : (
              <span className="flex-1" />
            )}
          </li>
        ))}
      </ul>
      {canSync ? (
        <div className="mt-3 text-right">
          <SyncButton />
        </div>
      ) : null}
    </DashCard>
  );
}

// ─── Arc Progress ────────────────────────────────────────────────────────────

export function ArcProgressCard({ score, streak, level, xp }: { score: number | null; streak: number; level: number; xp: number }) {
  const pct = Math.round((score ?? 0) * 100);
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <DashCard icon={FlameIcon} title="Arc Progress" href="/arc/progress">
      <div className="flex items-center gap-5">
        <div className="relative h-[5.25rem] w-[5.25rem] shrink-0" role="img" aria-label={`Today ${pct}% complete`}>
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="#3b3a35"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - Math.min(1, pct / 100))}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <span className="tabular absolute inset-0 flex items-center justify-center text-lg font-semibold">{score === null ? "—" : `${pct}%`}</span>
        </div>
        <dl className="min-w-0 space-y-2.5 border-l border-line pl-5 text-[0.6875rem] font-medium tracking-[0.12em]">
          <div>
            <dt className="sr-only">Streak</dt>
            <dd className="tabular">{streak} DAY STREAK</dd>
          </div>
          <div>
            <dt className="sr-only">Level</dt>
            <dd className="tabular">LEVEL {level}</dd>
          </div>
          <div>
            <dt className="sr-only">XP</dt>
            <dd className="tabular">{xp.toLocaleString("en-US")} XP</dd>
          </div>
        </dl>
      </div>
    </DashCard>
  );
}

// ─── Recent Badges ───────────────────────────────────────────────────────────

const HEX = "polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

export function RecentBadges({ earned, lockedCount }: { earned: { key: string; name: string; icon: BadgeIcon }[]; lockedCount: number }) {
  const slots = 6;
  const shown = earned.slice(0, slots);
  const locked = Math.min(lockedCount, slots - shown.length);
  return (
    <DashCard
      icon={BadgesIcon}
      title="Recent Badges"
      aside={
        <Link href="/badges" prefetch={false} className="flex items-center gap-0.5 text-[0.6875rem] text-muted hover:text-fg">
          View all <ChevronRightIcon size={12} />
        </Link>
      }
    >
      <ul className="flex flex-wrap gap-2.5">
        {shown.map((b) => (
          <li key={b.key} title={b.name}>
            <span
              className="flex h-11 w-10 items-center justify-center bg-gradient-to-b from-[#b08a5a] to-[#6e5234] text-[#f6ead8] shadow-sm"
              style={{ clipPath: HEX }}
            >
              <BadgeGlyph icon={b.icon} size={17} />
            </span>
            <span className="sr-only">{b.name}</span>
          </li>
        ))}
        {Array.from({ length: locked }, (_, i) => (
          <li key={`locked-${i}`}>
            <span className="flex h-11 w-10 items-center justify-center bg-line/70 text-muted" style={{ clipPath: HEX }}>
              <LockIcon size={14} />
            </span>
            <span className="sr-only">Locked badge</span>
          </li>
        ))}
      </ul>
      {!shown.length ? <p className="mt-3 text-xs text-muted">Complete a day at 80% to earn your first.</p> : null}
    </DashCard>
  );
}
