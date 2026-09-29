import { describe, expect, it, vi } from "vitest";
import { feedWhere } from "@/lib/social/feed";
import { canView, relationship, visibleStats, usernameBase, isValidUsername } from "@/lib/social/privacy";

type Post = { id: string; authorId: string; visibility: "PUBLIC" | "FRIENDS" | "PRIVATE" };

/** Minimal evaluator for the where-shapes feedWhere produces (OR / in / equals). */
function matches(post: Post, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "OR") return (cond as Record<string, unknown>[]).some((w) => matches(post, w));
    const value = post[key as keyof Post];
    if (cond && typeof cond === "object" && "in" in cond) return (cond as { in: string[] }).in.includes(value);
    return value === cond;
  });
}

const posts: Post[] = [
  { id: "p1", authorId: "alice", visibility: "PRIVATE" },
  { id: "p2", authorId: "alice", visibility: "FRIENDS" },
  { id: "p3", authorId: "alice", visibility: "PUBLIC" },
  { id: "p4", authorId: "bob", visibility: "PRIVATE" },
];

vi.mock("@/lib/db", () => ({ prisma: {} }));

describe("post visibility", () => {
  it("hides a private post from every other user", () => {
    expect(canView("PRIVATE", relationship("alice", "bob", true))).toBe(false);
    expect(canView("PRIVATE", relationship("alice", "carol", false))).toBe(false);
    expect(canView("PRIVATE", relationship("alice", null, false))).toBe(false);
    expect(canView("PRIVATE", relationship("alice", "alice", false))).toBe(true);
  });

  it("shows friends-only posts to friends only", () => {
    expect(canView("FRIENDS", relationship("alice", "bob", true))).toBe(true);
    expect(canView("FRIENDS", relationship("alice", "carol", false))).toBe(false);
    expect(canView("FRIENDS", relationship("alice", null, false))).toBe(false);
  });

  it("enforces visibility in the feed query itself", () => {
    const forFriend = posts.filter((p) => matches(p, feedWhere("bob", ["alice"], "all") as Record<string, unknown>)).map((p) => p.id);
    expect(forFriend.sort()).toEqual(["p2", "p3", "p4"]);

    const forStranger = posts.filter((p) => matches(p, feedWhere("carol", [], "all") as Record<string, unknown>)).map((p) => p.id);
    expect(forStranger).toEqual(["p3"]);

    const friendsScope = posts.filter((p) => matches(p, feedWhere("bob", ["alice"], "friends") as Record<string, unknown>)).map((p) => p.id);
    expect(friendsScope.sort()).toEqual(["p2", "p3", "p4"]);
  });
});

describe("profile privacy", () => {
  const privacy = { profileVisibility: "FRIENDS" as const, showXp: false, showStreak: true, showBadges: false, showArcDay: true };
  const stats = { xp: 1240, level: 7, streak: 18, arcDay: 42, arcLength: 90 };

  it("hides stats the owner turned off", () => {
    expect(visibleStats(privacy, stats, "friend")).toEqual({ xp: null, level: null, streak: 18, arcDay: 42, arcLength: 90, showBadges: false });
  });

  it("shows everything to the owner", () => {
    expect(visibleStats(privacy, stats, "self")).toMatchObject({ xp: 1240, level: 7, showBadges: true });
  });

  it("builds safe usernames", () => {
    expect(usernameBase("Pranav Hole", null)).toBe("pranav_hole");
    expect(usernameBase(null, "x@example.com")).toMatch(/^x/);
    expect(isValidUsername(usernameBase("Ümit Çelik", null))).toBe(true);
    expect(isValidUsername("admin")).toBe(false);
    expect(isValidUsername("ab")).toBe(false);
  });
});
