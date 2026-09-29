import "server-only";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { milestoneTitle, parseMilestone } from "@/lib/social/milestones";
import type { visiblePost } from "@/lib/social/posts";

type CardPost = NonNullable<Awaited<ReturnType<typeof visiblePost>>>;

/** Title and one line for a milestone card. Only the milestone itself, never private metrics or health data. */
export function describeCard(post: CardPost) {
  const who = post.author.name ?? post.author.username ?? "Someone";
  const m = parseMilestone(post.milestoneType);
  const badge = post.badgeKey ? (BADGE_BY_KEY.get(post.badgeKey) ?? null) : null;
  if (m?.kind === "ARC_COMPLETE") return { title: "Arc complete", line: `${who} finished their Arc.`, badge: null };
  if (m?.kind === "STREAK") return { title: `${m.n} day discipline`, line: `${who} showed up ${m.n} days in a row.`, badge: null };
  if (m) return { title: milestoneTitle(m, post.arcLength), line: `${who} completed Day ${m.n} of their Arc.`, badge: null };
  if (badge) return { title: badge.name, line: `${who} earned ${badge.name}.`, badge };
  if (post.dayNumber) return { title: `Day ${post.dayNumber}${post.arcLength ? ` / ${post.arcLength}` : ""}`, line: `${who}'s Arc.`, badge: null };
  return { title: "ARC", line: `${who}'s Arc.`, badge: null };
}
