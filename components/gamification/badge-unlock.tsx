"use client";

import { useState, useTransition } from "react";
import { markBadgeSeenAction } from "@/lib/actions/profile";
import type { BadgeIcon } from "@/lib/gamification/badges";
import { buttonClass } from "@/components/ui/button";
import { BadgeMedal } from "@/components/gamification/badge-medal";
import { ShareDialog } from "@/components/share/share-dialog";

type UnlockBadge = { key: string; name: string; unlockLine: string; icon: BadgeIcon; xpReward: number; major: boolean };

/**
 * The unlock moment: one card, a subtle fade and lift, no confetti, no sound.
 * Finishing the Arc gets its own "ARC COMPLETE" card with share options.
 */
export function BadgeUnlock({ badge }: { badge: UnlockBadge }) {
  const [open, setOpen] = useState(true);
  const [sharing, setSharing] = useState<null | "arc" | "linkedin">(null);
  const [, start] = useTransition();
  const finisher = badge.key === "NINETY_DAY_FINISHER";

  const dismiss = () => {
    setOpen(false);
    start(() => markBadgeSeenAction(badge.key).then(() => undefined));
  };

  if (sharing) {
    return (
      <ShareDialog
        open
        initialTab={sharing}
        onClose={dismiss}
        target={finisher ? { kind: "milestone", milestoneType: "ARC_COMPLETE", title: "Arc complete", arcLength: null } : { kind: "badge", badgeKey: badge.key, title: badge.name, description: badge.unlockLine.replace(/\n/g, " "), dayNumber: null, arcLength: null }}
      />
    );
  }
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-fg/25 px-4" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="animate-unlock w-full max-w-sm rounded-2xl border border-line bg-bg px-7 py-9 text-center">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-muted">{finisher ? "Arc complete" : "Badge unlocked"}</p>
        <BadgeMedal icon={badge.icon} earned size={64} className="mx-auto mt-7" />
        <h2 id="unlock-title" className="mt-6 text-base font-semibold uppercase tracking-[0.14em]">
          {finisher ? "90 days." : badge.name}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{badge.unlockLine}</p>
        <p className="tabular mt-5 text-sm font-medium">+{badge.xpReward.toLocaleString("en-US")} XP</p>

        {finisher ? (
          <div className="mt-8 space-y-2">
            <p className="mb-3 text-sm">Share your completion?</p>
            <button type="button" onClick={() => setSharing("arc")} className={buttonClass("primary", "w-full")}>
              Share on ARC
            </button>
            <button type="button" onClick={() => setSharing("linkedin")} className={buttonClass("secondary", "w-full")}>
              Share on LinkedIn
            </button>
            <button type="button" onClick={dismiss} className={buttonClass("ghost", "w-full")}>
              Not now
            </button>
          </div>
        ) : (
          <div className="mt-8 flex gap-2">
            {badge.major ? (
              <button type="button" onClick={() => setSharing("arc")} className={buttonClass("secondary", "flex-1")}>
                Share
              </button>
            ) : null}
            <button type="button" onClick={dismiss} autoFocus className={buttonClass("primary", "flex-1")}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
