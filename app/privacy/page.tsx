import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        <strong>What we store.</strong> Your Google name, email and profile image, your assessment answers, your
        Arc and your daily check-ins. If you use them: your posts, reactions, friends, XP and badges; imported
        health summaries; and encrypted access tokens for LinkedIn and Google Health.
      </p>
      <p>
        <strong>Who sees it.</strong> Your Arc is yours. Your profile is visible to friends by default; you can make
        it public or private, choose which stats it shows, and hide yourself from leaderboards. Each post has its own
        visibility: public, friends or only you. Your journal is never shared.
      </p>
      <p>
        <strong>Health data.</strong> Only read when you connect Google Health or the Android Health Connect bridge,
        and only for the data types you choose. It is never shown to anyone else: not on your profile, in the feed or
        on leaderboards. You can disconnect at any time and delete ARC&apos;s copy of imported data from Settings.
        Your data at Google or on your phone is not touched.
      </p>
      <p>
        <strong>LinkedIn.</strong> ARC posts to LinkedIn only after you review and confirm a preview. Generated posts
        contain milestones only, never health data, private habits or journal entries.
      </p>
      <p>
        <strong>Tokens.</strong> Integration tokens are encrypted at rest and never sent to your browser. Your data is
        never sold.
      </p>
      <p>
        <strong>Leaving.</strong> You can delete your account from Settings at any time. Deleting it permanently
        removes your Arc, posts, connections and all of their history.
      </p>
    </LegalPage>
  );
}
