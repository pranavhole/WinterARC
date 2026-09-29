import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { awardXp, xpKey, type XPAward, type XPStore } from "@/lib/gamification/xp";
import { levelForXp } from "@/lib/gamification/levels";

type Tx = Prisma.TransactionClient;

function prismaStore(tx: Tx): XPStore {
  return {
    async insertEvent(e) {
      // ON CONFLICT DO NOTHING: a duplicate key is a no-op, never an error.
      const { count } = await tx.xPEvent.createMany({
        data: [
          {
            userId: e.userId,
            arcId: e.arcId,
            type: e.type,
            amount: e.amount,
            referenceType: e.referenceType,
            referenceId: e.referenceId,
            key: e.key,
          },
        ],
        skipDuplicates: true,
      });
      return count === 1;
    },
    async incrementTotal(userId, amount) {
      const user = await tx.user.update({ where: { id: userId }, data: { totalXp: { increment: amount } }, select: { totalXp: true } });
      return user.totalXp;
    },
    async setLevel(userId, level) {
      await tx.user.update({ where: { id: userId }, data: { currentLevel: level } });
    },
  };
}

/** Award once, atomically with the cached total. Returns XP awarded (0 if already awarded). */
export function grantXp(award: XPAward): Promise<number> {
  return prisma.$transaction((tx) => awardXp(prismaStore(tx), award));
}

/**
 * Award several events in one round trip. Already-paid keys are filtered out
 * first; if a concurrent request races us to some of the rest, fall back to
 * awarding one by one so the total always matches the ledger.
 */
export async function grantXpBatch(userId: string, awards: XPAward[]): Promise<number> {
  const valid = awards.filter((a) => a.userId === userId && Number.isInteger(a.amount) && a.amount > 0);
  if (!valid.length) return 0;
  const keyed = [...new Map(valid.map((a) => [xpKey(a), a])).entries()];
  const paid = new Set(
    (await prisma.xPEvent.findMany({ where: { userId, key: { in: keyed.map(([k]) => k) } }, select: { key: true } })).map((e) => e.key),
  );
  const fresh = keyed.filter(([k]) => !paid.has(k));
  if (!fresh.length) return 0;

  const total = fresh.reduce((sum, [, a]) => sum + a.amount, 0);
  const inserted = await prisma.$transaction(async (tx) => {
    const { count } = await tx.xPEvent.createMany({
      data: fresh.map(([key, a]) => ({ userId, arcId: a.arcId, type: a.type, amount: a.amount, referenceType: a.referenceType, referenceId: a.referenceId, key })),
      skipDuplicates: true,
    });
    if (count !== fresh.length) return count;
    const user = await tx.user.update({ where: { id: userId }, data: { totalXp: { increment: total } }, select: { totalXp: true } });
    await tx.user.update({ where: { id: userId }, data: { currentLevel: levelForXp(user.totalXp).level } });
    return count;
  });
  if (inserted === fresh.length) return total;
  // Lost a race on some keys: rebuild the cache from the ledger, which is the truth.
  await recomputeTotalXp(userId);
  return 0;
}

/** Rebuild the cached total from the immutable ledger. */
export async function recomputeTotalXp(userId: string): Promise<number> {
  const { _sum } = await prisma.xPEvent.aggregate({ where: { userId }, _sum: { amount: true } });
  const total = _sum.amount ?? 0;
  await prisma.user.update({ where: { id: userId }, data: { totalXp: total, currentLevel: levelForXp(total).level } });
  return total;
}
