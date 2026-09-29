"use client";

import { useState, useTransition } from "react";
import { beginArc } from "@/app/onboarding/actions";
import { MAX_HABITS, type GeneratedArc } from "@/lib/arc-engine";
import type { DraftAnswers } from "@/lib/assessment";
import { focusLabel, MODULE_LABELS, type ArcModules, type ModuleKey } from "@/lib/modules";
import { addDays, ARC_LENGTH, cn, formatDay, pad2, todayKey } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { SectionLabel } from "@/components/ui/label";
import { HabitFields, type HabitDraft } from "@/components/arc/habit-fields";

type PreviewHabit = HabitDraft & { reason?: string };

const EMPTY: HabitDraft = { title: "", description: "", category: "DISCIPLINE" };

export function ArcPreview({
  arc,
  answers,
  onBack,
}: {
  arc: GeneratedArc;
  answers: DraftAnswers;
  onBack: () => void;
}) {
  const [habits, setHabits] = useState<PreviewHabit[]>(arc.habits);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<HabitDraft>(EMPTY);
  const [modules, setModules] = useState<ArcModules>(arc.modules);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Dates are shown in the visitor's own timezone; the server recomputes them.
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const start = todayKey(timezone);
  const end = addDays(start, ARC_LENGTH - 1);

  function openEditor(target: number | "new") {
    setForm(target === "new" ? EMPTY : { title: habits[target].title, description: habits[target].description, category: habits[target].category });
    setEditing(target);
  }

  function saveEditor(e: React.FormEvent) {
    e.preventDefault();
    const clean = { ...form, title: form.title.trim(), description: form.description.trim() };
    if (!clean.title) return;
    setHabits((list) =>
      editing === "new" ? [...list, clean] : list.map((h, i) => (i === editing ? { ...h, ...clean } : h)),
    );
    setEditing(null);
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      const result = await beginArc({ answers, habits, modules, timezone });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-12 pt-6 sm:pt-12">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted hover:text-fg"
      >
        <ArrowLeftIcon size={14} /> Adjust answers
      </button>

      <div className="mt-6 animate-fade text-center">
        <SectionLabel as="p">Your Arc is ready</SectionLabel>
        <h1 className="mt-5 text-3xl font-semibold tracking-[0.12em]">90 DAYS</h1>
        <p className="mt-2 text-sm text-muted">
          {formatDay(start, { month: "short", day: "numeric" })} →{" "}
          {formatDay(end, { month: "short", day: "numeric" })}
        </p>
      </div>

      <blockquote className="mt-8 rounded-xl bg-subtle px-5 py-4 text-[0.9375rem] leading-relaxed">
        {arc.statement}
      </blockquote>

      <section aria-labelledby="rules-heading" className="mt-10">
        <h2 id="rules-heading" className="text-[0.75rem] font-medium uppercase tracking-[0.14em]">
          Your rules
        </h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {habits.map((habit, i) =>
            editing === i ? (
              <li key={i} className="py-4">
                <EditorForm form={form} setForm={setForm} onSubmit={saveEditor} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditor(i)}
                  disabled={editing !== null}
                  aria-label={`Edit rule: ${habit.title}`}
                  className="flex min-h-14 flex-1 items-center gap-4 py-3 text-left"
                >
                  <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle text-[0.75rem] text-muted">
                    {pad2(i + 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem]">{habit.title}</span>
                    {habit.description ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{habit.description}</span>
                    ) : null}
                    {habit.reason ? (
                      <span className="mt-1.5 block text-[0.6875rem] italic leading-relaxed text-muted">{habit.reason}</span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHabits((list) => list.filter((_, j) => j !== i))}
                  disabled={habits.length <= 1 || editing !== null}
                  aria-label={`Remove rule: ${habit.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg disabled:opacity-30"
                >
                  <CloseIcon size={15} />
                </button>
              </li>
            ),
          )}
        </ol>

        {editing === "new" ? (
          <div className="border-b border-line py-4">
            <EditorForm
              form={form}
              setForm={setForm}
              onSubmit={saveEditor}
              onCancel={() => setEditing(null)}
              isNew
            />
          </div>
        ) : habits.length < MAX_HABITS && editing === null ? (
          <button
            type="button"
            onClick={() => openEditor("new")}
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted hover:text-fg"
          >
            <PlusIcon size={14} /> Add a rule
          </button>
        ) : null}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Tap a rule to change it. A few rules kept every day beat many rules kept sometimes.
        </p>
      </section>

      <ModuleToggles
        modules={modules}
        focusName={focusLabel(arc.focusKind).section}
        showDsa={arc.focusKind === "CODING"}
        onToggle={(key) =>
          setModules((m) => {
            const next = { ...m, [key]: !m[key] };
            if (!next.focus) next.dsa = false;
            return next;
          })
        }
      />

      <div className="mt-12 text-center text-sm leading-relaxed">
        <p className="text-muted">You don&apos;t need motivation.</p>
        <p>You need to show up.</p>
      </div>

      {error ? (
        <p role="alert" className="mt-6 text-center text-sm">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={begin}
        disabled={pending || editing !== null || habits.length === 0}
        className={buttonClass("primary", "mt-8 w-full tracking-wide")}
      >
        {pending ? "Beginning…" : "Begin my Arc"} <ArrowRightIcon size={14} />
      </button>
    </main>
  );
}

function EditorForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  isNew = false,
}: {
  form: HabitDraft;
  setForm: (f: HabitDraft) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isNew?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} aria-label={isNew ? "Add a rule" : "Edit rule"}>
      <HabitFields value={form} onChange={setForm} autoFocus />
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("secondary", "flex-1")}>
          Cancel
        </button>
        <button type="submit" disabled={!form.title.trim()} className={buttonClass("primary", "flex-1")}>
          {isNew ? "Add" : "Save"}
        </button>
      </div>
    </form>
  );
}

const PREVIEW_MODULES: ModuleKey[] = ["steps", "weight", "sleep", "focus", "dsa", "tasks", "journal"];

function ModuleToggles({
  modules,
  focusName,
  showDsa,
  onToggle,
}: {
  modules: ArcModules;
  focusName: string;
  showDsa: boolean;
  onToggle: (key: ModuleKey) => void;
}) {
  const keys = PREVIEW_MODULES.filter((k) => k !== "dsa" || (showDsa && modules.focus));
  return (
    <section aria-labelledby="tracking-heading" className="mt-10">
      <h2 id="tracking-heading" className="text-[0.75rem] font-medium uppercase tracking-[0.14em]">
        Also tracking
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        Measurements, not rules. Keep only what helps. You can change this later.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={modules[key]}
            onClick={() => onToggle(key)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm transition-colors",
              modules[key] ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            {key === "focus" ? focusName : MODULE_LABELS[key]}
          </button>
        ))}
      </div>
    </section>
  );
}
