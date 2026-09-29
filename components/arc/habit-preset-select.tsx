"use client";

import { useId } from "react";
import { HABIT_PRESET_GROUPS, HABIT_PRESETS, type HabitPreset } from "@/lib/habit-presets";
import { ChevronDownIcon } from "@/components/ui/icons";

/** "Start from a suggestion" dropdown that fills the habit form. */
export function HabitPresetSelect({ onPick }: { onPick: (preset: HabitPreset) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted">
        Start from a suggestion
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          defaultValue=""
          onChange={(e) => {
            const preset = HABIT_PRESETS[Number(e.target.value)];
            if (preset) onPick(preset);
          }}
          className="h-11 w-full appearance-none rounded-lg border border-line bg-surface px-3 pr-9 text-sm focus:border-fg focus:outline-none"
        >
          <option value="" disabled>
            Choose a habit, or write your own below
          </option>
          {HABIT_PRESET_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.presets.map((preset) => (
                <option key={preset.title} value={HABIT_PRESETS.indexOf(preset)}>
                  {preset.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
