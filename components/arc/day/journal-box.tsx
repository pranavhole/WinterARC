"use client";

import { useState } from "react";
import { saveJournal } from "@/lib/actions/journal";
import { JOURNAL_MAX } from "@/lib/limits";
import { useAutosave } from "@/lib/use-autosave";
import { MetricHeader } from "@/components/arc/day/section";
import { SaveStatus } from "@/components/arc/day/save-status";

export function JournalBox({ date, initial, editable }: { date: string; initial: string | null; editable: boolean }) {
  const [text, setText] = useState(initial ?? "");
  const { schedule, status, error } = useAutosave((value: string) => saveJournal(date, value), 1000);

  return (
    <div>
      <MetricHeader label="Reflection">
        <SaveStatus status={status} error={error} />
      </MetricHeader>
      <label htmlFor={`journal-${date}`} className="sr-only">
        Journal for this day
      </label>
      <textarea
        id={`journal-${date}`}
        rows={5}
        maxLength={JOURNAL_MAX}
        disabled={!editable}
        value={text}
        placeholder="What went well? What will you fix tomorrow?"
        onChange={(e) => {
          setText(e.target.value);
          schedule(e.target.value);
        }}
        className="mt-3 w-full resize-y rounded-xl border border-line bg-surface p-4 text-[0.9375rem] leading-relaxed placeholder:text-muted focus:border-fg focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
