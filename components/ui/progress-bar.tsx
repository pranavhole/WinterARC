import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  className,
  thin = false,
}: {
  value: number; // 0..1
  label: string;
  className?: string;
  thin?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full overflow-hidden rounded-full bg-line/70", thin ? "h-1" : "h-1.5", className)}
    >
      <div className="h-full rounded-full bg-fg transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
