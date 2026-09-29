import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getBadgeBoard, getXpSummary } from "@/lib/gamification/board";
import { LevelMeter } from "@/components/gamification/level-meter";
import { BadgeMedal } from "@/components/gamification/badge-medal";
import { BadgeShareButton } from "@/components/gamification/badge-share-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Badges" };

export default async function BadgesPage() {
  const user = await requireUser();
  const [badges, xp] = await Promise.all([getBadgeBoard(user.id), getXpSummary(user.id)]);
  const earned = badges.filter((b) => b.earnedAt);
  const locked = badges.filter((b) => !b.earnedAt);

  return (
    <div className="animate-fade">
      <LevelMeter info={xp} />

      <section aria-labelledby="earned-heading" className="mt-10">
        <SectionLabel>
          <span id="earned-heading">Your badges · {earned.length} / {badges.length}</span>
        </SectionLabel>
        {earned.length ? (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {earned.map((b) => (
              <li key={b.key} className="flex items-center gap-4 py-4">
                <BadgeMedal icon={b.icon} earned />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted">
                    {b.description} · Earned {b.earnedAt!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <BadgeShareButton badge={{ key: b.key, name: b.name, description: b.description }} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Complete your first Arc day to earn your first badge.</p>
        )}
      </section>

      <section aria-labelledby="locked-heading" className="mt-10">
        <SectionLabel>
          <span id="locked-heading">Still ahead</span>
        </SectionLabel>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {locked.map((b) => (
            <li key={b.key} className="flex items-center gap-4 py-4">
              <BadgeMedal icon={b.icon} earned={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">{b.name}</p>
                  {b.progress && b.progress.target > 1 ? (
                    <span className="tabular text-xs text-muted">
                      {b.progress.current} / {b.progress.target}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">{b.description}</p>
                {b.progress && b.progress.target > 1 ? (
                  <ProgressBar value={b.progress.current / b.progress.target} label={`${b.name} progress`} thin className="mt-2" />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Badges come from your Arc: showing up, consistency and finishing. Never from likes or followers.</p>
      </section>
    </div>
  );
}
