"use client";

import { useOptimistic, useTransition, useState } from "react";
import { toggleHabit } from "@/lib/actions/habits";
import { cn, formatDay, getMondayOf, getWeekDays, type DayKey } from "@/lib/utils";
import { CheckIcon } from "@/components/ui/icons";
import type { HabitCategoryValue } from "@/lib/arc-engine";

export { getMondayOf, getWeekDays };

export type HabitGridItem = {
  id: string;
  title: string;
  category: HabitCategoryValue;
  activeFrom: DayKey;
  deactivatedOn: DayKey | null;
};

type ToggleRecord = Record<string, boolean>; // key: `${habitId}:${dayKey}` -> completed

export function WeeklyHabitGrid({
  selectedDate,
  today,
  startDate,
  endDate,
  habits,
  initialDone,
}: {
  selectedDate: DayKey;
  today: DayKey;
  startDate: DayKey;
  endDate: DayKey;
  habits: HabitGridItem[];
  /** Map or record of completed items `${habitId}:${dayKey}` -> boolean */
  initialDone: Record<string, boolean>;
}) {
  const [doneState, setDoneState] = useState<ToggleRecord>(initialDone);
  const [optimisticDone, setOptimisticDone] = useOptimistic(
    doneState,
    (current, update: { key: string; completed: boolean }) => ({
      ...current,
      [update.key]: update.completed,
    })
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const weekDays = getWeekDays(selectedDate);

  const disciplineRules = habits.filter((h) => h.category === "DISCIPLINE");
  const standardHabits = habits.filter((h) => h.category !== "DISCIPLINE");

  const isHabitActive = (h: HabitGridItem, day: DayKey) => {
    if (day < h.activeFrom) return false;
    if (h.deactivatedOn && day >= h.deactivatedOn) return false;
    return day >= startDate && day <= endDate;
  };

  const handleToggle = (habitId: string, day: DayKey, currentVal: boolean) => {
    if (day < startDate || day > today) return; // Non-editable day
    const key = `${habitId}:${day}`;
    const nextVal = !currentVal;

    setError(null);
    startTransition(async () => {
      setOptimisticDone({ key, completed: nextVal });
      const res = await toggleHabit(habitId, day, nextVal);
      if (res.ok) {
        setDoneState((prev) => ({ ...prev, [key]: nextVal }));
      } else {
        setError(res.error || "Could not update habit.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[540px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th scope="col" className="pb-3 pt-1 font-medium w-48 sm:w-64">
                Rule / Habit
              </th>
              {weekDays.map((day) => {
                const isSelected = day === selectedDate;
                const isCurrentToday = day === today;
                const dayLetter = formatDay(day, { weekday: "narrow" });
                const dayNum = formatDay(day, { day: "numeric" });

                return (
                  <th
                    key={day}
                    scope="col"
                    className={cn(
                      "pb-3 pt-1 text-center font-medium w-10 sm:w-12 transition-colors",
                      isSelected && "text-fg font-semibold",
                      isCurrentToday && "text-fg underline decoration-2 underline-offset-4"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[0.6875rem] uppercase">{dayLetter}</span>
                      <span className="tabular text-xs mt-0.5">{dayNum}</span>
                    </div>
                  </th>
                );
              })}
              <th scope="col" className="pb-3 pt-1 text-right font-medium pr-2 w-14">
                Week
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {disciplineRules.length > 0 ? (
              <>
                <tr className="bg-subtle/40">
                  <td
                    colSpan={9}
                    className="py-1.5 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted"
                  >
                    Discipline Rules · 5 XP
                  </td>
                </tr>
                {disciplineRules.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    weekDays={weekDays}
                    today={today}
                    startDate={startDate}
                    selectedDate={selectedDate}
                    optimisticDone={optimisticDone}
                    isHabitActive={isHabitActive}
                    onToggle={handleToggle}
                  />
                ))}
              </>
            ) : null}

            {standardHabits.length > 0 ? (
              <>
                <tr className="bg-subtle/40">
                  <td
                    colSpan={9}
                    className="py-1.5 px-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted"
                  >
                    Habits · 10 XP
                  </td>
                </tr>
                {standardHabits.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    weekDays={weekDays}
                    today={today}
                    startDate={startDate}
                    selectedDate={selectedDate}
                    optimisticDone={optimisticDone}
                    isHabitActive={isHabitActive}
                    onToggle={handleToggle}
                  />
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  weekDays,
  today,
  startDate,
  selectedDate,
  optimisticDone,
  isHabitActive,
  onToggle,
}: {
  habit: HabitGridItem;
  weekDays: DayKey[];
  today: DayKey;
  startDate: DayKey;
  selectedDate: DayKey;
  optimisticDone: ToggleRecord;
  isHabitActive: (h: HabitGridItem, d: DayKey) => boolean;
  onToggle: (habitId: string, day: DayKey, currentVal: boolean) => void;
}) {
  let completedCount = 0;
  let activeElapsedCount = 0;

  for (const day of weekDays) {
    const active = isHabitActive(habit, day);
    const key = `${habit.id}:${day}`;
    const done = Boolean(optimisticDone[key]);
    if (active) {
      if (day <= today) activeElapsedCount++;
      if (done) completedCount++;
    }
  }

  const ratePct =
    activeElapsedCount > 0 ? Math.round((completedCount / activeElapsedCount) * 100) : null;

  return (
    <tr className="hover:bg-subtle/30 transition-colors">
      <td className="py-2.5 pr-2 font-medium text-xs sm:text-sm truncate max-w-[12rem] sm:max-w-[16rem]">
        {habit.title}
      </td>
      {weekDays.map((day) => {
        const active = isHabitActive(habit, day);
        const isEditable = active && day >= startDate && day <= today;
        const key = `${habit.id}:${day}`;
        const isDone = Boolean(optimisticDone[key]);
        const isSelected = day === selectedDate;

        return (
          <td
            key={day}
            className={cn(
              "py-2.5 px-0.5 text-center align-middle",
              isSelected && "bg-subtle/50"
            )}
          >
            {isEditable ? (
              <button
                type="button"
                onClick={() => onToggle(habit.id, day, isDone)}
                aria-label={`${habit.title} on ${day}: ${isDone ? "completed" : "not done"}`}
                suppressHydrationWarning
                data-form-type="other"
                data-lpignore="true"
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all active:scale-95",
                  isDone
                    ? "bg-fg border-fg text-bg shadow-xs"
                    : "border-line bg-surface hover:border-muted text-muted/30 hover:text-muted"
                )}
              >
                {isDone ? (
                  <CheckIcon size={13} strokeWidth={2.5} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                )}
              </button>
            ) : isDone ? (
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-fg/70 text-bg">
                <CheckIcon size={12} />
              </span>
            ) : day > today ? (
              <span className="inline-flex h-7 w-7 items-center justify-center text-xs text-muted/30">
                —
              </span>
            ) : (
              <span className="inline-flex h-7 w-7 items-center justify-center text-xs text-muted/20">
                ·
              </span>
            )}
          </td>
        );
      })}
      <td className="tabular py-2.5 pl-2 pr-2 text-right text-xs font-semibold text-muted">
        {ratePct !== null ? `${ratePct}%` : "—"}
      </td>
    </tr>
  );
}
