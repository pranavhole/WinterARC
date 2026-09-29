import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

const UGC_URL = "https://api.linkedin.com/v2/ugcPosts";

export type PublishResult = { ok: true; url: string | null } | { ok: false; reason: "not-connected" | "expired" | "failed" };

/**
 * Publish a member post. Called only from the confirm step of the preview,
 * never automatically. Text first, with an optional link card; the token is
 * decrypted here and never returned.
 */
export async function publishToLinkedIn(
  userId: string,
  text: string,
  link?: { url: string; title: string; description: string } | null,
): Promise<PublishResult> {
  const c = await prisma.linkedInConnection.findUnique({
    where: { userId },
    select: { memberId: true, accessTokenEncrypted: true, expiresAt: true, status: true },
  });
  if (!c) return { ok: false, reason: "not-connected" };
  if (c.status === "EXPIRED" || c.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "expired" };

  const content = link
    ? {
        shareCommentary: { text },
        shareMediaCategory: "ARTICLE",
        media: [{ status: "READY", originalUrl: link.url, title: { text: link.title }, description: { text: link.description } }],
      }
    : { shareCommentary: { text }, shareMediaCategory: "NONE" };

  const res = await fetch(UGC_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${decryptSecret(c.accessTokenEncrypted)}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${c.memberId}`,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": content },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
    cache: "no-store",
  });

  if (res.status === 401) {
    await prisma.linkedInConnection.update({ where: { userId }, data: { status: "EXPIRED" } });
    return { ok: false, reason: "expired" };
  }
  if (!res.ok) {
    console.error("LinkedIn post failed", res.status, await res.text().catch(() => ""));
    return { ok: false, reason: "failed" };
  }
  const urn = res.headers.get("x-restli-id");
  return { ok: true, url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null };
}

export async function disconnectLinkedIn(userId: string) {
  await prisma.linkedInConnection.deleteMany({ where: { userId } });
}
