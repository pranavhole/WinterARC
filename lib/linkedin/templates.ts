/**
 * Deterministic LinkedIn post templates. They only ever contain safe
 * milestone information: never weight, sleep or other health data, private
 * habits, broken rules, or journal text. The user can edit before posting.
 */

import type { Milestone } from "@/lib/social/milestones";

export const LINKEDIN_TEMPLATES = ["DAY_7", "DAY_30", "DAY_60", "DAY_90", "STREAK", "BADGE_UNLOCK", "ARC_COMPLETION"] as const;
export type LinkedInTemplate = (typeof LINKEDIN_TEMPLATES)[number];

export const LINKEDIN_MAX = 3000;

const TAGS = "#WinterArc #Consistency #Discipline";

export type ShareSubject =
  | { kind: "milestone"; milestone: Milestone; arcLength: number | null }
  | { kind: "badge"; badgeName: string; badgeDescription: string; dayNumber: number | null; arcLength: number | null };

export function templateFor(subject: ShareSubject): LinkedInTemplate {
  if (subject.kind === "badge") return "BADGE_UNLOCK";
  const m = subject.milestone;
  if (m.kind === "ARC_COMPLETE") return "ARC_COMPLETION";
  if (m.kind === "STREAK") return "STREAK";
  return m.n === 7 ? "DAY_7" : m.n === 30 ? "DAY_30" : m.n === 60 ? "DAY_60" : "DAY_90";
}

const of = (n: number, length: number | null) => (length ? `Day ${n} / ${length}.` : `Day ${n}.`);

export function linkedInText(subject: ShareSubject): string {
  const template = templateFor(subject);
  const length = subject.arcLength;
  switch (template) {
    case "DAY_7":
      return ["One week into my Winter Arc.", "", "Seven days of showing up.", "The start is the hardest part.", "", of(7, length), "", TAGS].join("\n");
    case "DAY_30":
      return ["30 days into my Winter Arc.", "", "Not perfect.", "Just consistent.", "", of(30, length), "", TAGS].join("\n");
    case "DAY_60":
      return ["60 days into my Winter Arc.", "", "Consistency has become identity.", "", of(60, length), "", TAGS].join("\n");
    case "DAY_90":
      return ["90 days into my Winter Arc.", "", "Ninety days of keeping promises to myself.", "", of(90, length), "", TAGS].join("\n");
    case "STREAK": {
      const n = subject.kind === "milestone" && subject.milestone.kind === "STREAK" ? subject.milestone.n : 0;
      return [`${n} days in a row.`, "", "No zero days.", "Just showing up, every day.", "", TAGS].join("\n");
    }
    case "ARC_COMPLETION":
      return [
        "I finished my Winter Arc.",
        "",
        length ? `${length} days.` : "Every day of it.",
        "I finished what I started.",
        "",
        TAGS,
      ].join("\n");
    case "BADGE_UNLOCK": {
      const b = subject as Extract<ShareSubject, { kind: "badge" }>;
      return [
        `${b.badgeName}.`,
        "",
        b.badgeDescription,
        "",
        b.dayNumber ? `Day ${b.dayNumber}${length ? ` / ${length}` : ""} of my Winter Arc.` : "Part of my Winter Arc.",
        "",
        TAGS,
      ].join("\n");
    }
  }
}
