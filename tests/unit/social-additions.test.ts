import { describe, expect, it } from "vitest";
import { feedWhere } from "@/lib/social/feed";
import { commentSchema, COMMENT_MAX } from "@/lib/social/comments";
import { reportSchema } from "@/lib/social/blocking";

describe("Social additions - feed filtering", () => {
  const viewerId = "user_me";
  const friends = ["user_friend1", "user_friend2"];
  const following = ["user_follow1", "user_follow2"];
  const blocked = ["user_blocked1"];

  it("filters out blocked users in 'all' feed", () => {
    const where = feedWhere(viewerId, friends, "all", following, blocked) as { AND: { authorId: unknown }[] };
    expect(where).toHaveProperty("AND");
    expect(where.AND[0]).toEqual({ authorId: { notIn: blocked } });
  });

  it("filters correctly for 'following' feed", () => {
    const where = feedWhere(viewerId, friends, "following", following, blocked) as {
      AND: [{ authorId: unknown }, { authorId: { in: string[] } }];
    };
    expect(where.AND[0]).toEqual({ authorId: { notIn: blocked } });
    expect(where.AND[1].authorId).toEqual({ in: [viewerId, ...following] });
  });

  it("filters correctly for 'friends' feed", () => {
    const where = feedWhere(viewerId, friends, "friends", following, blocked) as {
      AND: [{ authorId: unknown }, { authorId: { in: string[] } }];
    };
    expect(where.AND[0]).toEqual({ authorId: { notIn: blocked } });
    expect(where.AND[1].authorId).toEqual({ in: [viewerId, ...friends] });
  });

  it("handles empty blocked list cleanly", () => {
    const where = feedWhere(viewerId, friends, "all", following, []) as { OR: unknown[] };
    expect(where).toHaveProperty("OR");
  });
});

describe("Social additions - comments validation", () => {
  it("accepts valid comment", () => {
    const res = commentSchema.safeParse({ postId: "post123", content: "Great progress, keep going!" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.content).toBe("Great progress, keep going!");
    }
  });

  it("trims whitespace from comment", () => {
    const res = commentSchema.safeParse({ postId: "post123", content: "   hello   " });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.content).toBe("hello");
    }
  });

  it("rejects empty comment", () => {
    const res = commentSchema.safeParse({ postId: "post123", content: "   " });
    expect(res.success).toBe(false);
  });

  it("rejects comment exceeding COMMENT_MAX", () => {
    const res = commentSchema.safeParse({ postId: "post123", content: "a".repeat(COMMENT_MAX + 1) });
    expect(res.success).toBe(false);
  });
});

describe("Social additions - moderation reporting", () => {
  it("validates legitimate report payload", () => {
    const res = reportSchema.safeParse({
      reportedId: "user_bad",
      postId: "post_1",
      reason: "SPAM",
      notes: "Posting crypto scams repeatedly",
    });
    expect(res.success).toBe(true);
  });

  it("rejects unknown report reason", () => {
    const res = reportSchema.safeParse({
      reportedId: "user_bad",
      reason: "NOT_A_REASON",
    });
    expect(res.success).toBe(false);
  });
});
