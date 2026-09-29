import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getArcOverview, getLatestFinishedArc } from "@/lib/arc";
import { googleHealthConfigured } from "@/lib/health/google-health";
import { getHealthConnections } from "@/lib/health/view";
import { linkedInConfigured, linkedInStatus } from "@/lib/linkedin/oauth";
import { ensureUsername } from "@/lib/social/profile";
import { AccountActions } from "@/components/arc/account-actions";
import { ArcSettingsForm } from "@/components/arc/arc-settings-form";
import { DataTransfer } from "@/components/arc/data-transfer";
import { RulesManager } from "@/components/arc/rules-manager";
import { ConnectedAccounts } from "@/components/settings/connected-accounts";
import { HealthSettings } from "@/components/settings/health-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { Avatar } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Settings" };

// Outcomes of the OAuth round trips. Plain language only, never a raw provider error.
const LINKEDIN_NOTICES: Record<string, string> = {
  connected: "LinkedIn connected.",
  cancelled: "LinkedIn wasn't connected.",
  error: "LinkedIn couldn't be connected. Try again.",
  unavailable: "LinkedIn sharing isn't set up on this ARC server.",
};
const HEALTH_NOTICES: Record<string, string> = {
  connected: "Google Health connected. Your first sync is running.",
  cancelled: "Google Health wasn't connected.",
  error: "Google Health couldn't be connected. Try again.",
  unavailable: "Google Health isn't set up on this ARC server.",
  choose: "Choose at least one kind of data to connect.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ linkedin?: string; health?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const username = await ensureUsername(user.id);
  const [overview, privacy, linkedIn, healthConnections, devices] = await Promise.all([
    getArcOverview(user.id),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { profileVisibility: true, leaderboardVisibility: true, showXp: true, showStreak: true, showBadges: true, showArcDay: true },
    }),
    linkedInStatus(user.id),
    getHealthConnections(user.id),
    prisma.healthDeviceToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, lastUsedAt: true, createdAt: true } }),
  ]);
  const hasAnyArc = overview !== null || (await getLatestFinishedArc(user.id)) !== null;

  return (
    <div className="animate-fade space-y-10">
      <h1 className="sr-only">Settings</h1>

      <section aria-labelledby="profile-heading">
        <SectionLabel>
          <span id="profile-heading">Your profile</span>
        </SectionLabel>
        <div className="mt-4 flex items-center gap-4">
          <Avatar src={user.image} name={user.name} size={44} />
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem]">{user.name ?? "—"}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="accounts-heading" className="border-t border-line pt-8">
        <SectionLabel className="mb-3">
          <span id="accounts-heading">Connected accounts</span>
        </SectionLabel>
        <ConnectedAccounts
          linkedIn={{ configured: linkedInConfigured(), ...linkedIn }}
          notice={sp.linkedin ? (LINKEDIN_NOTICES[sp.linkedin] ?? null) : null}
        />
      </section>

      {overview ? (
        <>
          <section aria-label="Your Arc" className="border-t border-line pt-8">
            <blockquote className="mb-8 rounded-xl bg-subtle px-5 py-4 text-sm leading-relaxed">{overview.arc.statement}</blockquote>
            <ArcSettingsForm
              key={`${overview.arc.startDate}-${overview.arc.endDate}`}
              startDate={overview.arc.startDate}
              endDate={overview.arc.endDate}
              today={overview.arc.today}
              goals={overview.arc.goals}
              modules={overview.arc.modules}
              focusKind={overview.arc.focusKind}
            />
          </section>

          <section aria-labelledby="rules-heading" className="border-t border-line pt-8">
            <SectionLabel className="mb-3">
              <span id="rules-heading">Your rules</span>
            </SectionLabel>
            <RulesManager habits={overview.habits} />
          </section>
        </>
      ) : null}

      <section id="health" aria-labelledby="health-heading" className="scroll-mt-24 border-t border-line pt-8">
        <SectionLabel className="mb-3">
          <span id="health-heading">Health</span>
        </SectionLabel>
        <HealthSettings
          configured={googleHealthConfigured()}
          connections={healthConnections.map((c) => ({ ...c, lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null }))}
          devices={devices.map((d) => ({ ...d, lastUsedAt: d.lastUsedAt?.toISOString() ?? null, createdAt: d.createdAt.toISOString() }))}
          rules={(overview?.habits ?? [])
            .filter((h) => h.active)
            .map((h) => ({ id: h.id, title: h.title, integrationType: h.integrationType, integrationTarget: h.integrationTarget }))}
          goals={{ stepGoal: overview?.arc.goals.stepGoal ?? 10000, sleepGoal: overview?.arc.goals.sleepGoal ?? 7.5 }}
          notice={sp.health ? (HEALTH_NOTICES[sp.health] ?? null) : null}
        />
      </section>

      <section id="privacy" aria-labelledby="privacy-heading" className="scroll-mt-24 border-t border-line pt-8">
        <SectionLabel className="mb-3">
          <span id="privacy-heading">Privacy</span>
        </SectionLabel>
        <PrivacySettings initial={privacy} username={username} />
      </section>

      <section aria-labelledby="data-heading" className="border-t border-line pt-8">
        <SectionLabel className="mb-3">
          <span id="data-heading">Data</span>
        </SectionLabel>
        <DataTransfer canExport={hasAnyArc} />
      </section>

      <section aria-labelledby="account-heading" className="border-t border-line pt-8">
        <SectionLabel className="mb-3">
          <span id="account-heading">Account</span>
        </SectionLabel>
        <AccountActions hasActiveArc={overview !== null} />
      </section>
    </div>
  );
}
