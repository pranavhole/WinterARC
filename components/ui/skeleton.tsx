import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse-soft bg-subtle", className?.includes("rounded") ? null : "rounded-md", className)} />;
}
