import "server-only";
import { prisma } from "@/lib/db";
import { decideFriendRequest, pairKey } from "@/lib/social/friend-rules";
import { notify } from "@/lib/social/notifications";
import { friendIds, PROFILE_SELECT, profileCard } from "@/lib/social/profile";

export type FriendResult = { ok: true; message?: string } | { ok: false; error: string };

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<FriendResult> {
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiver) return { ok: false, error: "That person isn't on ARC." };

  const key = pairKey(senderId, receiverId);
  const existing = await prisma.friendRequest.findUnique({
    where: { pairKey: key },
    select: { id: true, senderId: true, receiverId: true, status: true, updatedAt: true },
  });
  const decision = decideFriendRequest({ senderId, receiverId, existing });
  if (!decision.ok) return decision;

  if (decision.action === "accept") return acceptRequest(senderId, existing!.id);

  const request =
    decision.action === "create"
      ? await prisma.friendRequest.create({ data: { senderId, receiverId, pairKey: key }, select: { id: true } })
      : await prisma.friendRequest.update({
          where: { pairKey: key },
          data: { senderId, receiverId, status: "PENDING" },
          select: { id: true },
        });
  await notify({ userId: receiverId, actorId: senderId, type: "FRIEND_REQUEST", referenceId: request.id });
  return { ok: true, message: "Request sent." };
}

/** Only the receiver of a pending request can accept it. */
export async function acceptRequest(userId: string, requestId: string): Promise<FriendResult> {
  const request = await prisma.friendRequest.findFirst({
    where: { id: requestId, receiverId: userId, status: "PENDING" },
    select: { id: true, senderId: true },
  });
  if (!request) return { ok: false, error: "That request is no longer open." };

  await prisma.$transaction([
    prisma.friendRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } }),
    prisma.friendship.createMany({
      data: [
        { userId, friendId: request.senderId },
        { userId: request.senderId, friendId: userId },
      ],
      skipDuplicates: true,
    }),
  ]);
  await notify({ userId: request.senderId, actorId: userId, type: "FRIEND_ACCEPTED", referenceId: request.id });
  return { ok: true, message: "You're now friends." };
}

export async function rejectRequest(userId: string, requestId: string): Promise<FriendResult> {
  const { count } = await prisma.friendRequest.updateMany({
    where: { id: requestId, receiverId: userId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  return count ? { ok: true } : { ok: false, error: "That request is no longer open." };
}

/** Withdraw a request you sent. */
export async function cancelRequest(userId: string, requestId: string): Promise<FriendResult> {
  const { count } = await prisma.friendRequest.deleteMany({ where: { id: requestId, senderId: userId, status: "PENDING" } });
  return count ? { ok: true } : { ok: false, error: "That request is no longer open." };
}

export async function removeFriend(userId: string, friendId: string): Promise<FriendResult> {
  await prisma.$transaction([
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    }),
    prisma.friendRequest.deleteMany({ where: { pairKey: pairKey(userId, friendId) } }),
  ]);
  return { ok: true };
}

export async function listFriends(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { friend: { select: PROFILE_SELECT } },
  });
  return rows.map((r) => profileCard(r.friend, "friend"));
}

export async function pendingRequests(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, sender: { select: { id: true, name: true, username: true, image: true } } },
    }),
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, receiver: { select: { id: true, name: true, username: true, image: true } } },
    }),
  ]);
  return { incoming, outgoing };
}

export type SearchResult = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  state: "friend" | "sent" | "received" | "none";
};

/**
 * Find people by username or name. Private profiles only match their exact
 * username, so they can still be added by someone who knows them.
 */
export async function searchUsers(viewerId: string, rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim().replace(/^@/, "").slice(0, 40);
  if (query.length < 2) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      username: { not: null },
      OR: [
        { username: query.toLowerCase() },
        {
          profileVisibility: { not: "PRIVATE" },
          OR: [{ username: { startsWith: query.toLowerCase() } }, { name: { contains: query, mode: "insensitive" } }],
        },
      ],
    },
    take: 10,
    orderBy: { username: "asc" },
    select: { id: true, name: true, username: true, image: true },
  });
  if (!users.length) return [];

  const [friends, requests] = await Promise.all([
    friendIds(viewerId),
    prisma.friendRequest.findMany({
      where: { pairKey: { in: users.map((u) => pairKey(viewerId, u.id)) }, status: "PENDING" },
      select: { senderId: true, receiverId: true },
    }),
  ]);
  const friendSet = new Set(friends);
  return users.map((u) => {
    const pending = requests.find((r) => r.senderId === u.id || r.receiverId === u.id);
    const state = friendSet.has(u.id) ? "friend" : pending ? (pending.senderId === viewerId ? "sent" : "received") : "none";
    return { ...u, state };
  });
}
