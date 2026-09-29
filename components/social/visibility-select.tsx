"use client";

export type VisibilityValue = "PUBLIC" | "FRIENDS" | "PRIVATE";

const LABELS: Record<VisibilityValue, string> = { PUBLIC: "Public", FRIENDS: "Friends", PRIVATE: "Only me" };

export function VisibilitySelect({ value, onChange, id }: { value: VisibilityValue; onChange: (v: VisibilityValue) => void; id?: string }) {
  return (
    <select
      id={id}
      aria-label="Who can see this"
      value={value}
      onChange={(e) => onChange(e.target.value as VisibilityValue)}
      className="h-11 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-fg"
    >
      {(Object.keys(LABELS) as VisibilityValue[]).map((v) => (
        <option key={v} value={v}>
          {LABELS[v]}
        </option>
      ))}
    </select>
  );
}
