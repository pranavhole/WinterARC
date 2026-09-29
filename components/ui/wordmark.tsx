import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("text-sm font-semibold tracking-[0.3em]", className)}>ARC</span>;
}
