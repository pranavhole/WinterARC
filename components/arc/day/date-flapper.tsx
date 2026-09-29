import { formatDay, type DayKey } from "@/lib/utils";

/**
 * Split-flap mechanical display for the Arc day and calendar date.
 * Styled after classic Solari flip-clocks and airport departure boards.
 */
export function DateFlapper({
  dayNumber,
  arcLength,
  date,
  isToday,
  daysRemaining,
  isFuture,
}: {
  dayNumber: number;
  arcLength: number;
  date: DayKey;
  isToday: boolean;
  daysRemaining: number;
  isFuture: boolean;
}) {
  // Format day number as 2 or 3 digit cards (e.g. Day 4 -> "0", "4")
  const padLength = arcLength >= 100 ? 3 : 2;
  const dayPadded = String(Math.max(1, dayNumber)).padStart(padLength, "0");
  const dayDigits = dayPadded.split("");

  // Extract calendar segments in UTC
  const weekday = formatDay(date, { weekday: "short" }).toUpperCase();
  const dayOfMonth = formatDay(date, { day: "2-digit" });
  const month = formatDay(date, { month: "short" }).toUpperCase();

  const formattedFull = formatDay(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Accessible screen-reader heading */}
      <h1 className="sr-only">
        Day {dayNumber} of {arcLength}, {formattedFull}
      </h1>

      {/* Flap Board */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3" aria-hidden="true">
        {/* Day number flap group */}
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[0.625rem] font-semibold uppercase tracking-widest text-muted">
            Day
          </span>
          <div className="flex items-center gap-1">
            {dayDigits.map((digit, i) => (
              <FlapCard key={`day-${i}`} text={digit} size="lg" />
            ))}
          </div>
          <span className="tabular font-mono text-xs text-muted">/ {arcLength}</span>
        </div>

        <span className="hidden h-5 w-px bg-line sm:block" />

        {/* Date flap group */}
        <div className="flex items-center gap-1.5">
          <FlapCard text={weekday} size="sm" wide />
          <FlapCard text={dayOfMonth} size="sm" />
          <FlapCard text={month} size="sm" wide />
        </div>
      </div>

      {/* Subtitle context line */}
      <p className="tabular text-xs text-muted">
        {isToday ? (
          daysRemaining === 0 ? (
            <span className="font-semibold text-fg">Final day of your Arc</span>
          ) : (
            <span>
              <span className="font-semibold text-fg">{daysRemaining}</span>{" "}
              {daysRemaining === 1 ? "day" : "days"} remaining
            </span>
          )
        ) : isFuture ? (
          <span>Upcoming day · {formattedFull}</span>
        ) : (
          <span>Viewing past day · {formattedFull}</span>
        )}
      </p>
    </div>
  );
}

/**
 * Individual split-flap physical card.
 * Features a split seam, dark ink texture, and top/bottom leaf styling.
 */
export function FlapCard({
  text,
  size = "lg",
  wide = false,
}: {
  text: string;
  size?: "sm" | "lg";
  wide?: boolean;
}) {
  const isLarge = size === "lg";

  return (
    <span
      className={`relative inline-flex items-center justify-center [perspective:400px] overflow-hidden rounded-[6px] bg-gradient-to-b from-[#2a2926] via-[#201f1c] to-[#151412] font-mono font-extrabold tabular-nums text-[#faf8f5] shadow-[0_3px_8px_rgba(0,0,0,0.24),0_1px_2px_rgba(0,0,0,0.18)] select-none border border-[#3e3c36] ring-1 ring-black/40 ${
        isLarge
          ? "h-9 min-w-7 px-1 text-xl sm:h-10 sm:min-w-8 sm:text-2xl"
          : wide
          ? "h-7 min-w-9 px-1.5 text-xs sm:h-8 sm:min-w-10 sm:text-xs"
          : "h-7 min-w-6 px-1 text-xs sm:h-8 sm:min-w-7 sm:text-xs"
      }`}
    >
      <span
        key={text}
        className="animate-flap-flip flex h-full w-full items-center justify-center"
      >
        {/* Top half subtle glass-leaf lighting */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent border-b border-black/80"
        />

        {/* Center split line with physical groove shadow */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-black shadow-[0_1px_0_rgba(255,255,255,0.12)]"
        />

        {/* Mechanical side hinge notches */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1/2 h-1.5 w-[2.5px] -translate-y-1/2 rounded-r-xs bg-bg border-y border-black/60 shadow-inner"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 h-1.5 w-[2.5px] -translate-y-1/2 rounded-l-xs bg-bg border-y border-black/60 shadow-inner"
        />

        {/* The character/text in luminous off-white with edge shadow */}
        <span className="relative z-10 leading-none tracking-tight text-[#faf8f5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {text}
        </span>
      </span>
    </span>
  );
}
