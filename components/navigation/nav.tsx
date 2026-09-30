"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BadgeIcon,
  ClockIcon,
  CommunityIcon,
  ProgressIcon,
  SettingsIcon,
  TodayIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from "@/components/ui/icons";

type NavLink = { href: string; label: string; icon: typeof TodayIcon; also?: string[] };

// The Arc comes first; the social layer sits below it.
const ARC: NavLink[] = [
  { href: "/arc", label: "Today", icon: TodayIcon },
  { href: "/arc/plan", label: "Plan", icon: ClockIcon },
  { href: "/arc/progress", label: "Progress", icon: ProgressIcon },
];

const PEOPLE: NavLink[] = [
  { href: "/social", label: "Community", icon: CommunityIcon },
  { href: "/friends", label: "Friends", icon: UsersIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { href: "/badges", label: "Badges", icon: BadgeIcon },
];

const ME: NavLink[] = [
  { href: "/profile", label: "Profile", icon: UserIcon, also: ["/notifications"] },
  { href: "/arc/settings", label: "Settings", icon: SettingsIcon },
];

const MOBILE: NavLink[] = [
  { href: "/arc", label: "Today", icon: TodayIcon, also: ["/arc/plan"] },
  { href: "/arc/progress", label: "Progress", icon: ProgressIcon },
  { href: "/social", label: "Social", icon: CommunityIcon, also: ["/friends", "/leaderboard"] },
  { href: "/profile", label: "Profile", icon: UserIcon, also: ["/badges", "/notifications", "/arc/settings"] },
];

function useIsActive() {
  const pathname = usePathname();
  const matches = (href: string) => (href === "/arc" ? pathname === "/arc" : pathname === href || pathname.startsWith(`${href}/`));
  return (link: NavLink) => matches(link.href) || (link.also ?? []).some(matches);
}

export function SidebarNav({ unread }: { unread: number }) {
  const isActive = useIsActive();
  const item = (link: NavLink) => {
    const active = isActive(link);
    return (
      <Link
        key={link.href}
        href={link.href}
        prefetch={false}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-lg px-3 text-[0.8125rem] transition-colors",
          active ? "bg-subtle text-fg" : "text-muted hover:text-fg",
        )}
      >
        <link.icon size={15} />
        {link.label}
        {link.href === "/profile" && unread > 0 ? <UnreadDot count={unread} /> : null}
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col">
      <div className="space-y-0.5">{ARC.map(item)}</div>
      <div className="mt-5 space-y-0.5 border-t border-line pt-5">{PEOPLE.map(item)}</div>
      <div className="mt-auto space-y-0.5 border-t border-line pt-3">{ME.map(item)}</div>
    </nav>
  );
}

export function BottomNav({ unread }: { unread: number }) {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {MOBILE.map((link) => {
          const active = isActive(link);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[0.75rem] transition-colors",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <link.icon size={18} strokeWidth={active ? 2.1 : 1.75} />
                {link.label}
                {link.href === "/profile" && unread > 0 ? (
                  <span className="absolute right-[calc(50%-14px)] top-3 h-1.5 w-1.5 rounded-full bg-fg" aria-label={`${unread} unread`} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UnreadDot({ count }: { count: number }) {
  return (
    <span className="tabular ml-auto rounded-full bg-fg px-1.5 text-[0.6875rem] leading-4 text-bg" aria-label={`${count} unread notifications`}>
      {count > 9 ? "9+" : count}
    </span>
  );
}
