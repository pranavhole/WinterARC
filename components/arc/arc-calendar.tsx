import type { DayCell, DayStatus } from "@/lib/streaks";
import { addDays, cn, formatDay, keyToDate } from "@/lib/utils";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_LABEL: Record<DayStatus, string> = {
  complete: "80% or more",
  missed: "under 80%",
  today: "today, in progress",
  future: "upcoming",
  empty: "no data",
};

/** The 90 days of the Arc, month by month. Server-rendered, no JavaScript. */
export function ArcCalendar({ days }: { days: DayCell[] }) {
  const byKey = new Map(days.map((d) => [d.key, d]));
  const months: { label: string; first: string }[] = [];
  for (const day of days) {
    const label = formatDay(day.key, { month: "long", year: "numeric" });
    if (months.at(-1)?.label !== label) months.push({ label, first: day.key.slice(0, 8) + "01" });
  }

  return (
    <div className="space-y-10">
      {months.map((month) => {
        const firstDate = keyToDate(month.first);
        const leading = (firstDate.getUTCDay() + 6) % 7; // Monday-first
        const daysInMonth = new Date(
          Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0),
        ).getUTCDate();

        return (
          <section key={month.label} aria-label={month.label}>
            <h3 className="text-sm font-medium">{month.label}</h3>
            <div className="mt-4 grid grid-cols-7 gap-y-3 text-center" role="list">
              {WEEKDAYS.map((d) => (
                <span key={d} aria-hidden="true" className="text-[0.6875rem] uppercase tracking-wider text-muted">
                  {d}
                </span>
              ))}
              {Array.from({ length: leading }, (_, i) => (
                <span key={`pad-${i}`} aria-hidden="true" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const key = addDays(month.first, i);
                const cell = byKey.get(key);
                const label = formatDay(key, { month: "long", day: "numeric" });
                return (
                  <div
                    key={key}
                    role="listitem"
                    aria-label={cell ? `${label}: ${STATUS_LABEL[cell.status]}` : `${label}: outside your Arc`}
                    className="flex flex-col items-center gap-1"
                  >
                    <Marker status={cell?.status} />
                    <span className={cn("tabular text-[0.6875rem]", cell ? "text-muted" : "text-line")}>{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-xs text-muted">
        <li className="flex items-center gap-2">
          <Marker status="complete" small /> 80%+ day
        </li>
        <li className="flex items-center gap-2">
          <Marker status="missed" small /> Under 80%
        </li>
        <li className="flex items-center gap-2">
          <Marker status="empty" small /> No data
        </li>
      </ul>
    </div>
  );
}

function Marker({ status, small = false }: { status?: DayStatus; small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-7 w-7 sm:h-8 sm:w-8";
  const icon = small ? 9 : 13;
  if (status === "complete") {
    return (
      <span aria-hidden="true" className={cn(size, "flex items-center justify-center rounded-full bg-fg text-bg")}>
        <CheckIcon size={icon} strokeWidth={2.75} />
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span aria-hidden="true" className={cn(size, "flex items-center justify-center rounded-full bg-line/70 text-muted")}>
        <CloseIcon size={icon - 1} strokeWidth={2.25} />
      </span>
    );
  }
  if (status === "today") {
    return <span aria-hidden="true" className={cn(size, "rounded-full border-[1.5px] border-fg")} />;
  }
  return (
    <span aria-hidden="true" className={cn(size, "flex items-center justify-center")}>
      <span className={cn("h-1 w-1 rounded-full", status ? "bg-line" : "bg-transparent")} />
    </span>
  );
}
