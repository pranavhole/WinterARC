import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveArc, getLatestFinishedArc } from "@/lib/arc";
import { Assessment } from "@/components/onboarding/assessment";

export const metadata: Metadata = {
  title: "Build your Arc",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getActiveArc(user.id)) redirect("/arc");
  const previous = await getLatestFinishedArc(user.id);
  return <Assessment returning={previous !== null} />;
}
