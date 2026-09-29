"use client";

import { useState, useTransition } from "react";
import { addHabit, removeHabit, updateHabit } from "@/lib/actions/habits";
import type { ActionResult } from "@/lib/actions/context";
import { MAX_HABITS, CATEGORY_LABELS } from "@/lib/arc-engine";
import type { HabitView } from "@/lib/arc";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PlusIcon } from "@/components/ui/icons";
import { HabitFields, type HabitDraft } from "@/components/arc/habit-fields";
import { HabitPresetSelect } from "@/components/arc/habit-preset-select";

type Target = { kind: "edit"; habit: HabitView } | { kind: "new" } | null;

export function RulesManager({ habits }: { habits: HabitView[] }) {
  const [target, setTarget] = useState<Target>(null);
  const [form, setForm] = useState<HabitDraft>({ title: "", description: "", category: "DISCIPLINE" });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = habits.filter((h) => h.active);
  const retired = habits.filter((h) => !h.active);

  function open(next: Target) {
    setError(null);
    setConfirmRemove(false);
    setForm(
      next?.kind === "edit"
        ? { title: next.habit.title, description: next.habit.description ?? "", category: next.habit.category }
        : { title: "", description: "", category: "CUSTOM" },
    );
    setTarget(next);
  }

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) setTarget(null);
      else setError(result.error);
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    run(() => (target.kind === "edit" ? updateHabit(target.habit.id, form) : addHabit(form)));
  }

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {active.map((habit) => (
          <li key={habit.id}>
            <button
              type="button"
              onClick={() => open({ kind: "edit", habit })}
              className="flex min-h-14 w-full items-center justify-between gap-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem]">{habit.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{CATEGORY_LABELS[habit.category]}</span>
                {habit.reason ? (
                  <span className="mt-1 block text-[0.6875rem] italic leading-relaxed text-muted">{habit.reason}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted">Edit</span>
            </button>
          </li>
        ))}
      </ul>

      {active.length < MAX_HABITS ? (
        <button
          type="button"
          onClick={() => open({ kind: "new" })}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted hover:text-fg"
        >
          <PlusIcon size={14} /> Add a rule
        </button>
      ) : null}

      {retired.length > 0 ? (
        <div className="mt-6">
          <p className="text-xs text-muted">Retired. Past progress is kept.</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {retired.map((h) => (
              <li key={h.id} className="line-through decoration-line">
                {h.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog open={target !== null} onClose={() => setTarget(null)} title={target?.kind === "new" ? "Add a rule" : "Edit rule"}>
        <form onSubmit={save} className="space-y-4">
          {target?.kind === "new" ? <HabitPresetSelect onPick={(p) => setForm(p)} /> : null}
          <HabitFields value={form} onChange={setForm} />
          {target?.kind === "new" ? (
            <p className="mt-4 text-xs text-muted">New rules count from today.</p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex gap-2">
            <button type="button" onClick={() => setTarget(null)} className={buttonClass("secondary", "flex-1")}>
              Cancel
            </button>
            <button type="submit" disabled={pending || !form.title.trim()} className={buttonClass("primary", "flex-1")}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>

        {target?.kind === "edit" ? (
          <div className="mt-6 border-t border-line pt-5">
            {confirmRemove ? (
              <div>
                <p className="text-sm">Remove this rule from today onward?</p>
                <p className="mt-1 text-xs text-muted">Your past progress on it is kept.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    className={buttonClass("ghost", "flex-1")}
                  >
                    Keep it
                  </button>
                  <button
                    type="button"
                    disabled={pending || active.length <= 1}
                    onClick={() => run(() => removeHabit(target.habit.id))}
                    className={buttonClass("danger", "flex-1")}
                  >
                    Remove rule
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={active.length <= 1}
                className="min-h-11 text-sm text-muted hover:text-fg disabled:opacity-40"
              >
                {active.length <= 1 ? "Your Arc needs at least one rule" : "Remove from my Arc"}
              </button>
            )}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
