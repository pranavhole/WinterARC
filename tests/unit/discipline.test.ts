import { describe, expect, it } from "vitest";
import { disciplineInputSchema } from "@/lib/validation";
import { XP } from "@/lib/gamification/xp";
import { HABIT_TITLE_MAX, HABIT_DESCRIPTION_MAX } from "@/lib/limits";

describe("Discipline model validation", () => {
  it("validates a proper discipline rule input", () => {
    const res = disciplineInputSchema.safeParse({
      title: "No phone after 10 PM",
      description: "Keep phone outside the bedroom",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.title).toBe("No phone after 10 PM");
      expect(res.data.description).toBe("Keep phone outside the bedroom");
    }
  });

  it("trims whitespace from title", () => {
    const res = disciplineInputSchema.safeParse({
      title: "  Cold shower  ",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.title).toBe("Cold shower");
    }
  });

  it("rejects empty discipline rule title", () => {
    const res = disciplineInputSchema.safeParse({ title: "   " });
    expect(res.success).toBe(false);
  });

  it("rejects titles exceeding HABIT_TITLE_MAX", () => {
    const res = disciplineInputSchema.safeParse({
      title: "A".repeat(HABIT_TITLE_MAX + 1),
    });
    expect(res.success).toBe(false);
  });

  it("rejects descriptions exceeding HABIT_DESCRIPTION_MAX", () => {
    const res = disciplineInputSchema.safeParse({
      title: "Valid Title",
      description: "A".repeat(HABIT_DESCRIPTION_MAX + 1),
    });
    expect(res.success).toBe(false);
  });

  it("awards 5 XP for discipline rule completion versus 10 XP for standard habit", () => {
    expect(XP.DISCIPLINE_COMPLETED).toBe(5);
    expect(XP.HABIT_COMPLETED).toBe(10);
  });
});
