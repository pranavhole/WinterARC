"use client";

import { buttonClass } from "@/components/ui/button";

export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="flex min-h-[60svh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-medium">Something went wrong.</h1>
      <p className="mt-2 text-sm text-muted">Your progress wasn&apos;t changed.</p>
      <button type="button" onClick={() => retry()} className={buttonClass("secondary", "mt-8")}>
        Try again
      </button>
    </div>
  );
}
