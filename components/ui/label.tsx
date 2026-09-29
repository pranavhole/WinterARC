import { cn } from "@/lib/utils";

/** Small uppercase section label, e.g. "TODAY", "YOUR RULES". */
export function SectionLabel({
  children,
  className,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  return <Tag className={cn("text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted", className)}>{children}</Tag>;
}
