import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <p>
        <strong>ARC is a personal tool.</strong> It helps you keep a few daily rules for 90 days. It is not medical,
        fitness or psychological advice.
      </p>
      <p>
        <strong>Look after yourself.</strong> Choose rules that are safe for you. If something doesn&apos;t feel
        right, change it or stop.
      </p>
      <p>
        <strong>Your account.</strong> Keep your Google account secure. You can delete your ARC account at any time.
      </p>
    </LegalPage>
  );
}
