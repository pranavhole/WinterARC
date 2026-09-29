import "server-only";
import { prisma } from "@/lib/db";

/**
 * Per-user fixed-window rate limits, stored in Postgres so every server
 * instance shares them. One upsert per check.
 */
export const LIMITS = {
  friendRequest: { max: 20, windowSeconds: 60 * 60 * 24 },
  post: { max: 10, windowSeconds: 60 * 60 },
  reaction: { max: 120, windowSeconds: 60 * 60 },
  linkedinPost: { max: 5, windowSeconds: 60 * 60 * 24 },
  healthSync: { max: 6, windowSeconds: 60 * 60 },
  healthIngest: { max: 60, windowSeconds: 60 * 60 },
  search: { max: 60, windowSeconds: 60 * 10 },
  deviceToken: { max: 5, windowSeconds: 60 * 60 * 24 },
  comment: { max: 60, windowSeconds: 60 * 60 },
  follow: { max: 60, windowSeconds: 60 * 60 },
  report: { max: 10, windowSeconds: 60 * 60 },
} as const;

export type RateLimitBucket = keyof typeof LIMITS;

/** True when the call is allowed (and counted). */
export async function rateLimit(userId: string, bucket: RateLimitBucket): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[bucket];
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const row = await prisma.rateLimit.upsert({
    where: { userId_bucket_windowStart: { userId, bucket, windowStart } },
    create: { userId, bucket, windowStart, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return row.count <= max;
}

/** Drop windows older than the longest limit. Called from the daily cron. */
export async function pruneRateLimits() {
  const longest = Math.max(...Object.values(LIMITS).map((l) => l.windowSeconds));
  await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - longest * 2000) } } });
}
