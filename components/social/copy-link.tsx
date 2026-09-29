"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { LinkIcon } from "@/components/ui/icons";

export function CopyLink({ path, label = "Copy profile link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass("ghost", "min-h-9 px-4 text-xs")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* Clipboard blocked: nothing to do. */
        }
      }}
    >
      <LinkIcon size={13} />
      {copied ? "Copied" : label}
    </button>
  );
}
