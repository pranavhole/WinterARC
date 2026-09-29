"use client";

import { useId, useState, useTransition } from "react";
import { addBlock, applySuggestedPlan, deleteBlock, updateBlock } from "@/lib/actions/plan";
import type { ActionResult } from "@/lib/actions/context";
import { formatDuration, minutesToTime, timeToMinutes } from "@/lib/metrics";
import {
  appliesOn,
  BLOCK_DAYS,
  BLOCK_DAYS_LABELS,
  blockLength,
  type BlockDaysValue,
  type BlockInput,
  type BlockView,
} from "@/lib/timetable";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ChevronDownIcon, CloseIcon, PencilIcon, PlusIcon } from "@/components/ui/icons";

// Any weekday / weekend date works for filtering by day type.
const SAMPLE_DAY: Record<"WEEKDAYS" | "WEEKENDS", string> = { WEEKDAYS: "2026-01-05", WEEKENDS: "2026-01-03" };

type LinkableHabit = { id: string; title: string };

export function PlanEditor({ blocks, habits }: { blocks: BlockView[]; habits: LinkableHabit[] }) {
  const habitTitle = new Map(habits.map((h) => [h.id, h.title]));
  const [view, setView] = useState<"WEEKDAYS" | "WEEKENDS">("WEEKDAYS");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmSuggest, setConfirmSuggest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = blocks.filter((b) => appliesOn(b.days, SAMPLE_DAY[view])).sort((a, b) => a.start - b.start);
  const planned = visible.filter((b) => b.title !== "Sleep").reduce((sum, b) => sum + blockLength(b.start, b.end), 0);

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) after?.();
      else setError(result.error);
    });
  }

  return (
    <div>
      {blocks.length === 0 ? (
        <div className="rounded-2xl bg-subtle px-5 py-6">
          <p className="text-sm font-medium">Start from your Arc</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            ARC can lay out a day around your rules, focus goal and sleep goal. Change anything after.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => applySuggestedPlan())}
            className={buttonClass("primary", "mt-4")}
          >
            {pending ? "Building…" : "Suggest a plan"}
          </button>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <div role="tablist" aria-label="Day type" className="flex rounded-lg bg-subtle p-1">
          {(["WEEKDAYS", "WEEKENDS"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "min-h-9 rounded-md px-4 text-sm transition-colors",
                view === v ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              {BLOCK_DAYS_LABELS[v]}
            </button>
          ))}
        </div>
        {visible.length ? (
          <p className="tabular text-xs text-muted">{formatDuration(planned)} planned, excluding sleep</p>
        ) : null}
      </div>

      {visible.length ? (
        <ol className="mt-5 border-l border-line">
          {visible.map((block) =>
            editing === block.id ? (
              <li key={block.id} className="relative py-3 pl-5">
                <BlockForm
                  initial={block}
                  habits={habits}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSubmit={(input) => run(() => updateBlock(block.id, input), () => setEditing(null))}
                />
              </li>
            ) : (
              <li key={block.id} className="relative flex items-start gap-3 py-3 pl-5">
                <span aria-hidden="true" className="absolute -left-[4.5px] top-[1.15rem] h-2 w-2 rounded-full bg-fg" />
                <p className="tabular w-24 shrink-0 pt-0.5 text-sm font-medium sm:w-28">
                  {minutesToTime(block.start)}
                  <span className="text-muted">–{minutesToTime(block.end)}</span>
                </p>
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word text-sm">{block.title}</p>
                  <p className="mt-0.5 text-[0.75rem] text-muted">
                    {formatDuration(blockLength(block.start, block.end))}
                    {block.days === "EVERYDAY" ? " · every day" : ""}
                    {block.habitId && habitTitle.has(block.habitId) ? ` · checks off “${habitTitle.get(block.habitId)}”` : ""}
                    {block.note ? ` · ${block.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Edit block: ${block.title}`}
                  onClick={() => setEditing(block.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg"
                >
                  <PencilIcon size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove block: ${block.title}`}
                  onClick={() => run(() => deleteBlock(block.id))}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg"
                >
                  <CloseIcon size={14} />
                </button>
              </li>
            ),
          )}
        </ol>
      ) : blocks.length ? (
        <p className="mt-5 text-sm text-muted">Nothing planned for {view === "WEEKDAYS" ? "weekdays" : "weekends"} yet.</p>
      ) : null}

      {editing === "new" ? (
        <div className="mt-4 rounded-2xl border border-line bg-surface/60 p-4 sm:p-5">
          <BlockForm
            initialDays={view}
            habits={habits}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSubmit={(input) => run(() => addBlock(input), () => setEditing(null))}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted hover:text-fg"
        >
          <PlusIcon size={14} /> Add a time block
        </button>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : null}

      {blocks.length ? (
        <div className="mt-10 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setConfirmSuggest(true)}
            className="min-h-11 text-sm text-muted hover:text-fg"
          >
            Replace with a suggested plan
          </button>
        </div>
      ) : null}

      <Dialog open={confirmSuggest} onClose={() => setConfirmSuggest(false)} title="Replace your plan?">
        <p className="text-sm leading-relaxed text-muted">
          Your current time blocks will be replaced by a plan built from your rules, focus goal and sleep goal.
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => setConfirmSuggest(false)} className={buttonClass("secondary", "flex-1")}>
            Keep mine
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => applySuggestedPlan(), () => setConfirmSuggest(false))}
            className={buttonClass("primary", "flex-1")}
          >
            Replace
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function BlockForm({
  initial,
  initialDays = "EVERYDAY",
  habits,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: BlockInput;
  initialDays?: BlockDaysValue;
  habits: LinkableHabit[];
  pending: boolean;
  onSubmit: (input: BlockInput) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [start, setStart] = useState(minutesToTime(initial?.start ?? 9 * 60));
  const [end, setEnd] = useState(minutesToTime(initial?.end ?? 10 * 60));
  const [days, setDays] = useState<BlockDaysValue>(initial?.days ?? initialDays);
  const [note, setNote] = useState(initial?.note ?? "");
  const [habitId, setHabitId] = useState<string>(initial?.habitId ?? "");
  const field =
    "mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-muted focus:border-fg focus:outline-none";
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  const valid = title.trim() && s !== null && e !== null && s !== e;

  return (
    <form
      aria-label={initial ? "Edit time block" : "Add a time block"}
      onKeyDown={(ev) => ev.key === "Escape" && onCancel()}
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!valid) return;
        onSubmit({ title: title.trim(), note: note.trim() || null, start: s!, end: e!, days, habitId: habitId || null });
      }}
      className="space-y-3"
    >
      <div>
        <label htmlFor={`${id}-title`} className="text-xs text-muted">
          What
        </label>
        <input
          id={`${id}-title`}
          autoFocus
          value={title}
          maxLength={60}
          placeholder="e.g. Study, Gym, Commute"
          onChange={(ev) => setTitle(ev.target.value)}
          className={field}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-start`} className="text-xs text-muted">
            From
          </label>
          <input id={`${id}-start`} type="time" required value={start} onChange={(ev) => setStart(ev.target.value)} className={cn(field, "tabular")} />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="text-xs text-muted">
            To
          </label>
          <input id={`${id}-end`} type="time" required value={end} onChange={(ev) => setEnd(ev.target.value)} className={cn(field, "tabular")} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`${id}-days`} className="text-xs text-muted">
            Repeats
          </label>
          <div className="relative">
            <select
              id={`${id}-days`}
              value={days}
              onChange={(ev) => setDays(ev.target.value as BlockDaysValue)}
              className={cn(field, "appearance-none pr-9")}
            >
              {BLOCK_DAYS.map((d) => (
                <option key={d} value={d}>
                  {BLOCK_DAYS_LABELS[d]}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-muted" />
          </div>
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-habit`} className="text-xs text-muted">
          Checks off a rule
        </label>
        <div className="relative">
          <select
            id={`${id}-habit`}
            value={habitId}
            onChange={(ev) => {
              setHabitId(ev.target.value);
              const picked = habits.find((h) => h.id === ev.target.value);
              if (picked && !title.trim()) setTitle(picked.title);
            }}
            className={cn(field, "appearance-none pr-9")}
          >
            <option value="">Nothing, it&apos;s just time on the plan</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-muted" />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-note`} className="text-xs text-muted">
          Note (optional)
        </label>
        <input
          id={`${id}-note`}
          value={note}
          maxLength={200}
          placeholder="e.g. Start with 2 DSA problems"
          onChange={(ev) => setNote(ev.target.value)}
          className={field}
        />
      </div>
      {s !== null && e !== null && s !== e ? (
        <p className="tabular text-xs text-muted">
          {formatDuration(blockLength(s, e))}
          {e < s ? ", ends after midnight" : ""}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className={buttonClass("secondary", "flex-1")}>
          Cancel
        </button>
        <button type="submit" disabled={pending || !valid} className={buttonClass("primary", "flex-1")}>
          {initial ? "Save" : "Add block"}
        </button>
      </div>
    </form>
  );
}
