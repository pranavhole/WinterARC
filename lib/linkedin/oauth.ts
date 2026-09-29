import "server-only";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

/**
 * Sign In with LinkedIn (OpenID Connect) + Share on LinkedIn.
 * Scopes: openid + profile identify the member; w_member_social lets ARC
 * create a post on their behalf, only after they confirm a preview.
 */

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"] as const;

export function linkedInConfigured(): boolean {
  return !!process.env.LINKEDIN_CLIENT_ID && !!process.env.LINKEDIN_CLIENT_SECRET;
}

export const redirectUri = (base: string) => `${base}/api/linkedin/callback`;

export function authorizeUrl(base: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri(base),
    state,
    scope: LINKEDIN_SCOPES.join(" "),
  });
  return `${AUTHORIZE_URL}?${params}`;
}

type TokenResponse = { access_token: string; expires_in: number; scope?: string };

/** Exchange the code, look up the member and store the encrypted token. */
export async function completeLinkedInConnection(userId: string, base: string, code: string) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(base),
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`LinkedIn token exchange failed (${tokenRes.status})`);
  const token = (await tokenRes.json()) as TokenResponse;
  if (!token.access_token) throw new Error("LinkedIn token response had no access token");

  const scopes = (token.scope ?? "").split(/[ ,]+/).filter(Boolean);
  if (scopes.length && !scopes.includes("w_member_social")) throw new Error("LinkedIn did not grant w_member_social");

  const meRes = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
  if (!meRes.ok) throw new Error(`LinkedIn userinfo failed (${meRes.status})`);
  const me = (await meRes.json()) as { sub?: string; name?: string };
  if (!me.sub) throw new Error("LinkedIn userinfo had no member id");

  const data = {
    memberId: me.sub,
    name: me.name ?? null,
    accessTokenEncrypted: encryptSecret(token.access_token),
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: scopes.join(" ") || LINKEDIN_SCOPES.join(" "),
    status: "ACTIVE" as const,
  };
  await prisma.linkedInConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

/** Connection status for the UI. Never includes the token. */
export async function linkedInStatus(userId: string) {
  const c = await prisma.linkedInConnection.findUnique({
    where: { userId },
    select: { name: true, expiresAt: true, status: true },
  });
  if (!c) return { connected: false as const };
  const expired = c.status === "EXPIRED" || c.expiresAt.getTime() <= Date.now();
  return { connected: true as const, name: c.name, expired };
}

export type LinkedInStatus = Awaited<ReturnType<typeof linkedInStatus>>;
