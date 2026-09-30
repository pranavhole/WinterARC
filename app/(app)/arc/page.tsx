import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getArcOverview, getLatestFinishedArc, resolveArcDate, type ArcOverview } from "@/lib/arc";
import { focusGoalFor, isWeekend, sleepMinutes } from "@/lib/metrics";
import { focusLabel } from "@/lib/modules";
import { addDays, getWeekDays, localHour, localMinutes, type DayKey } from "@/lib/utils";
import { weeklySummary } from "@/lib/weekly";
import { blocksFor } from "@/lib/timetable";
import { getDayFocus } from "@/lib/focus";
import { getBadgeBoard, getXpSummary } from "@/lib/gamification/board";
import { getHealthConnections, getHealthDay, SOURCE_LABEL } from "@/lib/health/view";
import { dailyMessage } from "@/lib/motivation";
import { milestoneKey, milestoneTitle, reachedMilestones } from "@/lib/social/milestones";
import { getShareState } from "@/lib/social/posts";
import { DayAgenda, type AgendaMood } from "@/components/arc/day/day-agenda";
import { DayNav } from "@/components/arc/day/day-nav";
import { DaySection } from "@/components/arc/day/section";
import { StepsTracker } from "@/components/arc/day/steps-tracker";
import { WeightTracker } from "@/components/arc/day/weight-tracker";
import { FocusTracker } from "@/components/arc/day/focus-tracker";
import { SleepTracker } from "@/components/arc/day/sleep-tracker";
import { JournalBox } from "@/components/arc/day/journal-box";
import { SleepChart, WeightTrend } from "@/components/arc/day/charts";
import { AutoRefresh } from "@/components/arc/dashboard/auto-refresh";
import { DashCard } from "@/components/arc/dashboard/card";
import { FlipDate } from "@/components/arc/dashboard/flip-date";
import { FocusInput } from "@/components/arc/dashboard/focus-card";
import { TaskList } from "@/components/arc/dashboard/task-list";
import { WeekTracker, type WeekRow } from "@/components/arc/dashboard/week-tracker";
import { ArcProgressCard, JourneyStrip, RecentBadges, TodayHealthCard } from "@/components/arc/dashboard/panels";
import { MountainArt } from "@/components/landing/mountain-art";
import { HealthActions } from "@/components/health/health-actions";
import { MilestoneShareButton } from "@/components/gamification/badge-share-button";
import type { ShareTarget } from "@/components/share/share-dialog";
import { buttonClass } from "@/components/ui/button";
import { MountainIcon, ShieldIcon, SquareCheckIcon, TargetIcon, TodayIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Today" };

// Evening hour after which a day with nothing done gets the gentler message.
const LATE_HOUR = 21;

export default async function TodayPage({ searchParams }: PageProps<"/arc">) {
  const user = await requireUser();
  // Start everything that doesn't depend on the Arc at the same time as the Arc itself,
  // instead of waiting for the Arc first. (getShareState reuses the cached overview.)
  const [overview, xp, healthConnections, share, badgeBoard, params] = await Promise.all([
    getArcOverview(user.id),
    getXpSummary(user.id),
    getHealthConnections(user.id),
    getShareState(user.id),
    getBadgeBoard(user.id),
    searchParams,
  ]);

  if (!overview) {
    const previous = await getLatestFinishedArc(user.id);
    if (!previous) redirect("/onboarding");
    return <NoActiveArc completed={previous.status === "COMPLETED"} />;
  }

  const { arc, stats, recordsByDay, tasksByDay } = overview;
  const date = resolveArcDate(arc, params.date);
  // The only queries that need the resolved date.
  const [healthDay, focusLine] = await Promise.all([getHealthDay(user.id, date), getDayFocus(arc.id, user.id, date)]);
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

  // Weekly trackers: habits and discipline rules, Monday to Sunday of the selected day.
  const weekDays = getWeekDays(date);
  const inWeek = (r: WeekRow) => weekDays.some((d) => d >= r.activeFrom && (!r.deactivatedOn || d < r.deactivatedOn));
  const rows = overview.habits.map((h, i) => ({
    row: { id: h.id, title: h.title, activeFrom: overview.snapshotHabits[i].activeFrom, deactivatedOn: overview.snapshotHabits[i].deactivatedOn },
    discipline: h.category === "DISCIPLINE",
  }));
  const habitRows = rows.filter((r) => !r.discipline && inWeek(r.row)).map((r) => r.row);
  const disciplineRows = rows.filter((r) => r.discipline && inWeek(r.row)).map((r) => r.row);
  const initialDone: Record<string, boolean> = {};
  for (const day of weekDays) for (const id of overview.doneByDay.get(day) ?? []) initialDone[`${id}:${day}`] = true;

  // TODAY card: imported health data first, then whatever was logged by hand.
  const activeHealth = healthConnections.filter((c) => c.status === "ACTIVE");
  const lastSync = activeHealth.map((c) => c.lastSyncedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const loggedSleep = record ? sleepMinutes(record.bedtime, record.wakeTime) : null;

  const earnedBadges = badgeBoard
    .filter((b) => b.earnedAt)
    .sort((a, b) => b.earnedAt!.getTime() - a.earnedAt!.getTime())
    .map((b) => ({ key: b.key, name: b.name, icon: b.icon }));
  const dayBlocks = blocksFor(overview.blocks, date);

  return (
    <div data-wide className="animate-fade">
      <AutoRefresh />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Left: the day */}
        <div className="min-w-0 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <FlipDate date={date} dayNumber={dayNumber} arcLength={arc.length} daysLeft={arc.daysLeft} isToday={isToday} isFuture={isFuture} />
            <DayNav prev={date > arc.startDate ? addDays(date, -1) : null} next={date < arc.endDate ? addDays(date, 1) : null} today={arc.today} isToday={isToday} />
          </div>

          <DashCard icon={TargetIcon} title="Today's Focus">
            <FocusInput key={date} date={date} initial={focusLine} editable={editable} />
            {message ? <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">{message.text}</p> : null}
          </DashCard>

          <DashCard icon={TodayIcon} title="Habits Tracker">
            <WeekTracker
              key={`h-${weekDays[0]}`}
              variant="habits"
              rows={habitRows}
              weekDays={weekDays}
              today={arc.today}
              startDate={arc.startDate}
              endDate={arc.endDate}
              initialDone={initialDone}
              empty="No habits this week. Add one in Settings."
            />
          </DashCard>

          <div className="grid gap-5 md:grid-cols-2">
            <DashCard icon={ShieldIcon} title="Discipline" href="/arc/settings">
              <WeekTracker
                key={`d-${weekDays[0]}`}
                variant="discipline"
                rows={disciplineRows}
                weekDays={weekDays}
                today={arc.today}
                startDate={arc.startDate}
                endDate={arc.endDate}
                initialDone={initialDone}
                empty="No discipline rules yet."
              />
            </DashCard>
            <DashCard icon={SquareCheckIcon} title="Tasks" href={dayBlocks.length ? "#schedule" : undefined}>
              <TaskList
                key={date}
                date={date}
                editable={editable}
                enabled={m.tasks}
                tasks={tasks.filter((t) => !t.carriedTo).map((t) => ({ id: t.id, title: t.title, completed: t.completed }))}
              />
            </DashCard>
          </div>

          <JourneyStrip days={stats.days} today={arc.today} selected={date} />
        </div>

        {/* Right: numbers */}
        <aside className="space-y-5" aria-label="Today at a glance">
          <div className="hidden overflow-hidden rounded-2xl border border-line lg:block">
            <MountainArt crop className="block h-44 w-full" />
          </div>

          {!isFuture ? (
            <TodayHealthCard
              metrics={{
                steps: healthDay?.steps ?? record?.steps ?? null,
                stepGoal: record?.stepGoal ?? arc.goals.stepGoal,
                sleepMinutes: healthDay?.sleepMinutes ?? loggedSleep,
                sleepGoalMinutes: Math.round((record?.sleepGoal ?? arc.goals.sleepGoal) * 60),
                exerciseMinutes: healthDay?.exerciseMinutes ?? null,
                weight: healthDay?.weight ?? record?.weight ?? null,
              }}
              syncedAt={lastSync}
              connected={activeHealth.length > 0}
              expired={!activeHealth.length && healthConnections.some((c) => c.status === "EXPIRED")}
              canSync={isToday && activeHealth.some((c) => c.provider === "GOOGLE_HEALTH")}
              timeZone={arc.timezone}
              actions={<HealthActions date={date} steps={record?.steps ?? null} editable={editable} connected={activeHealth.length > 0} />}
            />
          ) : null}

          <ArcProgressCard score={isFuture ? null : cell.score} streak={stats.currentStreak} level={xp.level} xp={xp.xp} />
          {todayMilestone ? (
            <div className="-mt-2 text-right">
              <MilestoneShareButton target={todayMilestone} label={`Share ${todayMilestone.title}`} />
            </div>
          ) : null}

          <RecentBadges earned={earnedBadges} lockedCount={badgeBoard.length - earnedBadges.length} />
        </aside>
      </div>

      {/* Logging the day: inputs for what isn't imported, the journal and the timetable. */}
      <div className="mt-10 space-y-6" key={date}>
        {showBody ? (
          <DaySection title="Body">
            {m.steps ? (
              <div>
                <StepsTracker date={date} initial={record?.steps ?? null} goal={record?.stepGoal ?? arc.goals.stepGoal} editable={editable} />
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

        {dayBlocks.length ? (
          <div id="schedule" className="scroll-mt-24">
            <DaySection title="Schedule">
              <DayAgenda
                key={date}
                date={date}
                dayNumber={dayNumber}
                mood={mood}
                habits={overview.habitsOn(date)}
                tasks={tasks}
                blocks={dayBlocks}
                tasksEnabled={m.tasks}
                canAddHabit={isToday}
                canCarry={date < arc.endDate}
                nowMinutes={isToday ? localMinutes(arc.timezone) : null}
              />
            </DaySection>
          </div>
        ) : null}

        <DaySection title="Last 7 days">
          <WeeklyBlock overview={overview} end={isFuture ? arc.today : date} />
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
