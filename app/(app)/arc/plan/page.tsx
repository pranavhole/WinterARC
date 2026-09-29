import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getArcOverview } from "@/lib/arc";
import { PlanEditor } from "@/components/arc/plan-editor";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage() {
  const user = await requireUser();
  const overview = await getArcOverview(user.id);
  if (!overview) redirect("/arc");

  return (
    <div className="animate-fade">
      <SectionLabel as="p">Daily timetable</SectionLabel>
      <h1 className="mt-3 text-[1.7rem] font-semibold tracking-tight">Your day, planned</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        A timetable that repeats every day. Link a block to a rule and checking it off on Today counts for the rule.
      </p>
      <div className="mt-6">
        <PlanEditor
          blocks={overview.blocks}
          habits={overview.habits.filter((h) => h.active).map((h) => ({ id: h.id, title: h.title }))}
        />
      </div>
    </div>
  );
}
