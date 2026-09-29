"use client";

import { useId } from "react";
import { CATEGORY_LABELS, HABIT_CATEGORIES, type HabitCategoryValue } from "@/lib/arc-engine";
import { HABIT_DESCRIPTION_MAX, HABIT_TITLE_MAX } from "@/lib/limits";
import { ChevronDownIcon } from "@/components/ui/icons";

export type HabitDraft = { title: string; description: string; category: HabitCategoryValue };

const fieldClass =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-muted focus:border-fg focus:outline-none";

export function HabitFields({
  value,
  onChange,
  autoFocus = false,
}: {
  value: HabitDraft;
  onChange: (next: HabitDraft) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${id}-title`} className="text-xs text-muted">
          Title
        </label>
        <input
          id={`${id}-title`}
          name="title"
          required
          autoFocus={autoFocus}
          maxLength={HABIT_TITLE_MAX}
          value={value.title}
          placeholder="e.g. Read 10 pages"
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className={`${fieldClass} mt-1.5 h-11`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-description`} className="text-xs text-muted">
          Description
        </label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={3}
          maxLength={HABIT_DESCRIPTION_MAX}
          value={value.description}
          placeholder="What does done look like?"
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className={`${fieldClass} mt-1.5 resize-none py-2.5 leading-relaxed`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-category`} className="text-xs text-muted">
          Category
        </label>
        <div className="relative mt-1.5">
          <select
            id={`${id}-category`}
            name="category"
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value as HabitCategoryValue })}
            className={`${fieldClass} h-11 appearance-none pr-9`}
          >
            {HABIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          />
        </div>
      </div>
    </div>
  );
}
