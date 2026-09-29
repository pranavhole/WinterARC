"use client";

import { useState, useTransition } from "react";
import { loadFeedPage } from "@/lib/actions/social";
import { buttonClass } from "@/components/ui/button";
import { PostCard, type PostView } from "@/components/social/post-card";

/** First page comes from the server; "Load more" fetches the next 20 by cursor. */
export function FeedList({ initial, nextCursor, scope }: { initial: PostView[]; nextCursor: string | null; scope: "all" | "following" | "friends" }) {
  const [posts, setPosts] = useState(initial);
  const [cursor, setCursor] = useState(nextCursor);
  const [pending, start] = useTransition();

  if (!posts.length) {
    return (
      <p className="py-16 text-center text-sm text-muted">
        {scope === "following"
          ? "Nothing from people you follow yet."
          : scope === "friends"
            ? "Nothing from your friends yet."
            : "No posts yet. Share the first milestone."}
      </p>
    );
  }

  return (
    <div>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))} />
      ))}
      {cursor ? (
        <div className="py-8 text-center">
          <button
            type="button"
            disabled={pending}
            className={buttonClass("secondary", "min-w-32")}
            onClick={() =>
              start(async () => {
                const page = await loadFeedPage(scope, cursor);
                setPosts((list) => [...list, ...page.items.filter((p) => !list.some((x) => x.id === p.id))]);
                setCursor(page.nextCursor);
              })
            }
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
