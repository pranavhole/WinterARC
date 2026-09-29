"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/lib/actions/social";

/** Viewing the list marks it read. A mutation belongs in an action, not in render. */
export function MarkRead() {
  useEffect(() => {
    markNotificationsRead();
  }, []);
  return null;
}
