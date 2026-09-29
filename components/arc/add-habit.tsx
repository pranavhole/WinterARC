"use client";

import { useState, useTransition } from "react";
import { addHabit } from "@/lib/actions/habits";
import { buttonClass } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { HabitFields, type HabitDraft } from "@/components/arc/habit-fields";
import { HabitPresetSelect } from "@/components/arc/habit-preset-select";

const EMPTY_HABIT: HabitDraft = { title: "", description: "", category: "CUSTOM" };

/** "+ Add habit": pick a suggestion or write your own, with an optional description. Counts from today. */
export function AddHabitInline() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HabitDraft>(EMPTY_HABIT);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted hover:text-fg"
      >
        <PlusIcon size={14} /> Add habit
      </button>
    );
  }

  function close() {
    setOpen(false);
    setForm(EMPTY_HABIT);
    setError(null);
  }

  return (
    <form
      aria-label="Add a daily habit"
      className="mt-4 w-full basis-full space-y-4 rounded-2xl border border-line bg-surface/60 p-4 sm:p-5"
      onKeyDown={(e) => e.key === "Escape" && close()}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await addHabit(form);
          if (result.ok) close();
          else setError(result.error);
        });
      }}
    >
      <HabitPresetSelect onPick={(p) => setForm(p)} />
      <HabitFields value={form} onChange={setForm} />
      <p className="text-xs text-muted">It counts from today. Edit or remove it in Settings.</p>
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={close} className={buttonClass("secondary", "flex-1")}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !form.title.trim()} className={buttonClass("primary", "flex-1")}>
          {pending ? "Adding…" : "Add habit"}
        </button>
      </div>
    </form>
  );
}
