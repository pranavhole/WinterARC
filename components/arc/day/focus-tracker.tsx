"use client";

import { useRef, useState } from "react";
import { saveDailyRecord } from "@/lib/actions/daily-record";
import { formatHours } from "@/lib/metrics";
import { useAutosave } from "@/lib/use-autosave";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Counter } from "@/components/arc/day/counter";
import { MetricHeader } from "@/components/arc/day/section";
import { SaveStatus } from "@/components/arc/day/save-status";

type Patch = { studyHours?: number; dsaProblems?: number };

export function FocusTracker({
  date,
  label,
  weekend,
  hours: initialHours,
  goal,
  dsa,
  editable,
}: {
  date: string;
  label: string;
  weekend: boolean;
  hours: number | null;
  goal: number;
  dsa: { count: number | null; goal: number } | null;
  editable: boolean;
}) {
  const [hours, setHours] = useState(initialHours ?? 0);
  const [problems, setProblems] = useState(dsa?.count ?? 0);
  // Both counters share one debounced save of whatever changed.
  const patch = useRef<Patch>({});
  const { schedule, status, error } = useAutosave(() => {
    const next = patch.current;
    patch.current = {};
    return saveDailyRecord(date, next);
  }, 500);

  function change(update: Patch) {
    patch.current = { ...patch.current, ...update };
    schedule(undefined);
  }

  return (
    <div className="space-y-7">
      <div>
        <MetricHeader label={label}>
          <p className="tabular text-sm">
            <span className="font-semibold">{formatHours(hours)}</span>
            <span className="text-muted"> / {formatHours(goal)}</span>
          </p>
        </MetricHeader>
        <p className="mt-0.5 text-[0.75rem] text-muted">{weekend ? "Weekend target" : "Weekday target"}</p>
        <ProgressBar value={hours / goal} label={`${label} toward target`} className="mt-3" />
        <div className="mt-4">
          <Counter
            label={`${label} hours`}
            value={hours}
            step={0.5}
            max={24}
            disabled={!editable}
            format={(v) => v.toFixed(1)}
            onChange={(v) => {
              setHours(v);
              change({ studyHours: v });
            }}
          />
        </div>
      </div>

      {dsa ? (
        <div>
          <MetricHeader label="DSA">
            <p className="tabular text-sm">
              <span className="font-semibold">{problems}</span>
              <span className="text-muted"> / {dsa.goal} problems</span>
            </p>
          </MetricHeader>
          <ProgressBar value={problems / dsa.goal} label="DSA problems toward target" className="mt-3" />
          <div className="mt-4">
            <Counter
              label="DSA problems"
              value={problems}
              step={1}
              max={100}
              disabled={!editable}
              onChange={(v) => {
                setProblems(v);
                change({ dsaProblems: v });
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <SaveStatus status={status} error={error} />
      </div>
    </div>
  );
}
