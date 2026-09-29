/**
 * Inline-SVG charts. Server-rendered, no chart library.
 *
 * The SVG only draws shapes and stretches to its box (non-scaling strokes);
 * every label is HTML in rem, so charts stay crisp and readable at any width
 * and follow the app's type scale.
 */

import { formatDuration } from "@/lib/metrics";
import { cn, formatDay, type DayKey } from "@/lib/utils";

export type BarDay = { key: DayKey; value: number | null; met?: boolean };

export function DailyBars({
  days,
  goal,
  goalLabel,
  max,
  caption,
  label,
  height = "h-28",
}: {
  days: BarDay[];
  /** Draws a dashed reference line. */
  goal?: number | null;
  goalLabel?: string;
  /** Fixed top of the scale, e.g. 100 for percentages. */
  max?: number;
  caption?: string;
  /** Screen-reader summary. */
  label: string;
  height?: string;
}) {
  const n = days.length;
  const top = max ?? Math.max((goal ?? 0) * 1.3, ...days.map((d) => d.value ?? 0), 1);
  const pct = (v: number) => Math.min(100, (v / top) * 100);
  const goalPct = goal ? pct(goal) : null;
  const barW = n > 40 ? 0.7 : 0.56;

  return (
    <figure>
      <div className={cn("relative", height)}>
        <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
          <line x1={0} x2={n} y1={99.5} y2={99.5} vectorEffect="non-scaling-stroke" strokeWidth={1} className="stroke-line" />
          {days.map((d, i) => {
            const x = i + (1 - barW) / 2;
            if (d.value === null || d.value <= 0) {
              return <rect key={d.key} x={x} y={97} width={barW} height={3} className="fill-line" />;
            }
            const h = Math.max(pct(d.value), 2);
            return (
              <rect
                key={d.key}
                x={x}
                y={100 - h}
                width={barW}
                height={h}
                className={d.met === false ? "fill-muted/45" : "fill-fg"}
              />
            );
          })}
          {goalPct !== null ? (
            <line
              x1={0}
              x2={n}
              y1={100 - goalPct}
              y2={100 - goalPct}
              vectorEffect="non-scaling-stroke"
              strokeWidth={1}
              strokeDasharray="4 4"
              className="stroke-fg/60"
            />
          ) : null}
        </svg>
        {goalPct !== null && goalLabel ? (
          <span
            className="absolute right-0 -translate-y-full pb-0.5 text-[0.6875rem] text-muted"
            style={{ top: `${100 - goalPct}%` }}
          >
            {goalLabel}
          </span>
        ) : null}
      </div>
      <div className="tabular mt-1.5 flex justify-between text-[0.6875rem] text-muted" aria-hidden="true">
        <span>{formatDay(days[0].key, { month: "short", day: "numeric" })}</span>
        {n > 6 ? <span>{formatDay(days[Math.floor(n / 2)].key, { month: "short", day: "numeric" })}</span> : null}
        <span>{formatDay(days[n - 1].key, { month: "short", day: "numeric" })}</span>
      </div>
      {caption ? <figcaption className="mt-1 text-[0.75rem] text-muted">{caption}</figcaption> : null}
    </figure>
  );
}

export function SleepChart({
  nights,
  goal,
  height,
}: {
  nights: { key: DayKey; minutes: number | null }[];
  goal: number;
  height?: string;
}) {
  const logged = nights.filter((n) => n.minutes !== null);
  const avg = logged.length ? logged.reduce((s, n) => s + n.minutes!, 0) / logged.length : null;
  return (
    <div className="mt-5">
      <DailyBars
        height={height}
        days={nights.map((n) => ({
          key: n.key,
          value: n.minutes === null ? null : n.minutes / 60,
          met: n.minutes !== null && n.minutes / 60 >= goal,
        }))}
        goal={goal}
        goalLabel={`Goal ${formatDuration(goal * 60)}`}
        label={`Sleep over the last ${nights.length} days. ${logged.length} nights logged, average ${formatDuration(avg)}, goal ${formatDuration(goal * 60)}.`}
        caption={`Last ${nights.length} nights${avg !== null ? ` · average ${formatDuration(avg)}` : ""}`}
      />
    </div>
  );
}

export function WeightTrend({ entries, height = "h-24" }: { entries: { key: DayKey; weight: number }[]; height?: string }) {
  if (entries.length < 2) return null;
  const values = entries.map((e) => e.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const x = (i: number) => (i / (entries.length - 1)) * 100;
  const y = (w: number) => 8 + (1 - (w - min) / span) * 84;
  const points = entries.map((e, i) => `${x(i).toFixed(2)},${y(e.weight).toFixed(2)}`).join(" ");
  const first = entries[0];
  const last = entries[entries.length - 1];

  return (
    <figure className="mt-5">
      <div className={cn("relative", height)}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label={`Weight trend over ${entries.length} entries, from ${first.weight.toFixed(1)} kg to ${last.weight.toFixed(1)} kg.`}
        >
          <line x1={0} x2={100} y1={99.5} y2={99.5} vectorEffect="non-scaling-stroke" strokeWidth={1} className="stroke-line" />
          <polyline
            points={points}
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-fg"
          />
        </svg>
        <span
          aria-hidden="true"
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
          style={{ left: "100%", top: `${y(last.weight)}%` }}
        />
      </div>
      <figcaption className="tabular mt-1.5 flex justify-between text-[0.6875rem] text-muted">
        <span>{formatDay(first.key, { month: "short", day: "numeric" })}</span>
        <span>
          {entries.length} entries · {min.toFixed(1)}–{max.toFixed(1)} kg
        </span>
        <span>{formatDay(last.key, { month: "short", day: "numeric" })}</span>
      </figcaption>
    </figure>
  );
}
