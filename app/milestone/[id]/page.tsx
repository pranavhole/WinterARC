import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { describeCard } from "@/lib/social/milestone-card";
import { visiblePost } from "@/lib/social/posts";
import { BadgeMedal } from "@/components/gamification/badge-medal";
import { PublicShell } from "@/components/social/public-shell";

type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => {
  if (id.length > 64) return null;
  const viewer = await getCurrentUser();
  const post = await visiblePost(id, viewer?.id ?? null);
  return post ? { post, viewer } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: "Milestone", robots: { index: false } };
  const card = describeCard(data.post);
  return {
    title: card.title,
    description: card.line,
    robots: { index: false, follow: false },
    openGraph: { title: `${card.title} · ARC`, description: card.line, type: "article" },
    twitter: { card: "summary_large_image", title: `${card.title} · ARC`, description: card.line },
  };
}

export default async function MilestonePage({ params }: Props) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { post, viewer } = data;
  const card = describeCard(post);

  return (
    <PublicShell signedIn={!!viewer}>
      <article className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-surface px-8 py-12 text-center">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.35em] text-muted">ARC</p>
        {card.badge ? <BadgeMedal icon={card.badge.icon} earned size={64} className="mx-auto mt-8" /> : null}
        <h1 className="mt-8 text-2xl font-semibold uppercase tracking-[0.12em]">{card.title}</h1>
        <p className="mt-4 text-sm text-muted">{card.line}</p>
        {post.content ? <p className="mt-6 whitespace-pre-line text-[0.9375rem] leading-relaxed">{post.content}</p> : null}
        {post.dayNumber && !card.title.startsWith("Day") ? (
          <p className="tabular mt-8 text-xs uppercase tracking-[0.14em] text-muted">
            Day {post.dayNumber}
            {post.arcLength ? ` / ${post.arcLength}` : ""}
          </p>
        ) : null}
      </article>
      {post.author.username ? (
        <p className="mt-6 text-center text-sm">
          <Link href={`/u/${post.author.username}`} className="text-muted hover:text-fg">
            View {post.author.name ?? post.author.username}&apos;s Arc
          </Link>
        </p>
      ) : null}
    </PublicShell>
  );
}
