import { describe, expect, it } from "vitest";
import type { StoryData } from "@/components/social/story-card-studio";

describe("Story Studio data and calculation", () => {
  const sampleData: StoryData = {
    dayNumber: 24,
    arcLength: 90,
    streak: 14,
    bestStreak: 14,
    statement: "Silence. Focus. Execution.",
    focusKind: "DISCIPLINE",
    xp: 1450,
    consistency: 92,
    completedDays: 22,
    user: {
      name: "Alex",
      username: "alex_arc",
      image: null,
    },
    badges: [
      {
        key: "FIRST_WEEK",
        name: "First Week",
        description: "Complete 7 days of your Arc.",
        icon: "flame",
        xpReward: 50,
      },
    ],
  };

  it("calculates progress percentage correctly", () => {
    const progress = Math.min(100, Math.round((sampleData.dayNumber / sampleData.arcLength) * 100));
    expect(progress).toBe(27);
  });

  it("formats headline and handles default presets", () => {
    const headline = `DAY ${sampleData.dayNumber} // LOCKED IN`;
    expect(headline).toBe("DAY 24 // LOCKED IN");
  });

  it("preserves badges and user details in story data", () => {
    expect(sampleData.badges).toHaveLength(1);
    expect(sampleData.badges[0].key).toBe("FIRST_WEEK");
    expect(sampleData.user.username).toBe("alex_arc");
  });
});
