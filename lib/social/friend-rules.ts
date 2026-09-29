/** Friend request rules. Pure, so the edge cases are unit-tested. */

export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type ExistingRequest = { senderId: string; receiverId: string; status: RequestStatus; updatedAt: Date } | null;

/** One request per pair of users, whichever of them sent it. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** After a rejection the sender may ask again, but not before this long. */
export const RESEND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type RequestDecision =
  | { ok: true; action: "create" | "accept" | "resend" }
  | { ok: false; error: string };

export function decideFriendRequest(input: {
  senderId: string;
  receiverId: string;
  existing: ExistingRequest;
  now?: Date;
}): RequestDecision {
  const { senderId, receiverId, existing } = input;
  const now = input.now ?? new Date();
  if (senderId === receiverId) return { ok: false, error: "You can't add yourself." };
  if (!existing) return { ok: true, action: "create" };
  if (existing.status === "ACCEPTED") return { ok: false, error: "You're already friends." };
  if (existing.status === "PENDING") {
    // They already asked you: sending back means yes.
    if (existing.senderId === receiverId) return { ok: true, action: "accept" };
    return { ok: false, error: "Request already sent." };
  }
  // REJECTED
  if (existing.senderId === senderId && now.getTime() - existing.updatedAt.getTime() < RESEND_AFTER_MS) {
    return { ok: false, error: "Request already sent." };
  }
  return { ok: true, action: "resend" };
}
