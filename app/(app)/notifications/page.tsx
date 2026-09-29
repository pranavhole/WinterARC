import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BADGE_BY_KEY } from "@/lib/gamification/badges";
import { listNotifications } from "@/lib/social/notifications";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/label";
import { MarkRead } from "@/components/social/mark-read";

export const metadata: Metadata = { title: "Notifications" };

type Item = Awaited<ReturnType<typeof listNotifications>>[number];

function describe(n: Item): { text: string; href: string | null } {
  const who = n.actor?.name ?? n.actor?.username ?? "Someone";
  switch (n.type) {
    case "FRIEND_REQUEST":
      return { text: `${who} sent you a friend request.`, href: "/friends" };
    case "FRIEND_ACCEPTED":
      return { text: `${who} accepted your friend request.`, href: n.actor?.username ? `/u/${n.actor.username}` : "/friends" };
    case "REACTION":
      return { text: `${who} reacted to your post.`, href: n.referenceId ? `/milestone/${n.referenceId}` : "/social" };
    case "BADGE":
      return { text: `You unlocked ${BADGE_BY_KEY.get(n.referenceId ?? "")?.name ?? "a new badge"}.`, href: "/badges" };
    case "STREAK":
      return { text: `You reached a ${n.referenceId} day streak.`, href: "/arc/progress" };
  }
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  const unread = items.some((n) => !n.read);

  return (
    <div className="animate-fade">
      <SectionLabel as="h1">Notifications</SectionLabel>
      {items.length ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((n) => {
            const { text, href } = describe(n);
            const body = (
              <>
                <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-fg")} aria-hidden="true" />
                <span className="flex-1">{text}</span>
                <span className="shrink-0 text-xs text-muted">{n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link href={href} className="flex gap-3 py-3.5 text-sm hover:bg-subtle">
                    {body}
                  </Link>
                ) : (
                  <p className="flex gap-3 py-3.5 text-sm">{body}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-10 text-center text-sm text-muted">Nothing yet.</p>
      )}
      {unread ? <MarkRead /> : null}
    </div>
  );
}
