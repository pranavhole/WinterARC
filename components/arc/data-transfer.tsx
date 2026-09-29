"use client";

import { useRef, useState, useTransition } from "react";
import { importBackup, previewImport, type ImportPreview } from "@/lib/actions/data";
import { formatDay } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const MAX_BYTES = 3 * 1024 * 1024;

/** Export a JSON backup, or import one: pick file → preview → confirm. */
export function DataTransfer({ canExport }: { canExport: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<ImportPreview, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setPreview(null);
    setText(null);
  }

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("That file is too large to be an ARC backup.");
    const content = await file.text();
    startTransition(async () => {
      const result = await previewImport(content);
      if (!result.ok) return setError(result.error);
      setText(content);
      setPreview(result);
    });
    if (input.current) input.current.value = "";
  }

  const range = (p: { startDate: string; endDate: string }) =>
    `${formatDay(p.startDate, { month: "short", day: "numeric", year: "numeric" })} → ${formatDay(p.endDate, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {canExport ? (
          <a href="/arc/export" download className={buttonClass("secondary")}>
            Export data
          </a>
        ) : null}
        <button type="button" disabled={pending} onClick={() => input.current?.click()} className={buttonClass("secondary")}>
          {pending && !preview ? "Reading…" : "Import data"}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose an ARC backup file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      <p className="mt-2 text-xs text-muted">A JSON file with your Arc, habits, days, tasks and journal. No account data.</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : null}

      <Dialog open={preview !== null} onClose={close} title="Import this backup?">
        {preview ? (
          <div>
            <p className="text-sm leading-relaxed text-muted">This will add your ARC data from the backup as a separate Arc.</p>
            <dl className="mt-4 space-y-2 rounded-xl bg-subtle px-4 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Arc</dt>
                <dd className="tabular text-right">{range(preview)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Contains</dt>
                <dd className="tabular text-right">
                  {preview.habits} rules · {preview.days} days · {preview.tasks} tasks
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed">
              {preview.archivesCurrent
                ? "It becomes your active Arc. Your current Arc will be archived. It's kept, not deleted."
                : preview.restoresAsActive
                  ? "It becomes your active Arc."
                  : "It has already ended, so it's restored as a past Arc."}
            </p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={close} className={buttonClass("secondary", "flex-1")}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = text ? await importBackup(text) : undefined;
                    if (result && !result.ok) {
                      setError(result.error);
                      close();
                    }
                  })
                }
                className={buttonClass("primary", "flex-1")}
              >
                {pending ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
