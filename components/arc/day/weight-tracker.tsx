"use client";

import { useState } from "react";
import { saveDailyRecord } from "@/lib/actions/daily-record";
import { useAutosave } from "@/lib/use-autosave";
import { MetricHeader } from "@/components/arc/day/section";
import { SaveStatus } from "@/components/arc/day/save-status";

export function WeightTracker({
  date,
  initial,
  editable,
}: {
  date: string;
  initial: number | null;
  editable: boolean;
}) {
  const [value, setValue] = useState(initial === null ? "" : initial.toFixed(1));
  const { schedule, status, error } = useAutosave(
    (weight: number | null) => saveDailyRecord(date, { weight }),
    800,
  );

  function onChange(raw: string) {
    setValue(raw);
    if (raw === "") return schedule(null);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0 && n <= 500) schedule(Math.round(n * 10) / 10);
  }

  return (
    <div>
      <MetricHeader label="Weight" />
      <div className="mt-3 flex items-center gap-2">
        <label htmlFor={`weight-${date}`} className="sr-only">
          Weight in kilograms
        </label>
        <input
          id={`weight-${date}`}
          type="number"
          inputMode="decimal"
          min={1}
          max={500}
          step={0.1}
          disabled={!editable}
          value={value}
          placeholder="0.0"
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const n = Number(value);
            if (value !== "" && Number.isFinite(n)) setValue(n.toFixed(1));
          }}
          suppressHydrationWarning
          data-form-type="other"
          data-lpignore="true"
          className="tabular h-11 w-28 rounded-lg border border-line bg-surface px-3 text-sm focus:border-fg focus:outline-none disabled:opacity-50"
        />
        <span className="text-sm text-muted">kg</span>
        <span className="ml-auto">
          <SaveStatus status={status} error={error} />
        </span>
      </div>
    </div>
  );
}
