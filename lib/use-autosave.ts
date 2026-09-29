"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/lib/actions/context";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave: many changes in a row become one request once the user
 * pauses. A pending change is flushed if the component unmounts or the page is
 * hidden, so leaving the page never drops the last edit.
 */
export function useAutosave<T>(save: (value: T) => Promise<ActionResult>, delay = 700) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setStatus("saving");
    try {
      const result = await saveRef.current(next.value);
      if (result.ok) {
        setStatus("saved");
        setError(null);
      } else {
        setStatus("error");
        setError(result.error);
      }
    } catch {
      setStatus("error");
      setError("Couldn't save. Check your connection and try again.");
    }
  }, []);

  const schedule = useCallback(
    (value: T, immediate = false) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      if (immediate) void flush();
      else timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  return { schedule, status, error };
}
