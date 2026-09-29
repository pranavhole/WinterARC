import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/85",
  secondary: "border border-line bg-surface text-fg hover:bg-subtle",
  ghost: "text-muted hover:bg-subtle hover:text-fg",
  danger: "border border-line bg-surface text-fg hover:border-fg",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}
