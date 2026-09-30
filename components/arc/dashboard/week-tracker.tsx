"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleHabit } from "@/lib/actions/habits";
import { cn, formatDay, type DayKey } from "@/lib/utils";
import { CheckIcon } from "@/components/ui/icons";

export type WeekRow = { id: string; title: string; activeFrom: DayKey; deactivatedOn: DayKey | null };

type Done = Record<string, boolean>; // `${id}:${day}` → completed

/**
 * One week (Mon–Sun) of rules. "habits" draws checkboxes and a weekly progress
 * bar; "discipline" draws the compact dot row. Taps save optimistically and any
 * day from the Arc start up to today can be changed.
 */
export function WeekTracker({
  variant,
  rows,
  weekDays,
  today,
  startDate,
  endDate,
  initialDone,
  empty,
}: {
  variant: "habits" | "discipline";
  rows: WeekRow[];
  weekDays: DayKey[];
  today: DayKey;
  startDate: DayKey;
  endDate: DayKey;
  initialDone: Done;
  empty: string;
}) {
  const [done, setDone] = useState<Done>(initialDone);
  const [shown, apply] = useOptimistic(done, (s, u: { key: string; value: boolean }) => ({ ...s, [u.key]: u.value }));
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const active = (r: WeekRow, day: DayKey) =>
    day >= r.activeFrom && (!r.deactivatedOn || day < r.deactivatedOn) && day >= startDate && day <= endDate;

  const toggle = (r: WeekRow, day: DayKey) => {
    const key = `${r.id}:${day}`;
    const value = !shown[key];
    setError(null);
    start(async () => {
      apply({ key, value });
      const res = await toggleHabit(r.id, day, value);
      if (res.ok) setDone((s) => ({ ...s, [key]: value }));
      else setError(res.error);
    });
  };

  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;

  const dayHeaders = weekDays.map((day) => (
    <span
      key={day}
      className={cn("text-center text-[0.6875rem] font-medium", day === today ? "text-fg" : "text-muted")}
      title={formatDay(day, { weekday: "long", month: "short", day: "numeric" })}
    >
      {formatDay(day, { weekday: "narrow" })}
    </span>
  ));

  if (variant === "discipline") {
    return (
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5">
          <span />
          <span className="grid grid-cols-7 gap-1.5">{dayHeaders}</span>
          {rows.map((r) => (
            <Row key={r.id} title={r.title}>
              <span className="grid grid-cols-7 gap-1.5">
                {weekDays.map((day) => {
                  const on = !!shown[`${r.id}:${day}`];
                  const can = active(r, day) && day <= today;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!can}
                      onClick={() => toggle(r, day)}
                      aria-label={`${r.title}, ${formatDay(day, { weekday: "long" })}: ${on ? "kept" : "not kept"}`}
                      aria-pressed={on}
                      className="flex h-5 w-5 items-center justify-center disabled:cursor-default"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors",
                          on ? "bg-fg/70" : day > today || !active(r, day) ? "bg-line/60" : "bg-line hover:bg-fg/30",
                        )}
                      />
                    </button>
                  );
                })}
              </span>
            </Row>
          ))}
        </div>
        {error ? <p className="mt-3 text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="grid min-w-[30rem] grid-cols-[minmax(7rem,1fr)_auto_7.5rem] items-center gap-x-4">
        <span className="pb-2 text-[0.6875rem] text-muted">Habits</span>
        <span className="grid grid-cols-7 gap-2 pb-2">{dayHeaders}</span>
        <span className="pb-2 text-center text-[0.6875rem] text-muted">Progress</span>
        {rows.map((r) => {
          const days = weekDays.filter((d) => active(r, d));
          const count = days.filter((d) => shown[`${r.id}:${d}`]).length;
          const pct = days.length ? Math.round((count / days.length) * 100) : 0;
          return (
            <Row key={r.id} title={r.title} border>
              <span className="grid grid-cols-7 gap-2 border-t border-line py-2">
                {weekDays.map((day) => {
                  const on = !!shown[`${r.id}:${day}`];
                  const can = active(r, day) && day <= today;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!can}
                      onClick={() => toggle(r, day)}
                      aria-label={`${r.title}, ${formatDay(day, { weekday: "long" })}: ${on ? "done" : "not done"}`}
                      aria-pressed={on}
                      className={cn(
                        "flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-[4px] border transition-colors disabled:cursor-default",
                        on ? "border-fg bg-fg text-bg" : can ? "border-muted/60 bg-surface hover:border-fg" : "border-line bg-transparent",
                      )}
                    >
                      {on ? <CheckIcon size={12} strokeWidth={2.6} /> : null}
                    </button>
                  );
                })}
              </span>
              <span className="flex items-center gap-2.5 border-t border-line py-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70" role="progressbar" aria-label={`${r.title} this week`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span className="block h-full rounded-full bg-[#8a8778] transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </span>
                <span className="tabular w-8 text-right text-[0.6875rem] text-muted">{pct}%</span>
              </span>
            </Row>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-xs">{error}</p> : null}
    </div>
  );
}

function Row({ title, border, children }: { title: string; border?: boolean; children: React.ReactNode }) {
  return (
    <>
      <span className={cn("truncate text-sm", border && "border-t border-line py-2.5")} title={title}>
        {title}
      </span>
      {children}
    </>
  );
}
