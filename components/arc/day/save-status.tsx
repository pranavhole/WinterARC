import type { SaveStatus as Status } from "@/lib/use-autosave";

/** Quiet inline status. No toasts. */
export function SaveStatus({ status, error }: { status: Status; error: string | null }) {
  return (
    <span aria-live="polite" className="min-h-4 text-[0.75rem] text-muted">
      {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? (error ?? "Couldn't save") : ""}
    </span>
  );
}
