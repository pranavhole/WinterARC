"use client";

import { PlusIcon } from "@/components/ui/icons";

export function Counter({
  value,
  step,
  min = 0,
  max,
  label,
  format = (v) => String(v),
  disabled = false,
  onChange,
}: {
  value: number;
  step: number;
  min?: number;
  max: number;
  label: string;
  format?: (v: number) => string;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const round = (v: number) => Math.round(v * 100) / 100;
  const button =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-fg transition-colors hover:border-muted disabled:opacity-30";
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(round(Math.max(min, value - step)))}
        className={button}
      >
        <span aria-hidden="true" className="block h-[1.75px] w-3.5 rounded bg-current" />
      </button>
      <output aria-live="polite" className="tabular min-w-12 text-center text-lg font-semibold">
        {format(value)}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(round(Math.min(max, value + step)))}
        className={button}
      >
        <PlusIcon size={15} />
      </button>
    </div>
  );
}
