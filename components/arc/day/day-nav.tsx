"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";

const href = (date: string | null, today: string) => (date === null || date === today ? "/arc" : `/arc?date=${date}`);

/** ← Today → plus the left/right arrow keys. */
export function DayNav({
  prev,
  next,
  today,
  isToday,
}: {
  prev: string | null;
  next: string | null;
  today: string;
  isToday: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true], dialog[open]")) return;
      if (e.key === "ArrowLeft" && prev) router.push(href(prev, today), { scroll: false });
      if (e.key === "ArrowRight" && next) router.push(href(next, today), { scroll: false });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, today, router]);

  const arrow =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-fg transition-colors hover:border-muted";
  return (
    <nav aria-label="Day" className="flex items-center gap-2">
      {prev ? (
        <Link href={href(prev, today)} scroll={false} aria-label="Previous day" className={arrow}>
          <ArrowLeftIcon size={15} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "opacity-30")}>
          <ArrowLeftIcon size={15} />
        </span>
      )}
      <Link
        href="/arc"
        scroll={false}
        aria-current={isToday ? "date" : undefined}
        className={cn(
          "flex h-10 items-center rounded-lg px-4 text-sm transition-colors",
          isToday ? "bg-subtle text-fg" : "border border-line bg-surface text-fg hover:border-muted",
        )}
      >
        Today
      </Link>
      {next ? (
        <Link href={href(next, today)} scroll={false} aria-label="Next day" className={arrow}>
          <ArrowRightIcon size={15} />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(arrow, "opacity-30")}>
          <ArrowRightIcon size={15} />
        </span>
      )}
    </nav>
  );
}
