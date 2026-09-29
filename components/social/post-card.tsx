"use client";

import Link from "next/link";
import { useState, useOptimistic, useTransition, type FormEvent } from "react";
import {
  deletePostAction,
  reactAction,
  addCommentAction,
  deleteCommentAction,
  getCommentsAction,
  blockUserAction,
  reportAction,
  type CommentView,
} from "@/lib/actions/social";
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
  authorId?: string;
  author: { name: string | null; username: string | null; image: string | null };
  reactions: { type: Reaction; count: number; mine: boolean }[];
  commentsCount?: number;
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

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentView[] | null>(null);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);
  const [commentText, setCommentText] = useState("");
  const [commentPending, setCommentPending] = useState(false);

  // Moderation state
  const [showMenu, setShowMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState<"SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "OTHER">("SPAM");
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const milestone = post.type === "MILESTONE" ? parseMilestone(post.milestoneType) : null;
  const badge = post.type === "BADGE" && post.badgeKey ? BADGE_BY_KEY.get(post.badgeKey) : null;

  let headline: string | null = null;
  if (milestone) headline = milestoneHeadline(milestone);
  else if (badge) headline = "earned a badge.";
  else if (post.type === "PROGRESS" && post.dayNumber) headline = `is on Day ${post.dayNumber} of their Arc.`;

  async function handleToggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      const res = await getCommentsAction(post.id);
      if (res.ok) setComments(res.comments);
    }
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || commentPending) return;
    setCommentPending(true);
    const res = await addCommentAction(post.id, commentText);
    setCommentPending(false);
    if (res.ok && res.comment) {
      setComments((prev) => (prev ? [...prev, res.comment!] : [res.comment!]));
      setCommentsCount((c) => c + 1);
      setCommentText("");
    }
  }

  async function handleDeleteComment(commentId: string) {
    setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : null));
    setCommentsCount((c) => Math.max(0, c - 1));
    await deleteCommentAction(commentId);
  }

  async function handleBlock() {
    if (!post.authorId) return;
    if (confirm(`Block ${name}? You will no longer see each other's posts or comments.`)) {
      await blockUserAction(post.authorId);
      setBlocked(true);
      setShowMenu(false);
    }
  }

  async function handleSubmitReport(e: FormEvent) {
    e.preventDefault();
    if (!post.authorId) return;
    await reportAction({
      reportedId: post.authorId,
      postId: post.id,
      reason: reportReason,
    });
    setReported(true);
    setReporting(false);
    setShowMenu(false);
  }

  if (blocked) {
    return (
      <article className="border-b border-line py-4 text-xs text-muted">
        User blocked. Their posts have been hidden.
      </article>
    );
  }

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
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="text-xs text-muted hover:text-fg p-1 rounded"
              aria-label="Post options"
            >
              ···
            </button>
            {showMenu ? (
              <div className="absolute right-0 top-6 z-10 w-32 rounded-lg border border-line bg-bg p-1 shadow-lg text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setReporting(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-subtle rounded"
                >
                  Report post
                </button>
                {post.authorId ? (
                  <button
                    type="button"
                    onClick={handleBlock}
                    className="w-full text-left px-2 py-1.5 hover:bg-subtle text-danger rounded"
                  >
                    Block user
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </header>

      {reporting ? (
        <form onSubmit={handleSubmitReport} className="mt-3 rounded-lg border border-line bg-subtle p-3 text-xs">
          <p className="font-medium mb-2">Report this post</p>
          <div className="flex gap-2 items-center mb-2">
            <label className="text-muted">Reason:</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "OTHER")}
              className="rounded border border-line bg-bg px-2 py-1 text-xs"
            >
              <option value="SPAM">Spam</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="INAPPROPRIATE">Inappropriate</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-fg px-3 py-1 text-xs text-bg">
              Submit
            </button>
            <button type="button" onClick={() => setReporting(false)} className="px-2 py-1 text-muted hover:text-fg">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {reported ? <p className="mt-2 text-xs text-muted">Thank you. Your report was submitted.</p> : null}

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

      <footer className="mt-4 flex flex-wrap items-center gap-2">
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

        <button
          type="button"
          onClick={handleToggleComments}
          aria-expanded={showComments}
          className={cn(
            "tabular flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
            showComments ? "border-fg bg-subtle text-fg" : "border-line text-muted hover:border-fg",
          )}
        >
          <span aria-hidden="true">💬</span>
          {commentsCount > 0 ? commentsCount : "Comment"}
        </button>

        {profile && (milestone || post.type === "PROGRESS") ? (
          <Link href={profile} className="ml-auto text-xs text-muted hover:text-fg">
            View Arc
          </Link>
        ) : null}
      </footer>

      {showComments ? (
        <section className="mt-4 border-t border-line/60 pt-4" aria-label="Comments">
          {comments === null ? (
            <p className="text-xs text-muted">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted">No comments yet. Start the conversation!</p>
          ) : (
            <ul className="space-y-3 mb-4">
              {comments.map((c) => {
                const authorName = c.author.name ?? c.author.username ?? "Someone";
                const authorProfile = c.author.username ? `/u/${c.author.username}` : null;
                return (
                  <li key={c.id} className="flex gap-2.5 text-xs">
                    <Avatar src={c.author.image} name={authorName} size={24} />
                    <div className="flex-1 rounded-lg bg-subtle/80 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {authorProfile ? (
                            <Link href={authorProfile} className="hover:underline">
                              {authorName}
                            </Link>
                          ) : (
                            authorName
                          )}
                        </span>
                        <div className="flex items-center gap-2 text-muted">
                          <span>{timeAgo(c.createdAt)}</span>
                          {c.canDelete ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className="hover:text-danger text-[11px]"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-fg text-[0.8125rem]">{c.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              maxLength={300}
              className="flex-1 rounded-full border border-line bg-bg px-4 py-1.5 text-xs placeholder:text-muted focus:border-fg focus:outline-none"
            />
            <button
              type="submit"
              disabled={commentPending || !commentText.trim()}
              className="rounded-full bg-fg px-4 py-1.5 text-xs text-bg transition-opacity disabled:opacity-40"
            >
              {commentPending ? "..." : "Reply"}
            </button>
          </form>
        </section>
      ) : null}
    </article>
  );
}
