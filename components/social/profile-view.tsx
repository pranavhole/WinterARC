import Link from "next/link";
import { BADGE_BY_KEY, type BadgeIcon } from "@/lib/gamification/badges";
import { levelForXp } from "@/lib/gamification/levels";
import { milestoneTitle, parseMilestone } from "@/lib/social/milestones";
import type { ProfileCard } from "@/lib/social/profile";
import { Avatar } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/label";
import { BadgeMedal } from "@/components/gamification/badge-medal";
import { LevelMeter } from "@/components/gamification/level-meter";

type Milestone = {
  id: string;
  type: string;
  content: string;
  milestoneType: string | null;
  badgeKey: string | null;
  dayNumber: number | null;
  arcLength: number | null;
  createdAt: Date;
};

/** A profile, showing only what its owner allows this viewer to see. Never health data. */
export function ProfileView({
  card,
  friendCount,
  followersCount = 0,
  followingCount = 0,
  badges,
  milestones,
  actions,
}: {
  card: ProfileCard;
  friendCount: number;
  followersCount?: number;
  followingCount?: number;
  badges: { key: string; name: string; icon: BadgeIcon }[];
  milestones: Milestone[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="animate-fade">
      <div className="flex items-center gap-4">
        <Avatar src={card.image} name={card.name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{card.name ?? card.username}</h1>
          {card.username ? <p className="text-sm text-muted">@{card.username}</p> : null}
        </div>
      </div>
      {actions ? <div className="mt-5">{actions}</div> : null}

      {card.xp !== null ? (
        <div className="mt-8">
          <LevelMeter info={levelForXp(card.xp)} />
        </div>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 sm:grid-cols-5 border-y border-line">
        <Stat label="Current Arc" value={card.arcDay !== null ? `Day ${card.arcDay}` : "—"} sub={card.arcDay !== null && card.arcLength ? `of ${card.arcLength}` : undefined} />
        <Stat label="Streak" value={card.streak !== null ? String(card.streak) : "—"} sub={card.streak !== null ? (card.streak === 1 ? "day" : "days") : undefined} border />
        <Stat label="Friends" value={String(friendCount)} border />
        <Stat label="Followers" value={String(followersCount)} border />
        <Stat label="Following" value={String(followingCount)} border />
      </dl>

      {card.showBadges ? (
        <section className="mt-10" aria-labelledby="profile-badges">
          <SectionLabel>
            <span id="profile-badges">Badges</span>
          </SectionLabel>
          {badges.length ? (
            <ul className="mt-4 flex flex-wrap gap-4">
              {badges.map((b) => (
                <li key={b.key} className="flex w-20 flex-col items-center text-center">
                  <BadgeMedal icon={b.icon} earned size={44} />
                  <span className="mt-2 text-[0.6875rem] leading-tight text-muted">{b.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No badges yet.</p>
          )}
        </section>
      ) : null}

      {milestones.length ? (
        <section className="mt-10" aria-labelledby="profile-milestones">
          <SectionLabel>
            <span id="profile-milestones">Recent milestones</span>
          </SectionLabel>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {milestones.map((m) => {
              const ms = parseMilestone(m.milestoneType);
              const badge = m.badgeKey ? BADGE_BY_KEY.get(m.badgeKey) : null;
              const title = ms ? milestoneTitle(ms, m.arcLength) : badge ? badge.name : m.dayNumber ? `Day ${m.dayNumber}${m.arcLength ? ` / ${m.arcLength}` : ""}` : "Update";
              return (
                <li key={m.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                  <Link href={`/milestone/${m.id}`} className="hover:underline">
                    {title}
                  </Link>
                  <span className="text-xs text-muted">{m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub, border }: { label: string; value: string; sub?: string; border?: boolean }) {
  return (
    <div className={border ? "border-l border-line py-5 pl-4" : "py-5"}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tabular mt-1.5 text-xl font-semibold">
        {value} {sub ? <span className="text-sm font-normal text-muted">{sub}</span> : null}
      </dd>
    </div>
  );
}
