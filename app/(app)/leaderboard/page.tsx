import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BOARDS, getLeaderboard, PERIODS, type Board, type Period, type Scope } from "@/lib/social/leaderboard";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/label";

export const metadata: Metadata = { title: "Leaderboard" };

type Search = { board?: string; period?: string; scope?: string };

function unit(board: Board, value: number) {
  if (board === "xp") return `${value.toLocaleString("en-US")} XP`;
  if (board === "streak") return `${value} ${value === 1 ? "day" : "days"}`;
  if (board === "completion") return `${value}%`;
  return `${value} ${value === 1 ? "badge" : "badges"}`;
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const board: Board = sp.board && sp.board in BOARDS ? (sp.board as Board) : "xp";
  const period: Period = sp.period && sp.period in PERIODS ? (sp.period as Period) : "week";
  const scope: Scope = sp.scope === "friends" ? "friends" : "everyone";
  const entries = await getLeaderboard(user.id, board, period, scope);
  const def = BOARDS[board];

  const href = (next: Partial<{ board: Board; period: Period; scope: Scope }>) => {
    const p = new URLSearchParams({ board, period, scope, ...next });
    return `/leaderboard?${p}`;
  };

  return (
    <div className="animate-fade">
      <SectionLabel as="h1">Arc leaderboard</SectionLabel>

      <nav aria-label="Ranking" className="mt-5 flex flex-wrap gap-1.5">
        {(Object.keys(BOARDS) as Board[]).map((b) => (
          <Pill key={b} href={href({ board: b })} active={b === board}>
            {BOARDS[b].label}
          </Pill>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {def.periodic ? (
          <nav aria-label="Period" className="flex gap-1.5">
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <Pill key={p} href={href({ period: p })} active={p === period} quiet>
                {PERIODS[p]}
              </Pill>
            ))}
          </nav>
        ) : (
          <span className="text-xs text-muted">Right now</span>
        )}
        <nav aria-label="Who" className="flex gap-1.5">
          <Pill href={href({ scope: "everyone" })} active={scope === "everyone"} quiet>
            Everyone
          </Pill>
          <Pill href={href({ scope: "friends" })} active={scope === "friends"} quiet>
            Friends
          </Pill>
        </nav>
      </div>

      <p className="mt-6 text-xs text-muted">
        Ranked by {def.measures.toLowerCase()}
        {def.periodic ? ` · ${PERIODS[period].toLowerCase()}` : ""}.
      </p>

      {entries.length ? (
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {entries.map((e) => (
            <li key={`${e.rank}-${e.username ?? "anon"}`} className={cn("flex items-center gap-4 py-3.5", e.isMe && "-mx-3 rounded-lg bg-subtle px-3")}>
              <span className="tabular w-7 text-sm text-muted">{e.rank}</span>
              <Avatar src={e.image} name={e.name} size={30} />
              <div className="min-w-0 flex-1">
                {e.anonymous || !e.username ? (
                  <p className="truncate text-sm">{e.anonymous ? "Anonymous" : (e.name ?? "Someone")}</p>
                ) : (
                  <Link href={`/u/${e.username}`} className="block truncate text-sm hover:underline">
                    {e.name ?? e.username}
                    {e.isMe ? <span className="text-muted"> · you</span> : null}
                  </Link>
                )}
                <p className="tabular text-xs text-muted">Level {e.level}</p>
              </div>
              <span className="tabular text-sm font-semibold">{unit(board, e.value)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-10 text-center text-sm text-muted">No one here yet{scope === "friends" ? " among your friends" : ""}.</p>
      )}

      <p className="mt-6 text-xs text-muted">
        Hide yourself or appear anonymously in{" "}
        <Link href="/arc/settings#privacy" className="underline underline-offset-4 hover:text-fg">
          privacy settings
        </Link>
        .
      </p>
    </div>
  );
}

function Pill({ href, active, quiet, children }: { href: string; active: boolean; quiet?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active ? (quiet ? "border-fg text-fg" : "border-fg bg-fg text-bg") : "border-line text-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}
