"use client";

import { useState, useTransition } from "react";
import { updateArcSettings } from "@/lib/actions/settings";
import { FOCUS_KINDS, focusLabel, GOAL_LIMITS, MODULE_LABELS, type ArcGoals, type ArcModules, type FocusKind, type ModuleKey } from "@/lib/modules";
import { addDays, diffDays, formatDay } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";

const FOCUS_KIND_LABELS: Record<FocusKind, string> = {
  STUDY: "Study",
  CODING: "Coding or interview prep",
  READING: "Reading and learning",
  CREATIVE: "Creative work",
  CAREER: "Career work",
};

const field =
  "tabular mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-fg focus:outline-none";

export function ArcSettingsForm({
  startDate,
  endDate,
  today,
  goals,
  modules: initialModules,
  focusKind: initialKind,
}: {
  startDate: string;
  endDate: string;
  today: string;
  goals: ArcGoals;
  modules: ArcModules;
  focusKind: FocusKind | null;
}) {
  const [start, setStart] = useState(startDate);
  const [length, setLength] = useState(String(diffDays(startDate, endDate) + 1));
  const [stepGoal, setStepGoal] = useState(String(goals.stepGoal));
  const [sleepGoal, setSleepGoal] = useState(String(goals.sleepGoal));
  const [focusWeekday, setFocusWeekday] = useState(String(goals.focusGoalWeekday));
  const [focusWeekend, setFocusWeekend] = useState(String(goals.focusGoalWeekend));
  const [dsaGoal, setDsaGoal] = useState(String(goals.dsaGoal));
  const [kind, setKind] = useState<FocusKind>(initialKind ?? "CAREER");
  const [modules, setModules] = useState(initialModules);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const len = Number(length);
  const end = Number.isInteger(len) && len > 0 && start ? addDays(start, len - 1) : null;

  function toggle(key: ModuleKey) {
    setModules((m) => {
      const next = { ...m, [key]: !m[key] };
      if (!next.focus) next.dsa = false;
      return next;
    });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateArcSettings({
        startDate: start,
        length: len,
        stepGoal: Number(stepGoal),
        sleepGoal: Number(sleepGoal),
        focusGoalWeekday: Number(focusWeekday),
        focusGoalWeekend: Number(focusWeekend),
        dsaGoal: Number(dsaGoal),
        focusKind: kind,
        modules,
      });
      setMessage(result.ok ? { ok: true, text: "Saved. Past days keep the goals they had." } : { ok: false, text: result.error });
    });
  }

  const moduleKeys: ModuleKey[] = ["steps", "weight", "sleep", "focus", "dsa", "tasks", "journal"];

  return (
    <form onSubmit={save} className="space-y-8">
      <fieldset>
        <legend className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted">Arc settings</legend>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="arc-start" className="text-xs text-muted">
              Start date
            </label>
            <input id="arc-start" type="date" required max={today} value={start} onChange={(e) => setStart(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="arc-length" className="text-xs text-muted">
              Arc length (days)
            </label>
            <input
              id="arc-length"
              type="number"
              inputMode="numeric"
              required
              min={GOAL_LIMITS.arcLength.min}
              max={GOAL_LIMITS.arcLength.max}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className={field}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {end ? `Ends ${formatDay(end, { month: "long", day: "numeric", year: "numeric" })}. ` : ""}
          Days outside the range are hidden, not deleted.
        </p>
      </fieldset>

      <fieldset>
        <legend className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted">Tracking</legend>
        <p className="mt-1.5 text-xs text-muted">Measurements, not rules. Only what&apos;s on here appears on your day.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {moduleKeys
            .filter((k) => k !== "dsa" || modules.focus)
            .map((key) => (
              <label
                key={key}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm has-checked:border-fg has-focus-visible:outline-2 has-focus-visible:outline-fg"
              >
                <input type="checkbox" checked={modules[key]} onChange={() => toggle(key)} className="h-3.5 w-3.5 accent-fg" />
                {key === "focus" ? focusLabel(kind).section : MODULE_LABELS[key]}
              </label>
            ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {modules.steps ? (
            <div>
              <label htmlFor="goal-steps" className="text-xs text-muted">
                Step goal
              </label>
              <input
                id="goal-steps"
                type="number"
                inputMode="numeric"
                min={GOAL_LIMITS.stepGoal.min}
                max={GOAL_LIMITS.stepGoal.max}
                step={500}
                value={stepGoal}
                onChange={(e) => setStepGoal(e.target.value)}
                className={field}
              />
            </div>
          ) : null}
          {modules.sleep ? (
            <div>
              <label htmlFor="goal-sleep" className="text-xs text-muted">
                Sleep goal (hours)
              </label>
              <input
                id="goal-sleep"
                type="number"
                inputMode="decimal"
                min={GOAL_LIMITS.sleepGoal.min}
                max={GOAL_LIMITS.sleepGoal.max}
                step={0.25}
                value={sleepGoal}
                onChange={(e) => setSleepGoal(e.target.value)}
                className={field}
              />
            </div>
          ) : null}
          {modules.focus ? (
            <>
              <div className="col-span-2">
                <label htmlFor="focus-kind" className="text-xs text-muted">
                  Focused time goes to
                </label>
                <div className="relative">
                  <select id="focus-kind" value={kind} onChange={(e) => setKind(e.target.value as FocusKind)} className={`${field} appearance-none pr-9`}>
                    {FOCUS_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {FOCUS_KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 mt-[3px] -translate-y-1/2 text-muted" />
                </div>
              </div>
              <div>
                <label htmlFor="goal-focus-weekday" className="text-xs text-muted">
                  Weekday hours
                </label>
                <input
                  id="goal-focus-weekday"
                  type="number"
                  inputMode="decimal"
                  min={GOAL_LIMITS.focusGoal.min}
                  max={GOAL_LIMITS.focusGoal.max}
                  step={0.5}
                  value={focusWeekday}
                  onChange={(e) => setFocusWeekday(e.target.value)}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="goal-focus-weekend" className="text-xs text-muted">
                  Weekend hours
                </label>
                <input
                  id="goal-focus-weekend"
                  type="number"
                  inputMode="decimal"
                  min={GOAL_LIMITS.focusGoal.min}
                  max={GOAL_LIMITS.focusGoal.max}
                  step={0.5}
                  value={focusWeekend}
                  onChange={(e) => setFocusWeekend(e.target.value)}
                  className={field}
                />
              </div>
              {modules.dsa ? (
                <div>
                  <label htmlFor="goal-dsa" className="text-xs text-muted">
                    DSA problems a day
                  </label>
                  <input
                    id="goal-dsa"
                    type="number"
                    inputMode="numeric"
                    min={GOAL_LIMITS.dsaGoal.min}
                    max={GOAL_LIMITS.dsaGoal.max}
                    value={dsaGoal}
                    onChange={(e) => setDsaGoal(e.target.value)}
                    className={field}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-xs text-muted" : "text-sm"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
