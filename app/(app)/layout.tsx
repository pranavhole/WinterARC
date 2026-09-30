import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { unseenBadges } from "@/lib/gamification/board";
import { syncIfStale } from "@/lib/health/sync";
import { unreadNotificationCount } from "@/lib/social/notifications";
import { BottomNav, SidebarNav } from "@/components/navigation/nav";
import { BadgeUnlock } from "@/components/gamification/badge-unlock";
import { AndroidAppBanner } from "@/components/android/app-banner";
import { Avatar } from "@/components/ui/avatar";
import { BellIcon, MountainIcon, SettingsIcon } from "@/components/ui/icons";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [unread, unseen] = await Promise.all([unreadNotificationCount(user.id), unseenBadges(user.id)]);
  const firstName = user.name?.trim().split(/\s+/)[0] || null;
  const unlock = unseen.map((u) => BADGE_BY_KEY.get(u.badge.key)).find((b) => b !== undefined);

  // Keep health data fresh without polling: sync after the page is sent, only when stale.
  after(() => syncIfStale(user.id).catch((error) => console.error("health sync failed", error)));

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-360">
      <aside className="sticky top-0 hidden h-svh w-52 shrink-0 flex-col border-r border-line px-4 py-7 md:flex">
        <Link href="/arc" prefetch={false} className="mb-8 px-3">
          <Wordmark />
        </Link>
        <SidebarNav unread={unread} />
        <div className="mt-6 px-3 text-xs leading-relaxed text-muted">
          <MountainIcon size={18} className="mb-2" />
          Better habits.
          <br />
          Bigger dreams.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between px-4 sm:px-8 md:h-20 md:justify-end md:px-8">
          <Link href="/arc" prefetch={false} className="flex h-11 items-center md:hidden">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <span className="mr-4 hidden text-xs text-muted lg:inline">Your Arc. Your Rules.</span>
            <Link
              href="/notifications"
              prefetch={false}
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative flex h-11 w-11 items-center justify-center text-muted hover:text-fg"
            >
              <BellIcon size={18} />
              {unread ? <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-fg" /> : null}
            </Link>
            {/* The sidebar has Settings on desktop; the phone bottom bar has no room, so it lives here. */}
            <Link
              href="/arc/settings"
              prefetch={false}
              aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center text-muted hover:text-fg md:hidden"
            >
              <SettingsIcon size={18} />
            </Link>
            <Link href="/profile" prefetch={false} aria-label="Your profile" className="flex h-11 items-center gap-2.5 pl-1">
              <Avatar src={user.image} name={user.name} size={30} />
              {firstName ? <span className="hidden text-sm lg:inline">Hi, {firstName}</span> : null}
            </Link>
          </div>
        </header>

        {/* Pages that mark themselves data-wide (the Today dashboard) use the full width. */}
        <main className="w-full flex-1 px-4 pb-28 pt-2 sm:px-8 md:max-w-2xl md:px-12 md:pb-16 md:pt-0 md:has-data-wide:max-w-none">
          <AndroidAppBanner />
          {children}
        </main>
      </div>

      <BottomNav unread={unread} />

      {unlock ? (
        <BadgeUnlock
          key={unlock.key}
          badge={{ key: unlock.key, name: unlock.name, unlockLine: unlock.unlockLine, icon: unlock.icon, xpReward: unlock.xpReward, major: unlock.major }}
        />
      ) : null}
    </div>
  );
}
