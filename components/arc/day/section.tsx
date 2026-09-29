import { ChevronDownIcon } from "@/components/ui/icons";

/**
 * A collapsible dashboard group (BODY, MIND, LIFE…). Native <details>: no
 * JavaScript, keyboard accessible, open by default.
 */
export function DaySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-t border-line pt-7 [&[open]>summary_svg]:rotate-180">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted [&::-webkit-details-marker]:hidden">
        <h2>{title}</h2>
        <ChevronDownIcon size={14} className="transition-transform" />
      </summary>
      <div className="mt-4 space-y-8 pb-2">{children}</div>
    </details>
  );
}

/** Small label + optional right-side value used inside sections. */
export function MetricHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-sm font-medium">{label}</h3>
      {children}
    </div>
  );
}
