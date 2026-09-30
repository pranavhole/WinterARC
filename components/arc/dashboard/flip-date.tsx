import { formatDay, type DayKey } from "@/lib/utils";

/**
 * The split-flap date tile: day of month on two flap leaves, month and year
 * underneath, beside the weekday, Arc day and days left. Leaves are keyed by
 * their digit, so moving to another day flips them.
 */
export function FlipDate({
  date,
  dayNumber,
  arcLength,
  daysLeft,
  isToday,
  isFuture,
}: {
  date: DayKey;
  dayNumber: number;
  arcLength: number;
  daysLeft: number;
  isToday: boolean;
  isFuture: boolean;
}) {
  const [d1, d2] = formatDay(date, { day: "2-digit" }).split("");
  const month = formatDay(date, { month: "long" }).toUpperCase();
  const year = formatDay(date, { year: "numeric" });
  const weekday = formatDay(date, { weekday: "long" }).toUpperCase();
  const full = formatDay(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const sub = isToday
    ? daysLeft === 0
      ? "FINAL DAY"
      : `${daysLeft} ${daysLeft === 1 ? "DAY" : "DAYS"} LEFT`
    : isFuture
      ? "UPCOMING"
      : "PAST DAY";

  return (
    <div className="flex items-center gap-5 sm:gap-7">
      <h1 className="sr-only">
        Day {dayNumber} of {arcLength}, {full}
      </h1>

      <div
        aria-hidden="true"
        className="flex w-[7.25rem] shrink-0 flex-col items-center rounded-2xl bg-gradient-to-b from-[#232220] to-[#141312] px-2.5 pb-3 pt-2.5 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] sm:w-[8rem]"
      >
        <div className="relative flex w-full gap-1 [perspective:500px]">
          <Leaf digit={d1} />
          <Leaf digit={d2} />
          {/* The seam runs across both leaves, with hinge pins at the edges. */}
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/80 shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
          <span className="pointer-events-none absolute -left-1 top-1/2 h-2 w-1 -translate-y-1/2 rounded-sm bg-[#3a3835]" />
          <span className="pointer-events-none absolute -right-1 top-1/2 h-2 w-1 -translate-y-1/2 rounded-sm bg-[#3a3835]" />
        </div>
        <p className="mt-2.5 text-[0.6875rem] font-semibold tracking-[0.18em] text-[#f3f1ec]">{month}</p>
        <p className="tabular mt-0.5 text-[0.6875rem] font-medium tracking-[0.2em] text-[#f3f1ec]/80">{year}</p>
      </div>

      <div className="min-w-0 border-l border-line pl-5 sm:pl-7">
        <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-muted">{weekday}</p>
        <p className="tabular mt-2 text-[1.35rem] font-semibold tracking-[0.12em] sm:text-2xl">
          DAY {dayNumber} / {arcLength}
        </p>
        <p className="tabular mt-2 text-[0.75rem] font-medium tracking-[0.18em] text-muted">{sub}</p>
      </div>
    </div>
  );
}

function Leaf({ digit }: { digit: string }) {
  return (
    <span className="relative flex h-[3.9rem] flex-1 overflow-hidden rounded-lg bg-gradient-to-b from-[#2e2d2a] via-[#262522] to-[#1c1b19] sm:h-[4.25rem]">
      {/* Upper leaf is a touch lighter, like a real flap. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/[0.04]" />
      <span
        key={digit}
        className="animate-flap-flip relative flex w-full items-center justify-center font-sans text-[2.6rem] font-semibold leading-none text-[#f7f5f0] sm:text-[2.85rem]"
      >
        {digit}
      </span>
    </span>
  );
}
