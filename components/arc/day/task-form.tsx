"use client";

import { useId, useState } from "react";
import { TASK_TITLE_MAX } from "@/lib/limits";
import { formatDuration, minutesToTime, timeToMinutes } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";

export type TaskFields = { title: string; note: string | null; startTime: number | null; duration: number | null };

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];

/** "09:00–10:30 · 1h 30m" */
export function taskTiming(startTime: number | null, duration: number | null): string | null {
  if (startTime === null && duration === null) return null;
  const parts: string[] = [];
  if (startTime !== null) {
    parts.push(
      duration ? `${minutesToTime(startTime)}–${minutesToTime((startTime + duration) % 1440)}` : minutesToTime(startTime),
    );
  }
  if (duration) parts.push(formatDuration(duration));
  return parts.join(" · ");
}

/** Title, then optional time, duration and note. Used to add and to edit. */
export function TaskForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: TaskFields;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fields: TaskFields) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [time, setTime] = useState(minutesToTime(initial?.startTime));
  const [duration, setDuration] = useState<number | null>(initial?.duration ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [showNote, setShowNote] = useState(Boolean(initial?.note));

  const field =
    "h-11 rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-muted focus:border-fg focus:outline-none";

  return (
    <form
      aria-label={onCancel ? "Edit task" : "Add a task"}
      onKeyDown={(e) => e.key === "Escape" && onCancel?.()}
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (!clean) return;
        onSubmit({ title: clean, note: note.trim() || null, startTime: time ? timeToMinutes(time) : null, duration });
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <label htmlFor={`${id}-title`} className="sr-only">
          {onCancel ? "Task title" : "New task"}
        </label>
        <input
          id={`${id}-title`}
          autoFocus={Boolean(onCancel)}
          value={title}
          maxLength={TASK_TITLE_MAX}
          placeholder="Add a task…"
          autoComplete="off"
          onChange={(e) => setTitle(e.target.value)}
          className={cn(field, "min-w-0 flex-1", onCancel && "border-fg")}
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className={buttonClass(onCancel ? "primary" : "secondary", "px-4")}
        >
          {submitLabel}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-time`} className="sr-only">
          Start time
        </label>
        <input
          id={`${id}-time`}
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={cn(field, "tabular w-32", !time && "text-muted")}
        />
        <label htmlFor={`${id}-duration`} className="sr-only">
          Duration
        </label>
        <div className="relative">
          <select
            id={`${id}-duration`}
            value={duration ?? ""}
            onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)}
            className={cn(field, "appearance-none pr-8", duration === null && "text-muted")}
          >
            <option value="">No duration</option>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
        {!showNote ? (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="min-h-11 rounded-md px-2 text-sm text-muted hover:text-fg"
          >
            + Note
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto min-h-11 rounded-md px-2 text-sm text-muted hover:text-fg"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {showNote ? (
        <div>
          <label htmlFor={`${id}-note`} className="sr-only">
            Note
          </label>
          <textarea
            id={`${id}-note`}
            rows={2}
            maxLength={500}
            value={note}
            placeholder="Details, links, what done looks like…"
            onChange={(e) => setNote(e.target.value)}
            className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed placeholder:text-muted focus:border-fg focus:outline-none"
          />
        </div>
      ) : null}
    </form>
  );
}
