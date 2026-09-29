import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Create a notification. With a dedupeKey it is only ever created once. */
export async function notify(input: {
  userId: string;
  type: NotificationType;
  actorId?: string | null;
  referenceId?: string | null;
  dedupeKey?: string;
}) {
  if (input.actorId && input.actorId === input.userId) return;
  await prisma.notification.createMany({
    data: [
      {
        userId: input.userId,
        type: input.type,
        actorId: input.actorId ?? null,
        referenceId: input.referenceId ?? null,
        dedupeKey: input.dedupeKey ?? null,
      },
    ],
    skipDuplicates: true,
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

const PAGE = 30;

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PAGE,
    select: {
      id: true,
      type: true,
      referenceId: true,
      read: true,
      createdAt: true,
      actor: { select: { name: true, username: true } },
    },
  });
}
