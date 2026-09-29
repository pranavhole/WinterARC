import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listFriends, pendingRequests } from "@/lib/social/friends";
import { ensureUsername } from "@/lib/social/profile";
import { Avatar } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/label";
import { CancelRequestButton, FriendSearch, RemoveFriendButton, RequestButtons } from "@/components/social/friend-actions";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await requireUser();
  await ensureUsername(user.id);
  const [friends, { incoming, outgoing }] = await Promise.all([listFriends(user.id), pendingRequests(user.id)]);

  return (
    <div className="animate-fade space-y-10">
      <section aria-labelledby="find-heading">
        <SectionLabel>
          <span id="find-heading">Find people</span>
        </SectionLabel>
        <div className="mt-3">
          <FriendSearch />
        </div>
      </section>

      {incoming.length ? (
        <section aria-labelledby="requests-heading">
          <SectionLabel>
            <span id="requests-heading">Requests</span>
          </SectionLabel>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {incoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Avatar src={r.sender.image} name={r.sender.name} size={32} />
                <Link href={`/u/${r.sender.username}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  {r.sender.name ?? r.sender.username}
                </Link>
                <RequestButtons requestId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="friends-heading">
        <SectionLabel>
          <span id="friends-heading">Friends</span>
        </SectionLabel>
        {friends.length ? (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-4 py-4">
                <Avatar src={f.image} name={f.name} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${f.username}`} className="block truncate text-[0.9375rem] hover:underline">
                    {f.name ?? f.username}
                  </Link>
                  <p className="tabular mt-0.5 text-xs text-muted">
                    {[
                      f.arcDay !== null ? `Day ${f.arcDay}${f.arcLength ? ` / ${f.arcLength}` : ""}` : null,
                      f.streak !== null ? `${f.streak} day streak` : null,
                      f.level !== null ? `Level ${f.level}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Keeping their Arc private"}
                  </p>
                </div>
                <RemoveFriendButton friendId={f.id} name={f.name ?? "this friend"} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No friends yet. An Arc is easier with people who notice.</p>
        )}
      </section>

      {outgoing.length ? (
        <section aria-labelledby="sent-heading">
          <SectionLabel>
            <span id="sent-heading">Sent</span>
          </SectionLabel>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Avatar src={r.receiver.image} name={r.receiver.name} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{r.receiver.name ?? r.receiver.username}</span>
                <CancelRequestButton requestId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
