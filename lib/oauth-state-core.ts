import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

/** Pure signing helpers for OAuth state cookies (no Next.js imports, so they're unit-testable). */

export type OAuthStatePayload = {
  nonce: string;
  userId: string;
  returnTo: string;
  extra?: string;
  exp: number;
};

function signingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  return Buffer.from(hkdfSync("sha256", secret, "arc-oauth-state", "arc/state", 32));
}

const mac = (body: string) => createHmac("sha256", signingKey()).update(body).digest("base64url");

export function signState(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifyState(value: string, now = Date.now()): OAuthStatePayload | null {
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthStatePayload;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (typeof payload.nonce !== "string" || typeof payload.userId !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
