"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toggleHabit } from "@/lib/actions/habits";
import { carryTasksForward, deleteTask, toggleTask, updateTask, addTask } from "@/lib/actions/tasks";
import type { ActionResult } from "@/lib/actions/context";
import type { HabitCategoryValue } from "@/lib/arc-engine";
import type { TaskView } from "@/lib/arc";
import { formatDuration, minutesToTime } from "@/lib/metrics";
import { blockLength, isNow, type BlockView } from "@/lib/timetable";
import { cn, formatDay, numberWord } from "@/lib/utils";
import { ArrowRightIcon, CheckIcon, CloseIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";
import { AddHabitInline } from "@/components/arc/add-habit";
import { TaskForm, taskTiming, type TaskFields } from "@/components/arc/day/task-form";

export type AgendaHabit = {
  id: string;
  title: string;
  description: string | null;
  category: HabitCategoryValue;
  completed: boolean;
  /** Completed by a health sync rather than a tap. A tap takes over. */
  viaHealth?: boolean;
};

export type AgendaMood = "first-day" | "late" | "after-miss" | "normal" | "past" | "future";

type Change =
  | { type: "habit"; id: string; completed: boolean }
  | { type: "task"; id: string; completed: boolean }
  | { type: "task-update"; id: string; fields: TaskFields }
  | { type: "task-delete"; id: string };

type State = { habits: AgendaHabit[]; tasks: TaskView[] };

type Entry =
  | { kind: "block"; key: string; start: number; end: number; block: BlockView; habit: AgendaHabit | null }
  | { kind: "task"; key: string; start: number; end: number | null; task: TaskView };

/**
 * The whole day as one list: timetable blocks (a block linked to a rule is that
 * rule's checkbox), timed tasks in time order, then anything unscheduled.
 */
export function DayAgenda({
  date,
  dayNumber,
  mood,
  habits,
  tasks,
  blocks,
  tasksEnabled,
  canAddHabit,
  canCarry,
  nowMinutes,
}: {
  date: string;
  dayNumber: number;
  mood: AgendaMood;
  habits: AgendaHabit[];
  tasks: TaskView[];
  /** Blocks for this date, in time order. */
  blocks: BlockView[];
  tasksEnabled: boolean;
  canAddHabit: boolean;
  canCarry: boolean;
  /** Set only for today, to mark what's happening now. */
  nowMinutes: number | null;
}) {
  const [state, apply] = useOptimistic<State, Change>({ habits, tasks }, (s, c) => {
    switch (c.type) {
      case "habit":
        return { ...s, habits: s.habits.map((h) => (h.id === c.id ? { ...h, completed: c.completed, viaHealth: false } : h)) };
      case "task":
        return { ...s, tasks: s.tasks.map((t) => (t.id === c.id ? { ...t, completed: c.completed } : t)) };
      case "task-update":
        return { ...s, tasks: s.tasks.map((t) => (t.id === c.id ? { ...t, ...c.fields } : t)) };
      case "task-delete":
        return { ...s, tasks: s.tasks.filter((t) => t.id !== c.id) };
    }
  });
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = mood !== "future";
  const isToday = mood !== "past" && mood !== "future";

  function run(change: Change | null, action: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      if (change) apply(change);
      const result = await action();
      if (result.ok) after?.();
      else setError(result.error);
    });
  }
  const toggleH = (h: AgendaHabit) =>
    run({ type: "habit", id: h.id, completed: !h.completed }, () => toggleHabit(h.id, date, !h.completed));
  const toggleT = (t: TaskView) =>
    run({ type: "task", id: t.id, completed: !t.completed }, () => toggleTask(t.id, !t.completed));

  // Build the day
  const habitById = new Map(state.habits.map((h) => [h.id, h]));
  const scheduledHabits = new Set<string>();
  const shownTasks = tasksEnabled ? state.tasks : [];
  const timeline: Entry[] = [
    ...blocks.map((b) => {
      const habit = b.habitId ? (habitById.get(b.habitId) ?? null) : null;
      if (habit) scheduledHabits.add(habit.id);
      return { kind: "block" as const, key: b.id, start: b.start, end: b.end, block: b, habit };
    }),
    ...shownTasks
      .filter((t) => t.startTime !== null && !t.carriedTo)
      .map((t) => ({
        kind: "task" as const,
        key: t.id,
        start: t.startTime!,
        end: t.duration ? (t.startTime! + t.duration) % 1440 : null,
        task: t,
      })),
  ].sort((a, b) => a.start - b.start);
  const anytimeHabits = state.habits.filter((h) => !scheduledHabits.has(h.id));
  const anytimeTasks = shownTasks.filter((t) => t.startTime === null || t.carriedTo);

  // Progress over everything that counts: rules and (not carried) tasks.
  const counted = [...state.habits.map((h) => h.completed), ...shownTasks.filter((t) => !t.carriedTo).map((t) => t.completed)];
  const total = counted.length;
  const done = counted.filter(Boolean).length;
  const allDone = total > 0 && done === total;
  const remaining = total - done;
  const openTasks = shownTasks.filter((t) => !t.completed && !t.carriedTo).length;

  let status: string | null;
  if (mood === "future") status = "This day hasn't started yet.";
  else if (allDone) status = null;
  else if (mood === "past") status = "You can still update this day.";
  else if (done > 0) status = `${numberWord(remaining)} ${remaining === 1 ? "thing remains" : "things remain"}. You're still on track.`;
  else if (mood === "first-day") status = "Day 1. Start with today.";
  else if (mood === "late") status = "Today didn't go as planned. Tomorrow is still yours.";
  else if (mood === "after-miss") status = "You missed yesterday. Today is still yours.";
  else status = "Show up today.";

  const habitRow = (h: AgendaHabit, time?: { start: number; end: number; now: boolean }) => {
    const health = h.completed && h.viaHealth ? "Completed via Health" : null;
    const base = time ? `${formatDuration(blockLength(time.start, time.end))}${h.description ? ` · ${h.description}` : ""}` : h.description;
    return (
      <CheckRow
        key={time ? `${h.id}-${time.start}` : h.id}
        shape="circle"
        checked={h.completed}
        disabled={!editable}
        onToggle={() => toggleH(h)}
        title={h.title}
        meta={health ? [health, base].filter(Boolean).join(" · ") : base}
        metaDesktopOnly={!time && !health}
        time={time}
        tag="Rule"
      />
    );
  };

  const taskRow = (t: TaskView, withTime: boolean) => {
    if (editingTask === t.id) {
      return (
        <li key={t.id} className="py-3">
          <TaskForm
            initial={t}
            submitLabel="Save"
            pending={pending}
            onCancel={() => setEditingTask(null)}
            onSubmit={(fields) => {
              setEditingTask(null);
              run({ type: "task-update", id: t.id, fields }, () => updateTask(t.id, fields));
            }}
          />
        </li>
      );
    }
    const carried = t.carriedTo !== null;
    const timing = taskTiming(t.startTime, t.duration);
    const meta = [
      !withTime ? timing : t.duration ? formatDuration(t.duration) : null,
      carried ? `Moved to ${formatDay(t.carriedTo!, { month: "short", day: "numeric" })}` : null,
      t.note,
    ]
      .filter(Boolean)
      .join(" · ");
    const now = withTime && nowMinutes !== null && isNow({ start: t.startTime!, end: t.duration ? (t.startTime! + t.duration) % 1440 : (t.startTime! + 30) % 1440 }, nowMinutes);
    return (
      <CheckRow
        key={t.id}
        shape="square"
        checked={t.completed}
        disabled={!editable || carried}
        onToggle={() => toggleT(t)}
        title={t.title}
        meta={meta || null}
        muted={carried}
        time={withTime ? { start: t.startTime!, end: t.duration ? (t.startTime! + t.duration) % 1440 : null, now } : undefined}
        tag="Task"
        actions={
          editable ? (
            <>
              {!carried ? (
                <IconButton label={`Edit task: ${t.title}`} onClick={() => setEditingTask(t.id)}>
                  <PencilIcon size={14} />
                </IconButton>
              ) : null}
              <IconButton label={`Delete task: ${t.title}`} onClick={() => run({ type: "task-delete", id: t.id }, () => deleteTask(t.id))}>
                <CloseIcon size={14} />
              </IconButton>
            </>
          ) : null
        }
      />
    );
  };

  return (
    <div>
      <p className="tabular mt-3 text-sm">
        <span className="font-semibold">
          {done} / {total}
        </span>{" "}
        <span className="text-muted">done</span>
      </p>
      <div aria-live="polite" className="min-h-5">
        {status ? <p className="mt-1 text-sm text-muted">{status}</p> : null}
      </div>

      {allDone && editable ? (
        <div className="mt-6 flex animate-fade flex-col items-center rounded-2xl bg-subtle px-6 py-8 text-center">
          <span className="flex h-12 w-12 animate-pop items-center justify-center rounded-full bg-fg text-bg">
            <CheckIcon size={22} strokeWidth={2.25} />
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em]">
            {isToday ? "Arc complete for today." : "Everything done."}
          </p>
          <p className="mt-1.5 text-sm text-muted">You showed up.</p>
          <p className="tabular mt-5 inline-flex items-center gap-1.5 rounded-lg bg-bg px-4 py-2 text-sm font-semibold">
            Day {dayNumber} <CheckIcon size={14} strokeWidth={2.25} />
          </p>
        </div>
      ) : null}

      {timeline.length ? (
        <ol className="mt-6 border-t border-line">
          {timeline.map((e) => {
            if (e.kind === "task") return taskRow(e.task, true);
            const now = nowMinutes !== null && isNow(e.block, nowMinutes);
            if (e.habit) return habitRow(e.habit, { start: e.start, end: e.end, now });
            return <PlainRow key={e.key} block={e.block} now={now} />;
          })}
        </ol>
      ) : null}

      {anytimeHabits.length || anytimeTasks.length ? (
        <>
          {timeline.length ? (
            <h3 className="mt-7 text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted">Anytime today</h3>
          ) : null}
          <ul className={cn("border-t border-line", timeline.length ? "mt-2" : "mt-6")}>
            {anytimeHabits.map((h) => habitRow(h))}
            {anytimeTasks.map((t) => taskRow(t, false))}
          </ul>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      {editable ? (
        <div className="mt-2 flex flex-wrap items-start gap-x-5">
          {canAddHabit ? <AddHabitInline /> : null}
          {tasksEnabled && !addingTask ? (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted hover:text-fg"
            >
              <PlusIcon size={14} /> Add task
            </button>
          ) : null}
          {tasksEnabled && canCarry && openTasks > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(null, () => carryTasksForward(date))}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted hover:text-fg disabled:opacity-50"
            >
              Move unfinished tasks to tomorrow <ArrowRightIcon size={13} />
            </button>
          ) : null}
        </div>
      ) : null}

      {addingTask ? (
        <div className="mt-3 rounded-2xl border border-line bg-surface/60 p-4 sm:p-5">
          <TaskForm
            key={formKey}
            submitLabel="Add"
            pending={pending}
            onCancel={() => setAddingTask(false)}
            onSubmit={(fields) =>
              run(null, () => addTask(date, fields), () => {
                setFormKey((k) => k + 1);
                setAddingTask(false);
              })
            }
          />
          <p className="mt-2 text-xs text-muted">Give it a time and it slots into your day.</p>
        </div>
      ) : null}

      <Link href="/arc/plan" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg">
        {blocks.length ? "Edit timetable" : "Plan your day with a timetable"} <ArrowRightIcon size={13} />
      </Link>
    </div>
  );
}

function TimeCell({ start, end }: { start: number; end: number | null }) {
  return (
    <span className="tabular w-[4.5rem] shrink-0 pt-0.5 text-sm font-medium sm:w-24">
      {minutesToTime(start)}
      {end !== null ? <span className="block text-[0.75rem] font-normal text-muted sm:inline">–{minutesToTime(end)}</span> : null}
    </span>
  );
}

function CheckRow({
  shape,
  checked,
  disabled,
  onToggle,
  title,
  meta,
  metaDesktopOnly = false,
  muted = false,
  time,
  tag,
  actions,
}: {
  shape: "circle" | "square";
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  title: string;
  meta: string | null;
  metaDesktopOnly?: boolean;
  muted?: boolean;
  time?: { start: number; end: number | null; now: boolean };
  tag: string;
  actions?: React.ReactNode;
}) {
  return (
    <li className={cn("flex items-start gap-1 border-b border-line", time?.now && "bg-subtle")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${tag}: ${title}${time ? ` at ${minutesToTime(time.start)}` : ""}`}
        disabled={disabled}
        onClick={onToggle}
        className="group flex min-h-15 min-w-0 flex-1 items-start gap-3 py-3.5 text-left disabled:cursor-default disabled:opacity-60 sm:gap-4"
      >
        {time ? <TimeCell start={time.start} end={time.end} /> : null}
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border transition-colors",
            shape === "circle" ? "rounded-full" : "rounded-md",
            checked ? "animate-pop border-fg bg-fg text-bg" : "border-line bg-surface group-hover:border-muted",
          )}
        >
          {checked ? <CheckIcon size={13} strokeWidth={2.75} /> : null}
        </span>
        <span className="min-w-0">
          <span className={cn("block wrap-break-word text-[0.9375rem]", (muted || (checked && shape === "square")) && "text-muted")}>
            {title}
            {time?.now ? <span className="ml-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em]">Now</span> : null}
          </span>
          {meta ? (
            <span
              className={cn(
                "mt-0.5 text-[0.75rem] leading-relaxed text-muted",
                metaDesktopOnly ? "hidden sm:block" : "block",
              )}
            >
              {meta}
            </span>
          ) : null}
        </span>
      </button>
      {actions ? <span className="flex shrink-0 pt-2">{actions}</span> : null}
    </li>
  );
}

/** A timetable block that isn't linked to a rule: time on the plan, not a checkbox. */
function PlainRow({ block, now }: { block: BlockView; now: boolean }) {
  return (
    <li className={cn("flex items-start gap-3 border-b border-line py-3 sm:gap-4", now && "bg-subtle")}>
      <TimeCell start={block.start} end={block.end} />
      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
      </span>
      <span className="min-w-0">
        <span className="block wrap-break-word text-[0.9375rem] text-muted">
          {block.title}
          {now ? <span className="ml-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-fg">Now</span> : null}
        </span>
        <span className="mt-0.5 block text-[0.75rem] text-muted">
          {formatDuration(blockLength(block.start, block.end))}
          {block.note ? ` · ${block.note}` : ""}
        </span>
      </span>
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:text-fg"
    >
      {children}
    </button>
  );
}
