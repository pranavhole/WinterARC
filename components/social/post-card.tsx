"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { deletePostAction, reactAction } from "@/lib/actions/social";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { milestoneHeadline, milestoneTitle, parseMilestone } from "@/lib/social/milestones";
import { REACTION_EMOJI, REACTION_LABEL, type Reaction } from "@/lib/social/reactions";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { BadgeMedal } from "@/components/gamification/badge-medal";

export type PostView = {
  id: string;
  type: "PROGRESS" | "MILESTONE" | "BADGE" | "REFLECTION" | "CUSTOM";
  content: string;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  milestoneType: string | null;
  badgeKey: string | null;
  dayNumber: number | null;
  arcLength: number | null;
  streak: number | null;
  createdAt: Date | string;
  isMine: boolean;
  author: { name: string | null; username: string | null; image: string | null };
  reactions: { type: Reaction; count: number; mine: boolean }[];
};

function timeAgo(value: Date | string): string {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PostCard({ post, onDeleted }: { post: PostView; onDeleted?: (id: string) => void }) {
  const name = post.author.name ?? post.author.username ?? "Someone";
  const profile = post.author.username ? `/u/${post.author.username}` : null;
  const [reactions, toggle] = useOptimistic(post.reactions, (list, type: Reaction) =>
    list.map((r) => (r.type === type ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r)),
  );
  const [, start] = useTransition();

  const milestone = post.type === "MILESTONE" ? parseMilestone(post.milestoneType) : null;
  const badge = post.type === "BADGE" && post.badgeKey ? BADGE_BY_KEY.get(post.badgeKey) : null;

  let headline: string | null = null;
  if (milestone) headline = milestoneHeadline(milestone);
  else if (badge) headline = "earned a badge.";
  else if (post.type === "PROGRESS" && post.dayNumber) headline = `is on Day ${post.dayNumber} of their Arc.`;

  return (
    <article className="border-b border-line py-6">
      <header className="flex items-center gap-3">
        <Avatar src={post.author.image} name={name} size={32} />
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate">
            {profile ? (
              <Link href={profile} className="font-medium hover:underline">
                {name}
              </Link>
            ) : (
              <span className="font-medium">{name}</span>
            )}{" "}
            {headline ? <span className="text-muted">{headline}</span> : null}
          </p>
          <p className="text-xs text-muted">
            {timeAgo(post.createdAt)}
            {post.isMine ? ` · ${post.visibility === "PUBLIC" ? "Public" : post.visibility === "FRIENDS" ? "Friends" : "Only you"}` : ""}
          </p>
        </div>
        {post.isMine ? (
          <button
            type="button"
            onClick={() =>
              start(async () => {
                if ((await deletePostAction(post.id)).ok) onDeleted?.(post.id);
              })
            }
            className="text-xs text-muted hover:text-fg"
          >
            Delete
          </button>
        ) : null}
      </header>

      {milestone ? (
        <div className="mt-4 rounded-xl bg-subtle px-5 py-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em]">{milestoneTitle(milestone, post.arcLength)}</p>
          {post.streak ? <p className="tabular mt-1 text-xs text-muted">{post.streak} day streak</p> : null}
        </div>
      ) : null}

      {badge ? (
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-subtle px-5 py-4">
          <BadgeMedal icon={badge.icon} earned size={40} />
          <div>
            <p className="text-sm font-semibold">{badge.name}</p>
            <p className="text-xs text-muted">{badge.description}</p>
          </div>
        </div>
      ) : null}

      {post.type === "PROGRESS" && post.dayNumber ? (
        <div className="mt-4 rounded-xl bg-subtle px-5 py-5">
          <p className="tabular text-sm font-semibold uppercase tracking-[0.14em]">
            Day {post.dayNumber}
            {post.arcLength ? ` / ${post.arcLength}` : ""}
          </p>
          {post.streak ? <p className="tabular mt-1 text-xs text-muted">{post.streak} day streak</p> : null}
        </div>
      ) : null}

      {post.content ? <p className="mt-4 whitespace-pre-line text-[0.9375rem] leading-relaxed">{post.content}</p> : null}

      <footer className="mt-4 flex items-center gap-2">
        {reactions.map((r) => (
          <button
            key={r.type}
            type="button"
            aria-pressed={r.mine}
            aria-label={`${REACTION_LABEL[r.type]}${r.count ? `, ${r.count}` : ""}`}
            onClick={() =>
              start(async () => {
                toggle(r.type);
                await reactAction(post.id, r.type);
              })
            }
            className={cn(
              "tabular flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
              r.mine ? "border-fg bg-subtle" : "border-line text-muted hover:border-fg",
            )}
          >
            <span aria-hidden="true">{REACTION_EMOJI[r.type]}</span>
            {r.count ? r.count : null}
          </button>
        ))}
        {profile && (milestone || post.type === "PROGRESS") ? (
          <Link href={profile} className="ml-auto text-xs text-muted hover:text-fg">
            View Arc
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
