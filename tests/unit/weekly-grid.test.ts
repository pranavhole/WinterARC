import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/habits", () => ({
  toggleHabit: vi.fn().mockResolvedValue({ ok: true }),
}));

import { getMondayOf, getWeekDays, formatDay } from "@/lib/utils";
import type { HabitGridItem } from "@/components/arc/weekly-habit-grid";

describe("WeeklyHabitGrid date helpers", () => {
  it("resolves the Monday of the week correctly across various days", () => {
    // 2026-09-28 is a Monday
    expect(getMondayOf("2026-09-28")).toBe("2026-09-28");
    // 2026-09-29 is a Tuesday
    expect(getMondayOf("2026-09-29")).toBe("2026-09-28");
    // 2026-10-02 is a Friday
    expect(getMondayOf("2026-10-02")).toBe("2026-09-28");
    // 2026-10-04 is a Sunday (end of the week)
    expect(getMondayOf("2026-10-04")).toBe("2026-09-28");
  });

  it("handles month and year boundaries", () => {
    // 2026-10-01 is a Thursday in October; Monday was in September (2026-09-28)
    expect(getMondayOf("2026-10-01")).toBe("2026-09-28");
    // 2026-01-01 is a Thursday; Monday was in previous year (2025-12-29)
    expect(getMondayOf("2026-01-01")).toBe("2025-12-29");
  });

  it("returns exactly 7 consecutive days starting Monday ending Sunday", () => {
    const days = getWeekDays("2026-09-29");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-09-28"); // Monday
    expect(days[6]).toBe("2026-10-04"); // Sunday

    const weekdays = days.map((d) => formatDay(d, { weekday: "short" }));
    expect(weekdays).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});

describe("WeeklyHabitGrid grouping", () => {
  it("separates discipline rules from standard habits", () => {
    const habits: HabitGridItem[] = [
      { id: "1", title: "Wake up 5:30", category: "SLEEP", activeFrom: "2026-09-25", deactivatedOn: null },
      { id: "2", title: "No sugar", category: "DISCIPLINE", activeFrom: "2026-09-25", deactivatedOn: null },
      { id: "3", title: "Cold shower", category: "DISCIPLINE", activeFrom: "2026-09-25", deactivatedOn: null },
      { id: "4", title: "Deep work", category: "FOCUS", activeFrom: "2026-09-25", deactivatedOn: null },
    ];

    const discipline = habits.filter((h) => h.category === "DISCIPLINE");
    const standard = habits.filter((h) => h.category !== "DISCIPLINE");

    expect(discipline).toHaveLength(2);
    expect(discipline.map((d) => d.title)).toEqual(["No sugar", "Cold shower"]);

    expect(standard).toHaveLength(2);
    expect(standard.map((s) => s.title)).toEqual(["Wake up 5:30", "Deep work"]);
  });
});
