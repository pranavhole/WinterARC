"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "@/components/ui/icons";

/** Submit button for the Google sign-in form: shows a spinner and blocks double clicks while redirecting. */
export function GoogleSubmit({ label, size, className }: { label: string; size: "sm" | "md"; className: string }) {
  const { pending } = useFormStatus();
  const iconSize = size === "sm" ? 14 : 18;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn(className, pending && "cursor-wait disabled:opacity-80")}>
      {pending ? <Spinner size={iconSize} /> : <GoogleIcon size={iconSize} />}
      {pending ? "Signing in…" : label}
    </button>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin !rounded-none !bg-transparent !p-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
