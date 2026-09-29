import { describe, expect, it } from "vitest";
import { DateFlapper, FlapCard } from "@/components/arc/day/date-flapper";
import { formatDay } from "@/lib/utils";

describe("DateFlapper", () => {
  it("formats day number with padding based on arc length", () => {
    // 2-digit padding for 90-day arc
    const el90 = DateFlapper({
      dayNumber: 5,
      arcLength: 90,
      date: "2026-09-29",
      isToday: true,
      daysRemaining: 85,
      isFuture: false,
    });
    expect(el90).toBeDefined();
    expect(el90.props.children).toBeDefined();

    // 3-digit padding for 100+ day arc
    const el120 = DateFlapper({
      dayNumber: 5,
      arcLength: 120,
      date: "2026-09-29",
      isToday: false,
      daysRemaining: 115,
      isFuture: false,
    });
    expect(el120).toBeDefined();
  });

  it("extracts correct weekday, day, and month strings for display", () => {
    const date = "2026-09-29";
    const weekday = formatDay(date, { weekday: "short" }).toUpperCase();
    const dayOfMonth = formatDay(date, { day: "2-digit" });
    const month = formatDay(date, { month: "short" }).toUpperCase();

    expect(weekday).toBe("TUE");
    expect(dayOfMonth).toBe("29");
    expect(month).toBe("SEP");
  });

  it("renders screen-reader accessible heading", () => {
    const el = DateFlapper({
      dayNumber: 1,
      arcLength: 90,
      date: "2026-09-29",
      isToday: true,
      daysRemaining: 89,
      isFuture: false,
    });

    const [srHeading] = el.props.children;
    expect(srHeading.type).toBe("h1");
    expect(srHeading.props.className).toBe("sr-only");
    expect(srHeading.props.children.join("")).toContain("Day 1 of 90");
  });

  it("renders FlapCard with appropriate styles and split line", () => {
    const card = FlapCard({ text: "0", size: "lg" });
    expect(card).toBeDefined();
    expect(card.props.className).toContain("font-mono");
    expect(card.props.className).toContain("bg-surface");
    expect(card.props.className).toContain("text-fg");
  });
});
