import "server-only";
import { cookies } from "next/headers";
import { randomToken, safeEqual } from "@/lib/crypto";
import { signState, verifyState, type OAuthStatePayload } from "@/lib/oauth-state-core";

/**
 * OAuth `state` for the LinkedIn and Google Health connection flows.
 * A random nonce goes to the provider and into an httpOnly cookie; the cookie
 * also carries the user id and return path, signed so they can't be edited.
 * The callback accepts only when the nonce matches, the signature holds, it
 * hasn't expired, and the signed user is the signed-in user.
 */

const TTL_SECONDS = 10 * 60;
const cookieName = (flow: string) => `arc_oauth_${flow}`;

export async function beginOAuth(flow: string, userId: string, returnTo: string, extra?: string) {
  const nonce = randomToken(24);
  const payload: OAuthStatePayload = { nonce, userId, returnTo: safeReturnTo(returnTo), extra, exp: Date.now() + TTL_SECONDS * 1000 };
  (await cookies()).set(cookieName(flow), signState(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
  return nonce;
}

/** Validates and consumes the state. Null on any mismatch. */
export async function finishOAuth(flow: string, userId: string, state: string | null): Promise<OAuthStatePayload | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(flow))?.value;
  jar.delete(cookieName(flow));
  if (!raw || !state) return null;
  const payload = verifyState(raw);
  if (!payload || !safeEqual(payload.nonce, state) || payload.userId !== userId) return null;
  return payload;
}

/** Only same-site relative paths, so a crafted returnTo can't redirect off ARC. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/arc/settings";
  return value.slice(0, 200);
}
