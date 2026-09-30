"use client";

import { useState, useSyncExternalStore } from "react";
import { ANDROID_APP_URL, isAndroid } from "@/lib/android";
import { buttonClass } from "@/components/ui/button";
import { CloseIcon } from "@/components/ui/icons";

const DISMISSED = "arc-android-banner-dismissed";

const noSubscribe = () => () => {};

function shouldOffer(): boolean {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISSED) === "1";
  } catch {
    /* Storage blocked: just show it. */
  }
  return !dismissed && isAndroid(navigator.userAgent);
}

/** On Android phones: offer the ARC app, which syncs Health Connect data to the Arc. */
export function AndroidAppBanner() {
  // Browser-only values: the server snapshot is "don't show", so hydration matches.
  const offer = useSyncExternalStore(noSubscribe, shouldOffer, () => false);
  const [closed, setClosed] = useState(false);

  if (!offer || closed) return null;

  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div role="region" aria-label="ARC for Android" className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fg text-[0.6875rem] font-semibold tracking-[0.2em] text-bg">ARC</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Get the ARC app</p>
        <p className="text-xs text-muted">Syncs steps, sleep and exercise from your phone.</p>
      </div>
      <a href={ANDROID_APP_URL} className={buttonClass("primary", "min-h-9 shrink-0 px-4 text-xs")}>
        Install
      </a>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-muted hover:text-fg">
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
