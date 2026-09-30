"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;

/**
 * Keeps the Today page current while it's open: re-renders it from the server
 * every 5 minutes and when the tab comes back into view, so data synced from
 * the phone shows up without a manual reload. Nothing runs in hidden tabs.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < MIN_GAP_MS) return;
      last = Date.now();
      router.refresh();
    };
    const timer = setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
