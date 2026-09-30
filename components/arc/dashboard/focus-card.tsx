"use client";

import { useState } from "react";
import { saveFocus } from "@/lib/actions/focus";
import { FOCUS_MAX } from "@/lib/limits";
import { useAutosave } from "@/lib/use-autosave";
import { SaveStatus } from "@/components/arc/day/save-status";

/** TODAY'S FOCUS: one line for the day, saved as you type. */
export function FocusInput({ date, initial, editable }: { date: string; initial: string | null; editable: boolean }) {
  const [text, setText] = useState(initial ?? "");
  const { schedule, status, error } = useAutosave((value: string) => saveFocus(date, value), 800);

  return (
    <div>
      <label htmlFor={`focus-${date}`} className="sr-only">
        What matters today?
      </label>
      <input
        id={`focus-${date}`}
        value={text}
        maxLength={FOCUS_MAX}
        disabled={!editable}
        placeholder="What matters today?"
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          schedule(e.target.value);
        }}
        className="h-11 w-full rounded-lg bg-subtle px-3.5 text-sm outline-none placeholder:text-muted focus:bg-bg focus:ring-1 focus:ring-line disabled:opacity-60"
      />
      <div className="mt-1.5 h-4 text-right">
        <SaveStatus status={status} error={error} />
      </div>
    </div>
  );
}
