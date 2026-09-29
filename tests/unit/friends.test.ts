import { describe, expect, it } from "vitest";
import { decideFriendRequest, pairKey, RESEND_AFTER_MS } from "@/lib/social/friend-rules";

const now = new Date("2026-09-29T12:00:00Z");

describe("friend requests", () => {
  it("cannot friend yourself", () => {
    expect(decideFriendRequest({ senderId: "a", receiverId: "a", existing: null, now })).toEqual({ ok: false, error: "You can't add yourself." });
  });

  it("creates a new request", () => {
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing: null, now })).toEqual({ ok: true, action: "create" });
  });

  it("rejects a duplicate request", () => {
    const existing = { senderId: "a", receiverId: "b", status: "PENDING" as const, updatedAt: now };
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing, now })).toMatchObject({ ok: false });
  });

  it("treats a request back as accepting", () => {
    const existing = { senderId: "b", receiverId: "a", status: "PENDING" as const, updatedAt: now };
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing, now })).toEqual({ ok: true, action: "accept" });
  });

  it("rejects a request between friends", () => {
    const existing = { senderId: "b", receiverId: "a", status: "ACCEPTED" as const, updatedAt: now };
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing, now })).toEqual({ ok: false, error: "You're already friends." });
  });

  it("makes the sender wait after a rejection", () => {
    const existing = { senderId: "a", receiverId: "b", status: "REJECTED" as const, updatedAt: now };
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing, now })).toMatchObject({ ok: false });
    const later = new Date(now.getTime() + RESEND_AFTER_MS + 1);
    expect(decideFriendRequest({ senderId: "a", receiverId: "b", existing, now: later })).toEqual({ ok: true, action: "resend" });
  });

  it("uses one pair key in either direction, so duplicate friendships can't exist", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
    expect(pairKey("a", "b")).not.toBe(pairKey("a", "c"));
  });
});
