# ARC

A personal 90-day Winter Arc tracker. Answer honestly. Build your Arc. Show up every day.

Next.js 16 (App Router, Server Components, Server Actions) · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Auth.js v5 (Google)

## Setup

```bash
npm install
cp .env.example .env        # fill in the values
npm run db:migrate          # apply migrations
npm run dev
```

### Environment

| Variable             | Notes                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                                             |
| `AUTH_SECRET`        | `npx auth secret` or `openssl rand -base64 32`                           |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                                                   |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                                               |
| `AUTH_TRUST_HOST`    | `true` when not deployed on Vercel                                       |
| `AUTH_URL`           | Optional. Public base URL, also used for Open Graph metadata             |

Google Cloud Console → Credentials → OAuth client (Web). Authorized redirect URI:
`http://localhost:3000/api/auth/callback/google` (plus your production equivalent).

### Local Postgres (optional)

```bash
docker run -d --name arc-postgres -e POSTGRES_USER=arc -e POSTGRES_PASSWORD=arc \
  -e POSTGRES_DB=arc -p 54329:5432 postgres:16-alpine
# DATABASE_URL="postgresql://arc:arc@localhost:54329/arc?schema=public"
```

## Deploy

```bash
npm run db:deploy   # prisma migrate deploy
npm run build
npm start
```

## How it works

- **Assessment → Arc.** `lib/assessment.ts` holds the 13 questions as config. `lib/arc-engine.ts` is a
  deterministic, rule-based engine: answers score candidate rules, overlapping rules are deduplicated by
  group, and difficulty + current consistency decide the count (3–6). The same answers pick the tracking
  modules the Arc uses and their starting goals (`generateTracking`).
- **Habits, metrics, tasks and reflection are separate.** Habits (`Habit` / `HabitLog`) are commitments.
  Metrics (steps, weight, focus hours, DSA, sleep) and the journal live on one `DailyRecord` per day.
  Tasks are `DailyTask` rows. Modules (`lib/modules.ts`) decide what each Arc shows.
- **Days.** Each Arc stores the user's IANA timezone; "today" is computed on the server in that timezone.
  Any day from the start of the Arc to today can be edited (`/arc?date=YYYY-MM-DD`, or the ← → keys).
- **Daily score.** `lib/scoring.ts`: habits weigh double, metrics give partial credit toward their goal,
  tasks count one each. A metric only counts on days it was tracked. Weight and the journal are never scored.
- **Reproducible history.** Each `DailyRecord` snapshots the goals and modules in effect that day, so a
  goal or module change only affects today onward. Retired habits keep their logs and keep counting for
  the days they were active (`activeFrom` / `deactivatedOn`).
- **Every rule is explained.** The engine records which answers gave each rule its points and stores a
  plain-language `reason` ("Because you scroll 2+ hours a day…"). Amounts come from the answers too:
  focus minutes from capacity and difficulty, movement from activity level, scroll limits from usage.
- **One day list.** `/arc/plan` is a repeating timetable (`TimeBlock`: every day / weekdays / weekends). A block
  can be linked to a rule, so the block is that rule's checkbox. Today shows rules, timetable blocks and timed
  tasks as one time-ordered list, with unscheduled rules and tasks under *Anytime*. The suggested plan
  (`lib/timetable.ts`) is built from the Arc and starts at the wake-up rule's time.
- **Winter Arc defaults.** Every new Arc starts with *Wake up at 5:30* and *Cold shower*; users can edit
  (e.g. change the time in the title) or remove them.
- **Streaks.** `lib/streaks.ts`: a day counts at 80%+. An unfinished today never breaks the streak.
- **Backups.** `/arc/export` downloads JSON (no ids or tokens). Import validates with Zod, previews, then
  restores as a separate Arc; an existing active Arc is archived, never overwritten.
- **Security.** Database sessions. Every action derives the user from the session, reaches data only
  through that user's ACTIVE Arc, validates input with Zod, then revalidates. A partial unique index
  enforces one ACTIVE Arc per user. `proxy.ts` is only an optimistic redirect.
- **Post-login routing.** `/start` redirects to `/arc` or `/onboarding`.

## Phase 3: social, gamification, health, LinkedIn

The Arc stays the center. Everything below sits around it and is optional.

- **Routes.** Signed-in pages share one shell in `app/(app)/`: `/arc` (Today), `/arc/plan`, `/arc/progress`,
  `/social`, `/friends`, `/leaderboard`, `/badges`, `/profile`, `/notifications`, `/arc/settings`
  (`/progress` and `/settings` redirect). Public: `/u/[username]` and `/milestone/[id]` (with an OG image).
- **XP** (`lib/gamification/xp.ts`). All amounts are constants there. XP is only awarded by the server-side
  achievement engine (`lib/gamification/achievements.ts`), which runs after every tracking mutation, as
  immutable `XPEvent` rows with a unique `(userId, key)` idempotency key. Rule XP is paid once per rule per day,
  only for today and yesterday, and capped per day, so toggling, editing history or recreating rules can't farm
  it. `User.totalXp` is a cache of the ledger (`recomputeTotalXp` rebuilds it). No XP for likes or friends;
  milestone posts earn 5 XP at most once a day.
- **Levels** (`levels.ts`): 0, 100, 250, 500, 850, then each level costs 100 more than the last.
- **Badges** (`badges.ts`): 18 badges defined in code with a progress function each, synced into `Badge`.
  Streak and Arc-completion rewards are paid through their badges. Unseen unlocks show once as a quiet card.
- **Social.** Friend requests (`FriendRequest.pairKey` makes one request per pair; `Friendship` stored both ways),
  posts (progress, milestone, badge, reflection, custom), three reactions, notifications (no WebSockets).
  Visibility is enforced in the feed query (`lib/social/feed.ts`), chronological, cursor-paginated (20).
  Milestone numbers come from the server, never the client.
- **Privacy.** Profile Public / Friends (default) / Private, per-stat toggles, leaderboard Show / Anonymous /
  Hide. Leaderboards (`lib/social/leaderboard.ts`) are separate rankings (XP, streak, completion, badges) over
  cached per-user stats; a streak that stopped counting drops off automatically. Health data never appears in
  any social surface.
- **LinkedIn** (`lib/linkedin/`). OAuth (`openid profile w_member_social`) with a signed, single-use state
  cookie bound to the user (`lib/oauth-state.ts`). Tokens are AES-256-GCM encrypted (`lib/crypto.ts`) and never
  leave the server. Deterministic templates contain milestones only; the user edits a preview and confirms
  before anything is posted. Optional public milestone card for the link preview.
- **Health** (`lib/health/`). Google Health API v4 (not Google Fit) with a separate, granular, read-only consent
  per data type. Providers implement `HealthProvider` and normalize into `HealthDailyMetric` (records
  de-duplicated by provider id, each day hashed so re-syncs are no-ops). Sync runs daily
  (`/api/health/cron`, see `vercel.json`), on "Sync now", and after page views when data is 6+ hours old.
  Imported values fill day-record metrics and complete only rules explicitly connected to health data; manual
  entries and taps always win. Disconnect revokes; "Delete imported health data" removes ARC's copy only.
  Android Health Connect goes through the small bridge app in `android-bridge/`.
- **Rate limits** (`lib/rate-limit.ts`): Postgres fixed windows for requests, posts, reactions, LinkedIn posts,
  health syncs, ingest and search.

New environment variables are documented in `.env.example`. Tests: `npm test` (unit tests always; database
integration tests run when `DATABASE_URL` points at a migrated database).

## Scripts

`dev` · `build` · `start` · `lint` · `typecheck` · `test` · `db:migrate` · `db:deploy` · `db:studio`
