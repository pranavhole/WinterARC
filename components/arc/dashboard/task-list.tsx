"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addTask, toggleTask } from "@/lib/actions/tasks";
import { TASK_TITLE_MAX } from "@/lib/limits";
import { cn } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";

type Task = { id: string; title: string; completed: boolean };

/** TASKS: the day's to-dos as checkboxes, plus a one-line add. */
export function TaskList({ date, tasks, editable, enabled }: { date: string; tasks: Task[]; editable: boolean; enabled: boolean }) {
  const [list, toggle] = useOptimistic(tasks, (s, id: string) => s.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!enabled) return <p className="text-sm text-muted">Tasks are off for this Arc. Turn them on in Settings.</p>;

  return (
    <div>
      {list.length ? (
        <ul className="space-y-2.5">
          {list.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={!editable}
                aria-pressed={t.completed}
                onClick={() =>
                  start(async () => {
                    toggle(t.id);
                    const res = await toggleTask(t.id, !t.completed);
                    if (!res.ok) setError(res.error);
                  })
                }
                className="flex w-full items-center gap-3 text-left text-sm disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                    t.completed ? "border-fg bg-fg text-bg" : "border-muted/60 bg-surface",
                  )}
                >
                  {t.completed ? <CheckIcon size={12} strokeWidth={2.6} /> : null}
                </span>
                <span className={cn("min-w-0 truncate", t.completed && "text-muted line-through decoration-muted/60")}>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nothing planned yet.</p>
      )}

      {editable ? (
        <form
          className="mt-3 flex items-center gap-2 border-t border-line pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = title.trim();
            if (!value) return;
            setError(null);
            start(async () => {
              const res = await addTask(date, { title: value });
              if (res.ok) setTitle("");
              else setError(res.error);
            });
          }}
        >
          <PlusIcon size={14} className="shrink-0 text-muted" />
          <label htmlFor={`task-${date}`} className="sr-only">
            Add a task
          </label>
          <input
            id={`task-${date}`}
            value={title}
            maxLength={TASK_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task"
            autoComplete="off"
            disabled={pending}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </form>
      ) : null}
      {error ? <p className="mt-2 text-xs">{error}</p> : null}
    </div>
  );
}
