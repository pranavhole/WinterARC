import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getArcOverview, getLatestFinishedArc, resolveArcDate, type ArcOverview } from "@/lib/arc";
import { focusGoalFor, isWeekend, sleepMinutes } from "@/lib/metrics";
import { focusLabel } from "@/lib/modules";
import { percent } from "@/lib/scoring";
import { addDays, formatDay, getWeekDays, localHour, localMinutes, type DayKey } from "@/lib/utils";
import { weeklySummary } from "@/lib/weekly";
import { DayAgenda, type AgendaMood } from "@/components/arc/day/day-agenda";
import { blocksFor } from "@/lib/timetable";
import { ArcHeatmap } from "@/components/arc/arc-heatmap";
import { DayNav } from "@/components/arc/day/day-nav";
import { DaySection } from "@/components/arc/day/section";
import { StepsTracker } from "@/components/arc/day/steps-tracker";
import { WeightTracker } from "@/components/arc/day/weight-tracker";
import { FocusTracker } from "@/components/arc/day/focus-tracker";
import { SleepTracker } from "@/components/arc/day/sleep-tracker";
import { JournalBox } from "@/components/arc/day/journal-box";
import { SleepChart, WeightTrend } from "@/components/arc/day/charts";
import { DateFlapper } from "@/components/arc/day/date-flapper";
import { WeeklyHabitGrid, type HabitGridItem } from "@/components/arc/weekly-habit-grid";
import { buttonClass } from "@/components/ui/button";
import { FlameIcon, MountainIcon } from "@/components/ui/icons";
import { SectionLabel } from "@/components/ui/label";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getXpSummary } from "@/lib/gamification/board";
import { getHealthConnections, getHealthDay, SOURCE_LABEL } from "@/lib/health/view";
import { dailyMessage } from "@/lib/motivation";
import { milestoneKey, milestoneTitle, reachedMilestones } from "@/lib/social/milestones";
import { getShareState } from "@/lib/social/posts";
import { HealthToday } from "@/components/health/health-today";
import { MilestoneShareButton } from "@/components/gamification/badge-share-button";
import type { ShareTarget } from "@/components/share/share-dialog";

export const metadata: Metadata = { title: "Today" };

// Evening hour after which a day with nothing done gets the gentler message.
const LATE_HOUR = 21;

export default async function TodayPage({ searchParams }: PageProps<"/arc">) {
  const user = await requireUser();
  const overview = await getArcOverview(user.id);

  if (!overview) {
    const previous = await getLatestFinishedArc(user.id);
    if (!previous) redirect("/onboarding");
    return <NoActiveArc completed={previous.status === "COMPLETED"} />;
  }

  const { arc, stats, recordsByDay, tasksByDay } = overview;
  const date = resolveArcDate(arc, (await searchParams).date);
  const [xp, healthConnections, healthDay, share] = await Promise.all([
    getXpSummary(user.id),
    getHealthConnections(user.id),
    getHealthDay(user.id, date),
    getShareState(user.id),
  ]);
  const isToday = date === arc.today;
  const isFuture = date > arc.today;
  const editable = !isFuture;
  const cell = stats.days.find((d) => d.key === date)!;
  const dayNumber = cell.index + 1;
  const record = recordsByDay.get(date);
  const tasks = tasksByDay.get(date) ?? [];
  const m = arc.modules;
  const focus = focusLabel(arc.focusKind);

  const yesterday = stats.days.find((d) => d.key === addDays(arc.today, -1));
  const mood: AgendaMood = isFuture
    ? "future"
    : !isToday
      ? "past"
      : arc.dayNumber === 1
        ? "first-day"
        : localHour(arc.timezone) >= LATE_HOUR
          ? "late"
          : yesterday?.status === "missed"
            ? "after-miss"
            : "normal";

  // One calm line for today. Never more than one.
  const message = isToday ? dailyMessage(dayNumber, arc.length) : null;
  // A milestone reached today can be shared from here (never automatically).
  const reachedToday = isToday && share.milestone
    ? reachedMilestones(share.milestone).find(
        (ms) => (ms.kind === "DAY" && ms.n === dayNumber) || (ms.kind === "STREAK" && ms.n === stats.currentStreak) || ms.kind === "ARC_COMPLETE",
      )
    : undefined;
  const todayMilestone: ShareTarget | null = reachedToday
    ? { kind: "milestone", milestoneType: milestoneKey(reachedToday), title: milestoneTitle(reachedToday, arc.length), arcLength: arc.length }
    : null;
  const sourceNote = (source: "MANUAL" | "HEALTH" | null | undefined) =>
    source === "HEALTH" && healthDay ? <p className="mt-2 text-xs text-muted">From {SOURCE_LABEL[healthDay.source]}</p> : null;

  const showBody = !isFuture && (m.steps || m.weight);
  const showMind = !isFuture && (m.focus || m.sleep);
  const showReflection = m.journal && !isFuture;

  const gridHabits: HabitGridItem[] = overview.habits.map((h, i) => ({
    id: h.id,
    title: h.title,
    category: h.category,
    activeFrom: overview.snapshotHabits[i].activeFrom,
    deactivatedOn: overview.snapshotHabits[i].deactivatedOn,
  }));

  const weekDays = getWeekDays(date);
  const initialDone: Record<string, boolean> = {};
  for (const day of weekDays) {
    const doneSet = overview.doneByDay.get(day);
    if (doneSet) {
      for (const habitId of doneSet) {
        initialDone[`${habitId}:${day}`] = true;
      }
    }
  }

  return (
    <div className="animate-fade">
      {/* 1 · Arc day, completion, streak */}
      <section aria-labelledby="day-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <DateFlapper
            dayNumber={dayNumber}
            arcLength={arc.length}
            date={date}
            isToday={isToday}
            daysRemaining={arc.daysLeft}
            isFuture={isFuture}
          />
          <DayNav
            prev={date > arc.startDate ? addDays(date, -1) : null}
            next={date < arc.endDate ? addDays(date, 1) : null}
            today={arc.today}
            isToday={isToday}
          />
        </div>

        <div className="mt-7 rounded-2xl bg-subtle px-5 py-5">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted">{isToday ? "Today's Arc progress" : "Arc progress"}</p>
            <p className="tabular text-2xl font-semibold">{isFuture ? "—" : percent(cell.score ?? 0)}</p>
          </div>
          <ProgressBar value={cell.score ?? 0} label="Completion for this day" className="mt-3" />
          <p className="tabular mt-4 flex items-center gap-2 text-xs text-muted">
            <FlameIcon size={14} className="text-fg" />
            {stats.currentStreak > 0 ? (
              <span>
                <span className="font-semibold text-fg">{stats.currentStreak} day streak</span> · best{" "}
                {stats.bestStreak}
              </span>
            ) : (
              <span>Reach 80% today to start a streak.</span>
            )}
          </p>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs text-muted">
            <Link href="/badges" className="tabular hover:text-fg">
              Level {xp.level} · {xp.xp.toLocaleString("en-US")} XP
            </Link>
            {todayMilestone ? <MilestoneShareButton target={todayMilestone} label={`Share ${todayMilestone.title}`} /> : null}
          </div>
        </div>

        {message ? <p className="mt-6 whitespace-pre-line text-center text-sm leading-relaxed text-muted">{message.text}</p> : null}
      </section>

      {/* 2 · The day: rules, timetable and tasks in one list */}
      <section aria-labelledby="day-list-heading" className="mt-8 border-t border-line pt-7">
        <SectionLabel>
          <span id="day-list-heading">{isToday ? "Today" : "This day"}</span>
        </SectionLabel>
        {isToday ? (
          <p className="mt-2 text-sm text-muted">{formatDay(date, { weekday: "long", month: "long", day: "numeric" })}</p>
        ) : null}
        <DayAgenda
          key={date}
          date={date}
          dayNumber={dayNumber}
          mood={mood}
          habits={overview.habitsOn(date)}
          tasks={tasks}
          blocks={blocksFor(overview.blocks, date)}
          tasksEnabled={m.tasks}
          canAddHabit={isToday}
          canCarry={date < arc.endDate}
          nowMinutes={isToday ? localMinutes(arc.timezone) : null}
        />
      </section>

      {/* 3 · Tracking modules the Arc uses */}
      <div className="mt-8 space-y-6" key={date}>

        {showBody ? (
          <DaySection title="Body">
            {m.steps ? (
              <div>
                <StepsTracker
                  date={date}
                  initial={record?.steps ?? null}
                  goal={record?.stepGoal ?? arc.goals.stepGoal}
                  editable={editable}
                />
                {sourceNote(record?.stepsSource)}
              </div>
            ) : null}
            {m.weight ? (
              <div>
                <WeightBlock overview={overview} date={date} editable={editable} />
                {sourceNote(record?.weightSource)}
              </div>
            ) : null}
          </DaySection>
        ) : null}

        {showMind ? (
          <DaySection title={m.focus ? `Mind · ${focus.section}` : "Mind"}>
            {m.focus ? (
              <FocusTracker
                date={date}
                label={focus.metric}
                weekend={isWeekend(date)}
                hours={record?.studyHours ?? null}
                goal={record?.focusGoal ?? focusGoalFor(arc.goals, date)}
                dsa={m.dsa ? { count: record?.dsaProblems ?? null, goal: record?.dsaGoal ?? arc.goals.dsaGoal } : null}
                editable={editable}
              />
            ) : null}
            {m.sleep ? (
              <div>
                <SleepTracker
                  date={date}
                  bedtime={record?.bedtime ?? null}
                  wakeTime={record?.wakeTime ?? null}
                  quality={record?.sleepQuality ?? null}
                  goal={record?.sleepGoal ?? arc.goals.sleepGoal}
                  editable={editable}
                />
                {sourceNote(record?.sleepSource)}
                <SleepChart
                  goal={arc.goals.sleepGoal}
                  nights={Array.from({ length: 14 }, (_, i) => {
                    const key = addDays(date, i - 13);
                    const r = recordsByDay.get(key);
                    return { key, minutes: r ? sleepMinutes(r.bedtime, r.wakeTime) : null };
                  })}
                />
              </div>
            ) : null}
          </DaySection>
        ) : null}

        {showReflection ? (
          <DaySection title="Journal">
            <JournalBox date={date} initial={record?.journal ?? null} editable={editable} />
          </DaySection>
        ) : null}

        {!isFuture ? (
          <DaySection title="Health">
            <HealthToday
              connections={healthConnections}
              metric={healthDay}
              stepGoal={record?.stepGoal ?? arc.goals.stepGoal}
              timeZone={arc.timezone}
              isToday={isToday}
            />
          </DaySection>
        ) : null}
      </div>

      {/* 4 · Week and Arc */}
      <div className="mt-6 space-y-6">
        <DaySection title="Weekly Grid">
          <WeeklyHabitGrid
            selectedDate={date}
            today={arc.today}
            startDate={arc.startDate}
            endDate={arc.endDate}
            habits={gridHabits}
            initialDone={initialDone}
          />
        </DaySection>
        <DaySection title="Last 7 days">
          <WeeklyBlock overview={overview} end={isFuture ? arc.today : date} />
        </DaySection>
        <DaySection title="Your Arc">
          <ArcHeatmap days={stats.days} selected={date} today={arc.today} />
        </DaySection>
      </div>
    </div>
  );
}

function WeightBlock({ overview, date, editable }: { overview: ArcOverview; date: DayKey; editable: boolean }) {
  const entries = [...overview.recordsByDay.entries()]
    .filter(([key, r]) => r.weight !== null && key <= date)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, r]) => ({ key, weight: r.weight! }));
  const start = entries[0];
  const current = entries.at(-1);
  const weekAgo = entries.findLast((e) => e.key <= addDays(date, -7));
  const fmt = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)} kg`;

  return (
    <div>
      <WeightTracker date={date} initial={overview.recordsByDay.get(date)?.weight ?? null} editable={editable} />
      {start && current ? (
        <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[0.75rem] text-muted">Start</dt>
            <dd className="tabular mt-0.5 font-semibold">{start.weight.toFixed(1)} kg</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-muted">Current</dt>
            <dd className="tabular mt-0.5 font-semibold">{current.weight.toFixed(1)} kg</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-muted">Change</dt>
            <dd className="tabular mt-0.5 font-semibold">{fmt(current.weight - start.weight)}</dd>
          </div>
          <div>
            <dt className="text-[0.75rem] text-muted">vs 7 days ago</dt>
            <dd className="tabular mt-0.5 font-semibold">{weekAgo ? fmt(current.weight - weekAgo.weight) : "—"}</dd>
          </div>
        </dl>
      ) : null}
      <WeightTrend entries={entries.slice(-60)} />
    </div>
  );
}

function WeeklyBlock({ overview, end }: { overview: ArcOverview; end: DayKey }) {
  const { arc, stats, recordsByDay, tasksByDay } = overview;
  const { stats: items, insights } = weeklySummary({
    end,
    days: stats.days,
    records: recordsByDay,
    tasks: tasksByDay,
    modules: arc.modules,
    focusName: focusLabel(arc.focusKind).metric,
    sleepGoal: arc.goals.sleepGoal,
    currentStreak: stats.currentStreak,
  });

  if (!items.length) return <p className="text-sm text-muted">Your first week is still being written.</p>;
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {items.map((s) => (
          <div key={s.label}>
            <dd className="tabular text-xl font-semibold">{s.value}</dd>
            <dt className="mt-0.5 text-xs text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
      {insights.length ? (
        <ul className="mt-6 space-y-1.5 border-t border-line pt-5 text-sm text-muted">
          {insights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NoActiveArc({ completed }: { completed: boolean }) {
  return (
    <div className="flex min-h-[65svh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-subtle">
        <MountainIcon size={26} />
      </div>
      {completed ? (
        <>
          <h1 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em]">Your Arc is complete. You showed up.</h1>
          <p className="mt-3 text-sm text-muted">Take what you built with you.</p>
        </>
      ) : (
        <>
          <h1 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em]">You haven&apos;t started yet.</h1>
          <p className="mt-3 text-sm text-muted">Your next 90 days are waiting.</p>
        </>
      )}
      <Link href="/onboarding" className={buttonClass("primary", "mt-10 min-w-48")}>
        {completed ? "Build a new Arc" : "Build my Arc"}
      </Link>
    </div>
  );
}
