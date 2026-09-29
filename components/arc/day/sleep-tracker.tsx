"use client";

import { useRef, useState } from "react";
import { saveDailyRecord } from "@/lib/actions/daily-record";
import { formatDuration, minutesToTime, sleepMinutes, timeToMinutes } from "@/lib/metrics";
import { useAutosave } from "@/lib/use-autosave";
import { cn } from "@/lib/utils";
import { MetricHeader } from "@/components/arc/day/section";
import { SaveStatus } from "@/components/arc/day/save-status";

type Patch = { bedtime?: number | null; wakeTime?: number | null; sleepQuality?: number | null };

export function SleepTracker({
  date,
  bedtime: initialBed,
  wakeTime: initialWake,
  quality: initialQuality,
  goal,
  editable,
}: {
  date: string;
  bedtime: number | null;
  wakeTime: number | null;
  quality: number | null;
  goal: number;
  editable: boolean;
}) {
  const [bed, setBed] = useState(minutesToTime(initialBed));
  const [wake, setWake] = useState(minutesToTime(initialWake));
  const [quality, setQuality] = useState(initialQuality);
  const patch = useRef<Patch>({});
  const { schedule, status, error } = useAutosave(() => {
    const next = patch.current;
    patch.current = {};
    return saveDailyRecord(date, next);
  }, 600);

  function change(update: Patch, immediate = false) {
    patch.current = { ...patch.current, ...update };
    schedule(undefined, immediate);
  }

  const duration = sleepMinutes(timeToMinutes(bed), timeToMinutes(wake));
  const input =
    "tabular mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-fg focus:outline-none disabled:opacity-50";

  return (
    <div>
      <MetricHeader label="Sleep">
        <p className="tabular text-sm">
          <span className="font-semibold">{formatDuration(duration)}</span>
          <span className="text-muted"> / {formatDuration(goal * 60)}</span>
        </p>
      </MetricHeader>
      <p className="mt-0.5 text-[0.75rem] text-muted">The night before this day.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`bed-${date}`} className="text-xs text-muted">
            Bedtime
          </label>
          <input
            id={`bed-${date}`}
            type="time"
            disabled={!editable}
            value={bed}
            onChange={(e) => {
              setBed(e.target.value);
              change({ bedtime: e.target.value ? timeToMinutes(e.target.value) : null });
            }}
            className={input}
          />
        </div>
        <div>
          <label htmlFor={`wake-${date}`} className="text-xs text-muted">
            Wake
          </label>
          <input
            id={`wake-${date}`}
            type="time"
            disabled={!editable}
            value={wake}
            onChange={(e) => {
              setWake(e.target.value);
              change({ wakeTime: e.target.value ? timeToMinutes(e.target.value) : null });
            }}
            className={input}
          />
        </div>
      </div>

      <fieldset className="mt-4" disabled={!editable}>
        <legend className="text-xs text-muted">Quality</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = quality !== null && n <= quality;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} of 5`}
                aria-pressed={quality === n}
                onClick={() => {
                  const next = quality === n ? null : n;
                  setQuality(next);
                  change({ sleepQuality: next }, true);
                }}
                className="flex h-11 w-10 items-center justify-center rounded-md disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className={cn(filled ? "fill-fg stroke-fg" : "fill-none stroke-line")}
                  />
                </svg>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-1 flex justify-end">
        <SaveStatus status={status} error={error} />
      </div>
    </div>
  );
}
