import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { getFeed } from "@/lib/social/feed";
import { milestoneKey, milestoneTitle, reachedMilestones } from "@/lib/social/milestones";
import { getShareState } from "@/lib/social/posts";
import { cn } from "@/lib/utils";
import { Composer } from "@/components/social/composer";
import { FeedList } from "@/components/social/feed-list";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Community" };

export default async function SocialPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireUser();
  const rawScope = (await searchParams).scope;
  const scope = rawScope === "friends" ? "friends" : rawScope === "following" ? "following" : "all";
  const [feed, share] = await Promise.all([getFeed(user.id, scope), getShareState(user.id)]);

  const milestones = share.milestone
    ? reachedMilestones(share.milestone).map((m) => ({ value: milestoneKey(m), label: milestoneTitle(m, share.milestone!.arcLength || null) }))
    : [];
  const badges = [...share.badges].flatMap((key) => {
    const def = BADGE_BY_KEY.get(key);
    return def ? [{ value: def.key, label: def.name }] : [];
  });

  return (
    <div className="animate-fade">
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionLabel as="h1">Arc community</SectionLabel>
          <p className="mt-2 text-sm text-muted">Progress, milestones and reflections from people doing their Arc.</p>
        </div>
        <nav aria-label="Feed" className="flex shrink-0 rounded-lg border border-line p-0.5 text-xs">
          {(["all", "following", "friends"] as const).map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/social" : `/social?scope=${s}`}
              aria-current={scope === s ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5", scope === s ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              {s === "all" ? "Everyone" : s === "following" ? "Following" : "Friends"}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        <Composer milestones={milestones} badges={badges} hasArc={share.overview !== null} />
      </div>

      <section aria-label="Posts" className="mt-4">
        <FeedList key={`${scope}:${feed.items[0]?.id ?? "none"}:${feed.items.length}`} initial={feed.items} nextCursor={feed.nextCursor} scope={scope} />
      </section>
    </div>
  );
}
