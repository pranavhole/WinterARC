"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  cancelFriendRequestAction,
  removeFriendAction,
  respondFriendRequestAction,
  searchUsersAction,
  sendFriendRequestAction,
} from "@/lib/actions/friends";
import type { SearchResult } from "@/lib/social/friends";
import { buttonClass } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function FriendSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => start(async () => setResults(await searchUsersAction(q))), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const shown = query.trim().length >= 2 ? results : null;

  return (
    <div>
      <label htmlFor="friend-search" className="sr-only">
        Search people
      </label>
      <input
        id="friend-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or @username"
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-fg"
      />
      {shown ? (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
          {shown.length === 0 ? <li className="px-3 py-3 text-sm text-muted">No one found.</li> : null}
          {shown.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar src={r.image} name={r.name} size={28} />
              <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                {r.name ?? r.username} <span className="text-muted">@{r.username}</span>
              </Link>
              <SearchAction result={r} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SearchAction({ result }: { result: SearchResult }) {
  const [state, setState] = useState(result.state);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (state === "friend") return <span className="text-xs text-muted">Friends</span>;
  if (state === "sent") return <span className="text-xs text-muted">Requested</span>;
  return (
    <span className="flex items-center gap-2">
      {error ? <span className="text-xs text-muted">{error}</span> : null}
      <button
        type="button"
        disabled={pending}
        className={buttonClass("secondary", "min-h-9 px-3 text-xs")}
        onClick={() =>
          start(async () => {
            const res = await sendFriendRequestAction(result.id);
            if (res.ok) setState(state === "received" ? "friend" : "sent");
            else setError(res.error);
          })
        }
      >
        {state === "received" ? "Accept" : "Add friend"}
      </button>
    </span>
  );
}

export function RequestButtons({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => respondFriendRequestAction(requestId, true).then(() => undefined))} className={buttonClass("primary", "min-h-9 px-3 text-xs")}>
        Accept
      </button>
      <button type="button" disabled={pending} onClick={() => start(() => respondFriendRequestAction(requestId, false).then(() => undefined))} className={buttonClass("ghost", "min-h-9 px-3 text-xs")}>
        Decline
      </button>
    </span>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => cancelFriendRequestAction(requestId).then(() => undefined))} className="text-xs text-muted hover:text-fg">
      Cancel
    </button>
  );
}

export function AddFriendButton({ userId, state }: { userId: string; state: "none" | "sent" | "received" }) {
  const [current, setCurrent] = useState(state);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (current === "sent") return <p className="text-sm text-muted">Request sent</p>;
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={buttonClass("primary")}
        onClick={() =>
          start(async () => {
            const res = await sendFriendRequestAction(userId);
            if (res.ok) setCurrent("sent");
            else setError(res.error);
          })
        }
      >
        {current === "received" ? "Accept request" : "Add friend"}
      </button>
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
    </div>
  );
}

export function RemoveFriendButton({ friendId, name }: { friendId: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="text-xs text-muted hover:text-fg">
        Remove
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-muted">Remove {name}?</span>
      <button type="button" disabled={pending} onClick={() => start(() => removeFriendAction(friendId).then(() => undefined))} className="font-medium hover:underline">
        Yes
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="text-muted hover:text-fg">
        No
      </button>
    </span>
  );
}
