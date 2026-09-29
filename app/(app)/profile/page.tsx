import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ensureUsername, getProfile } from "@/lib/social/profile";
import { buttonClass } from "@/components/ui/button";
import { ProfileView } from "@/components/social/profile-view";
import { CopyLink } from "@/components/social/copy-link";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const username = await ensureUsername(user.id);
  const profile = await getProfile(username, user.id);
  if (!profile?.visible) redirect("/arc");

  return (
    <ProfileView
      card={profile.card}
      friendCount={profile.friendCount}
      badges={profile.badges}
      milestones={profile.milestones}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/u/${username}`} className={buttonClass("secondary", "min-h-9 px-4 text-xs")}>
            View as others see it
          </Link>
          <CopyLink path={`/u/${username}`} />
          <Link href="/arc/settings#privacy" className={buttonClass("ghost", "min-h-9 px-4 text-xs")}>
            Privacy
          </Link>
        </div>
      }
    />
  );
}
