import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pairKey } from "@/lib/social/friend-rules";
import { getProfile } from "@/lib/social/profile";
import { ProfileView } from "@/components/social/profile-view";
import { PublicShell } from "@/components/social/public-shell";
import { AddFriendButton, FollowButton } from "@/components/social/friend-actions";
import { isFollowing } from "@/lib/social/following";
import { MountainIcon } from "@/components/ui/icons";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}`, robots: { index: false, follow: false } };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  if (!/^[a-z0-9_]{3,20}$/i.test(username)) notFound();
  const viewer = await getCurrentUser();
  const profile = await getProfile(username, viewer?.id ?? null);
  if (!profile) notFound();

  if (!profile.visible) {
    return (
      <PublicShell signedIn={!!viewer}>
        <div className="flex min-h-[50svh] flex-col items-center justify-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-subtle">
            <MountainIcon size={22} />
          </span>
          <p className="mt-6 text-sm font-medium">@{profile.username}</p>
          <p className="mt-2 text-sm text-muted">This Arc is private.</p>
          {viewer && profile.rel === "other" ? (
            <div className="mt-6">
              <FriendControl viewerId={viewer.id} username={username} />
            </div>
          ) : null}
        </div>
      </PublicShell>
    );
  }

  const actions = viewer && profile.rel === "other" ? <FriendControl viewerId={viewer.id} username={username} /> : null;

  return (
    <PublicShell signedIn={!!viewer}>
      <ProfileView
        card={profile.card}
        friendCount={profile.friendCount}
        followersCount={profile.followersCount}
        followingCount={profile.followingCount}
        badges={profile.badges}
        milestones={profile.milestones}
        actions={actions}
      />
    </PublicShell>
  );
}

async function FriendControl({ viewerId, username }: { viewerId: string; username: string }) {
  const target = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
  if (!target) return null;
  const [request, following] = await Promise.all([
    prisma.friendRequest.findUnique({ where: { pairKey: pairKey(viewerId, target.id) }, select: { status: true, senderId: true } }),
    isFollowing(viewerId, target.id),
  ]);
  const state = request?.status === "PENDING" ? (request.senderId === viewerId ? "sent" : "received") : "none";
  return (
    <div className="flex items-center gap-3">
      <AddFriendButton userId={target.id} state={state} />
      <FollowButton userId={target.id} following={following} />
    </div>
  );
}
