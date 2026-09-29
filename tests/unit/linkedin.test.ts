import { beforeEach, describe, expect, it, vi } from "vitest";
import { signState, verifyState } from "@/lib/oauth-state-core";
import { LINKEDIN_TEMPLATES, linkedInText, templateFor, type ShareSubject } from "@/lib/linkedin/templates";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { linkedInConnection: { findUnique: (...args: unknown[]) => findUnique(...args) } } }));

const payload = { nonce: "abc123", userId: "u1", returnTo: "/arc/settings", exp: Date.now() + 60_000 };

describe("OAuth state", () => {
  it("accepts a state it signed", () => {
    expect(verifyState(signState(payload))).toMatchObject({ nonce: "abc123", userId: "u1" });
  });

  it("rejects a tampered state", () => {
    const [body, sig] = signState(payload).split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, userId: "attacker" })).toString("base64url");
    expect(verifyState(`${forged}.${sig}`)).toBeNull();
    expect(verifyState(`${body}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(verifyState("garbage")).toBeNull();
  });

  it("rejects an expired state", () => {
    expect(verifyState(signState({ ...payload, exp: Date.now() - 1 }))).toBeNull();
  });
});

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

describe("OAuth callback validation", () => {
  vi.mock("next/headers", () => ({
    cookies: async () => ({
      get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
      set: (name: string, value: string) => jar.set(name, value),
      delete: (name: string) => jar.delete(name),
    }),
  }));

  beforeEach(() => jar.clear());

  it("accepts only the matching nonce for the same user, once", async () => {
    const { beginOAuth, finishOAuth } = await import("@/lib/oauth-state");
    const nonce = await beginOAuth("linkedin", "u1", "/badges");
    expect(await finishOAuth("linkedin", "u1", "wrong")).toBeNull();

    const again = await beginOAuth("linkedin", "u1", "/badges");
    expect(await finishOAuth("linkedin", "u2", again)).toBeNull();

    const third = await beginOAuth("linkedin", "u1", "/badges");
    expect(await finishOAuth("linkedin", "u1", third)).toMatchObject({ returnTo: "/badges" });
    // Consumed: replaying it fails.
    expect(await finishOAuth("linkedin", "u1", third)).toBeNull();
    expect(nonce).not.toBe(third);
  });

  it("never redirects off-site after OAuth", async () => {
    const { safeReturnTo } = await import("@/lib/oauth-state");
    expect(safeReturnTo("https://evil.example")).toBe("/arc/settings");
    expect(safeReturnTo("//evil.example")).toBe("/arc/settings");
    expect(safeReturnTo("/badges")).toBe("/badges");
  });
});

describe("LinkedIn tokens", () => {
  it("are encrypted at rest", async () => {
    const { encryptSecret, decryptSecret } = await import("@/lib/crypto");
    const stored = encryptSecret("AQX-secret-token");
    expect(stored).not.toContain("AQX-secret-token");
    expect(decryptSecret(stored)).toBe("AQX-secret-token");
  });

  it("are never returned to the client", async () => {
    const { linkedInStatus } = await import("@/lib/linkedin/oauth");
    // Even if the row came back with the token, the status must not carry it.
    findUnique.mockResolvedValueOnce({
      name: "Pranav",
      expiresAt: new Date(Date.now() + 86_400_000),
      status: "ACTIVE",
      accessTokenEncrypted: "v1.secret",
      memberId: "abc",
    });
    const status = await linkedInStatus("u1");
    expect(status).toEqual({ connected: true, name: "Pranav", expired: false });
    expect(JSON.stringify(status)).not.toMatch(/secret|token|abc/i);
    // And the query itself never selects the token.
    const select = findUnique.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("accessTokenEncrypted");
  });
});

describe("LinkedIn templates", () => {
  const subjects: ShareSubject[] = [
    { kind: "milestone", milestone: { kind: "DAY", n: 7 }, arcLength: 90 },
    { kind: "milestone", milestone: { kind: "DAY", n: 30 }, arcLength: 90 },
    { kind: "milestone", milestone: { kind: "DAY", n: 60 }, arcLength: 90 },
    { kind: "milestone", milestone: { kind: "DAY", n: 90 }, arcLength: 90 },
    { kind: "milestone", milestone: { kind: "STREAK", n: 14 }, arcLength: 90 },
    { kind: "milestone", milestone: { kind: "ARC_COMPLETE" }, arcLength: 90 },
    { kind: "badge", badgeName: "30 Day Discipline", badgeDescription: "Keep a 30 day streak.", dayNumber: 31, arcLength: 90 },
  ];

  it("covers every template deterministically", () => {
    expect(new Set(subjects.map(templateFor))).toEqual(new Set(LINKEDIN_TEMPLATES));
    for (const s of subjects) expect(linkedInText(s)).toBe(linkedInText(s));
  });

  it("never includes health or private data", () => {
    for (const s of subjects) {
      expect(linkedInText(s)).not.toMatch(/weight|kg|sleep|steps|journal|smok|alcohol|missed|broke/i);
    }
  });

  it("writes the Day 30 post", () => {
    expect(linkedInText(subjects[1])).toContain("Day 30 / 90.");
  });
});
