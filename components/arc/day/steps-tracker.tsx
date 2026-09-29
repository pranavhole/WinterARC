"use client";

import { useState } from "react";
import { saveDailyRecord } from "@/lib/actions/daily-record";
import { formatSteps } from "@/lib/metrics";
import { useAutosave } from "@/lib/use-autosave";
import { ProgressBar } from "@/components/ui/progress-bar";
import { buttonClass } from "@/components/ui/button";
import { MetricHeader } from "@/components/arc/day/section";
import { SaveStatus } from "@/components/arc/day/save-status";

const MAX_STEPS = 200_000;

export function StepsTracker({
  date,
  initial,
  goal,
  editable,
}: {
  date: string;
  initial: number | null;
  goal: number;
  editable: boolean;
}) {
  const [steps, setSteps] = useState<number | null>(initial);
  const { schedule, status, error } = useAutosave((value: number | null) => saveDailyRecord(date, { steps: value }));

  function set(value: number | null, immediate = false) {
    const clean = value === null ? null : Math.min(MAX_STEPS, Math.max(0, Math.round(value)));
    setSteps(clean);
    schedule(clean, immediate);
  }

  const current = steps ?? 0;
  return (
    <div>
      <MetricHeader label="Steps">
        <p className="tabular text-sm">
          <span className="font-semibold">{formatSteps(current)}</span>
          <span className="text-muted"> / {formatSteps(goal)}</span>
        </p>
      </MetricHeader>
      <ProgressBar value={current / goal} label="Steps toward goal" className="mt-3" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor={`steps-${date}`} className="sr-only">
          Steps
        </label>
        <input
          id={`steps-${date}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_STEPS}
          step={1}
          disabled={!editable}
          value={steps ?? ""}
          placeholder="0"
          onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))}
          className="tabular h-11 w-32 rounded-lg border border-line bg-surface px-3 text-sm focus:border-fg focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!editable}
          onClick={() => set(current + 1000, true)}
          className={buttonClass("secondary", "px-4")}
        >
          +1k
        </button>
        <button
          type="button"
          disabled={!editable}
          onClick={() => set(current + 5000, true)}
          className={buttonClass("secondary", "px-4")}
        >
          +5k
        </button>
      </div>
      <div className="mt-2 flex justify-between">
        <span className="text-[0.75rem] text-muted">{current >= goal ? "Goal reached." : ""}</span>
        <SaveStatus status={status} error={error} />
      </div>
    </div>
  );
}
