import Link from "next/link";
import { percent, scoreLevel } from "@/lib/scoring";
import type { DayCell } from "@/lib/streaks";
import { cn, formatDay, type DayKey } from "@/lib/utils";

// Neutral steps of the foreground color, lightest to darkest.
const LEVEL_CLASS = [
  "bg-subtle text-muted",
  "bg-fg/15 text-fg",
  "bg-fg/35 text-fg",
  "bg-fg/65 text-bg",
  "bg-fg text-bg",
] as const;

/** Every day of the Arc; click a day to open it. */
export function ArcHeatmap({ days, selected, today }: { days: DayCell[]; selected: DayKey; today: DayKey }) {
  return (
    <div>
      <ol className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
        {days.map((d) => {
          const future = d.status === "future";
          const label = `Day ${d.index + 1}, ${formatDay(d.key, { month: "long", day: "numeric" })}: ${
            future ? "upcoming" : d.score === null ? "no data" : `${percent(d.score)} complete`
          }`;
          return (
            <li key={d.key}>
              <Link
                href={d.key === today ? "/arc" : `/arc?date=${d.key}`}
                scroll={false}
                aria-label={label}
                aria-current={d.key === selected ? "date" : undefined}
                title={label}
                className={cn(
                  "tabular flex aspect-square items-center justify-center rounded-[5px] text-[0.625rem] transition-opacity hover:opacity-80",
                  future ? "border border-line text-muted/70" : LEVEL_CLASS[scoreLevel(d.score)],
                  d.key === today && "ring-1 ring-fg ring-offset-1 ring-offset-bg",
                  d.key === selected && "outline-2 outline-offset-2 outline-fg",
                )}
              >
                {d.index + 1}
              </Link>
            </li>
          );
        })}
      </ol>
      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.75rem] text-muted" aria-label="Legend">
        {[
          ["No data", 0],
          ["Under 50%", 1],
          ["50–79%", 2],
          ["80–99%", 3],
          ["100%", 4],
        ].map(([label, level]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-3 w-3 rounded-[3px]", LEVEL_CLASS[level as number])} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
