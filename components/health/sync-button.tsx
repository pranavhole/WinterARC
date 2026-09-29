"use client";

import { useState, useTransition } from "react";
import { syncHealthNowAction } from "@/lib/actions/integrations";
import { cn } from "@/lib/utils";
import { RefreshIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/button";

export function SyncButton({ variant = "link" }: { variant?: "link" | "button" }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await syncHealthNowAction();
            setMessage(result.ok ? null : result.error);
          })
        }
        suppressHydrationWarning
        data-form-type="other"
        data-lpignore="true"
        className={variant === "button" ? buttonClass("secondary", "min-h-9 px-4 text-xs") : "inline-flex items-center gap-1 text-xs text-muted hover:text-fg"}
      >
        <RefreshIcon size={12} className={cn(pending && "animate-spin")} />
        {pending ? "Syncing…" : "Sync now"}
      </button>
      {message ? <span className="text-xs text-muted">{message}</span> : null}
    </span>
  );
}
