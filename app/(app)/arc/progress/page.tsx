import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getArcOverview, type ArcOverview } from "@/lib/arc";
import { formatDuration, formatHours, formatSteps, sleepMinutes } from "@/lib/metrics";
import { focusLabel } from "@/lib/modules";
import { percent } from "@/lib/scoring";
import { weeklySummary } from "@/lib/weekly";
import { addDays, cn, diffDays } from "@/lib/utils";
import { DailyBars, SleepChart, WeightTrend } from "@/components/arc/day/charts";
import { ArcCalendar } from "@/components/arc/arc-calendar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Progress" };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default async function ProgressPage() {
  const user = await requireUser();
  const overview = await getArcOverview(user.id);
  if (!overview) redirect("/arc");

  const { arc, habits, stats, recordsByDay, tasksByDay } = overview;
  const m = arc.modules;
  const arcProgress = arc.dayNumber / arc.length;
  const records = [...recordsByDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, r]) => r);

  const steps = records.map((r) => r.steps).filter((s): s is number => s !== null);
  const weights = records.map((r) => r.weight).filter((w): w is number => w !== null);
  const sleeps = records.map((r) => sleepMinutes(r.bedtime, r.wakeTime)).filter((s): s is number => s !== null);
  const studyTotal = records.reduce((sum, r) => sum + (r.studyHours ?? 0), 0);
  const dsaTotal = records.reduce((sum, r) => sum + (r.dsaProblems ?? 0), 0);
  const focus = focusLabel(arc.focusKind);
  const { insights } = weeklySummary({
    end: arc.today,
    days: stats.days,
    records: recordsByDay,
    tasks: tasksByDay,
    modules: m,
    focusName: focus.metric,
    sleepGoal: arc.goals.sleepGoal,
    currentStreak: stats.currentStreak,
  });

  return (
    <div className="animate-fade">
      <section aria-labelledby="arc-heading">
        <SectionLabel>
          <span id="arc-heading">Arc progress</span>
        </SectionLabel>
        <p className="tabular mt-3 text-[1.7rem] font-semibold tracking-tight">
          Day {arc.dayNumber} <span className="text-muted">/ {arc.length}</span>
        </p>
        <div className="tabular mt-4 flex justify-between text-xs text-muted">
          <span>{Math.round(arcProgress * 100)}% of the way</span>
          <span>
            {arc.daysLeft} {arc.daysLeft === 1 ? "day" : "days"} left
          </span>
        </div>
        <ProgressBar value={arcProgress} label="Arc progress" className="mt-2" />
      </section>

      <section aria-label="Consistency" className="mt-10 grid grid-cols-3 border-y border-line">
        <Stat label="Average completion" value={percent(stats.averageCompletion)} />
        <Stat label="Current streak" value={`${stats.currentStreak}`} unit={stats.currentStreak === 1 ? "day" : "days"} className="border-l border-line pl-4" />
        <Stat label="Best streak" value={`${stats.bestStreak}`} unit={stats.bestStreak === 1 ? "day" : "days"} className="border-l border-line pl-4" />
      </section>
      <p className="mt-2 text-xs text-muted">
        {stats.completedDays} {stats.completedDays === 1 ? "day" : "days"} at 80% or more. That&apos;s what a streak counts.
      </p>

      <Trends overview={overview} />

      {insights.length ? (
        <section aria-labelledby="week-heading" className="mt-10">
          <SectionLabel>
            <span id="week-heading">This week</span>
          </SectionLabel>
          <ul className="mt-3 space-y-1.5 text-sm">
            {insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="rules-heading" className="mt-10">
        <SectionLabel>
          <span id="rules-heading">Habits</span>
        </SectionLabel>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {habits.map((habit) => (
            <li key={habit.id} className={cn("py-3.5", !habit.active && "opacity-60")}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">
                  {habit.title}
                  {!habit.active ? <span className="ml-2 text-xs text-muted">Retired</span> : null}
                </span>
                <span className="tabular shrink-0 font-semibold">{percent(stats.perHabit[habit.id] ?? null)}</span>
              </div>
              <ProgressBar value={stats.perHabit[habit.id] ?? 0} label={`${habit.title} completion`} className="mt-2" thin />
            </li>
          ))}
        </ul>
      </section>

      {m.steps || m.weight ? (
        <MetricGroup title="Body">
          {m.steps ? <Row label="Average steps" value={steps.length ? formatSteps(Math.round(mean(steps)!)) : "—"} /> : null}
          {m.weight ? (
            <Row
              label="Weight change"
              value={
                weights.length >= 2
                  ? `${weights.at(-1)! - weights[0] > 0 ? "+" : weights.at(-1)! - weights[0] < 0 ? "−" : "±"}${Math.abs(weights.at(-1)! - weights[0]).toFixed(1)} kg`
                  : "—"
              }
            />
          ) : null}
        </MetricGroup>
      ) : null}

      {m.focus ? (
        <MetricGroup title={focus.section}>
          <Row label={focus.metric} value={formatHours(studyTotal)} />
          {m.dsa ? <Row label="DSA" value={`${dsaTotal} ${dsaTotal === 1 ? "problem" : "problems"}`} /> : null}
        </MetricGroup>
      ) : null}

      {m.sleep ? (
        <MetricGroup title="Sleep">
          <Row label="Average" value={formatDuration(mean(sleeps))} />
          <Row
            label={`Nights at ${formatDuration(arc.goals.sleepGoal * 60)} or more`}
            value={`${sleeps.filter((s) => s / 60 >= arc.goals.sleepGoal).length} of ${sleeps.length}`}
          />
        </MetricGroup>
      ) : null}

      <section aria-labelledby="calendar-heading" className="mt-12">
        <SectionLabel className="mb-5">
          <span id="calendar-heading">{arc.length} days</span>
        </SectionLabel>
        <ArcCalendar days={stats.days} />
      </section>
    </div>
  );
}

function Stat({ label, value, unit, className }: { label: string; value: string; unit?: string; className?: string }) {
  return (
    <div className={cn("py-5", className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="tabular mt-1.5 text-xl font-semibold">
        {value} {unit ? <span className="text-sm font-normal text-muted">{unit}</span> : null}
      </p>
    </div>
  );
}

function MetricGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <SectionLabel>{title}</SectionLabel>
      <dl className="mt-3 divide-y divide-line border-y border-line">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5 text-sm">
      <dt>{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}

/** Daily charts for the last few weeks: completion always, metrics only when tracked. */
function Trends({ overview }: { overview: ArcOverview }) {
  const { arc, stats, recordsByDay } = overview;
  const m = arc.modules;
  const elapsed = diffDays(arc.startDate, arc.today) + 1;
  const span = Math.min(30, Math.max(14, elapsed));
  const keys = Array.from({ length: span }, (_, i) => addDays(arc.today, i - span + 1));
  const dayByKey = new Map(stats.days.map((d) => [d.key, d]));
  const rec = (k: string) => recordsByDay.get(k);
  const focus = focusLabel(arc.focusKind);

  const completion = keys.map((key) => {
    const score = dayByKey.get(key)?.score ?? null;
    return { key, value: score === null ? null : score * 100, met: score !== null && score >= 0.8 };
  });
  const weights = [...recordsByDay.entries()]
    .filter(([, r]) => r.weight !== null)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, r]) => ({ key, weight: r.weight! }))
    .slice(-60);

  return (
    <section aria-labelledby="trends-heading" className="mt-12 space-y-10">
      <SectionLabel>
        <span id="trends-heading">Trends</span>
      </SectionLabel>

      <Chart title="Daily completion" note={`Streak line 80% · Last ${span} days`}>
        <DailyBars
          days={completion}
          max={100}
          goal={80}
          label={`Daily completion over the last ${span} days, with the 80% streak line.`}
        />
      </Chart>

      {m.sleep ? (
        <Chart title="Sleep" note={`Goal ${formatDuration(arc.goals.sleepGoal * 60)} · Last ${span} nights`}>
          <SleepChart
            goal={arc.goals.sleepGoal}
            nights={keys.map((key) => {
              const r = rec(key);
              return { key, minutes: r ? sleepMinutes(r.bedtime, r.wakeTime) : null };
            })}
          />
        </Chart>
      ) : null}

      {m.steps ? (
        <Chart title="Steps" note={`Goal ${formatSteps(arc.goals.stepGoal)} · Last ${span} days`}>
          <DailyBars
            days={keys.map((key) => {
              const r = rec(key);
              const goal = r?.stepGoal ?? arc.goals.stepGoal;
              return { key, value: r?.steps ?? null, met: (r?.steps ?? 0) >= goal };
            })}
            goal={arc.goals.stepGoal}
            label={`Steps over the last ${span} days against a goal of ${formatSteps(arc.goals.stepGoal)}.`}
          />
        </Chart>
      ) : null}

      {m.focus ? (
        <Chart
          title={focus.metric}
          note={
            arc.goals.focusGoalWeekday === arc.goals.focusGoalWeekend
              ? `Goal ${formatHours(arc.goals.focusGoalWeekday)} · Last ${span} days`
              : `Last ${span} days`
          }
        >
          <DailyBars
            days={keys.map((key) => {
              const r = rec(key);
              const goal = r?.focusGoal ?? arc.goals.focusGoalWeekday;
              return { key, value: r?.studyHours ?? null, met: (r?.studyHours ?? 0) >= goal };
            })}
            goal={arc.goals.focusGoalWeekday === arc.goals.focusGoalWeekend ? arc.goals.focusGoalWeekday : null}
            label={`${focus.metric} hours over the last ${span} days.`}
          />
        </Chart>
      ) : null}

      {m.weight ? (
        <Chart title="Weight" note="kg">
          {weights.length >= 2 ? (
            <WeightTrend entries={weights} height="h-32" />
          ) : (
            <p className="mt-3 text-sm text-muted">Log your weight on two days to see the trend.</p>
          )}
        </Chart>
      ) : null}
    </section>
  );
}

function Chart({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted">{note}</span>
      </div>
      {children}
    </div>
  );
}
