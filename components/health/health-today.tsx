import Link from "next/link";
import { formatDuration, formatSteps } from "@/lib/metrics";
import type { HealthConnectionView } from "@/lib/health/view";
import { SOURCE_LABEL } from "@/lib/health/view";
import { SyncButton } from "@/components/health/sync-button";

type Metric = {
  steps: number | null;
  sleepMinutes: number | null;
  exerciseMinutes: number | null;
  weight: number | null;
  source: "GOOGLE_HEALTH" | "HEALTH_CONNECT";
} | null;

function syncedLabel(date: Date | null, timeZone: string) {
  if (!date) return "Not synced yet";
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  return day === today ? `Today, ${time}` : `${day}, ${time}`;
}

/** TODAY · Steps / Sleep / Exercise / Weight from connected health data. Private to the owner. */
export function HealthToday({
  connections,
  metric,
  stepGoal,
  timeZone,
  isToday,
}: {
  connections: HealthConnectionView[];
  metric: Metric;
  stepGoal: number;
  timeZone: string;
  isToday: boolean;
}) {
  const active = connections.filter((c) => c.status === "ACTIVE");
  const expired = connections.find((c) => c.status === "EXPIRED");

  if (!connections.length) {
    return (
      <p className="text-sm text-muted">
        <Link href="/arc/settings#health" className="underline underline-offset-4 hover:text-fg">
          Connect Health
        </Link>{" "}
        to fill in steps, sleep and exercise automatically.
      </p>
    );
  }
  if (!active.length && expired) {
    return (
      <p className="text-sm">
        Health connection expired.{" "}
        <Link href="/arc/settings#health" className="underline underline-offset-4">
          Reconnect
        </Link>
      </p>
    );
  }

  const google = active.find((c) => c.provider === "GOOGLE_HEALTH");
  const last = active.map((c) => c.lastSyncedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const types = new Set(active.flatMap((c) => c.dataTypes));
  const rows = [
    types.has("steps") ? { label: "Steps", value: metric?.steps != null ? `${formatSteps(metric.steps)} / ${formatSteps(stepGoal)}` : "—" } : null,
    types.has("sleep") ? { label: "Sleep", value: formatDuration(metric?.sleepMinutes ?? null) } : null,
    types.has("exercise") ? { label: "Exercise", value: metric?.exerciseMinutes != null ? `${metric.exerciseMinutes}m` : "—" } : null,
    types.has("weight") ? { label: "Weight", value: metric?.weight != null ? `${metric.weight.toFixed(1)} kg` : "—" } : null,
  ].filter((r) => r !== null);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs text-muted">{r.label}</dt>
            <dd className="tabular mt-0.5 text-lg font-semibold">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span suppressHydrationWarning>
          ↻ {metric ? SOURCE_LABEL[metric.source] : "Synced"} · {syncedLabel(last, timeZone)}
        </span>
        {google && isToday ? <SyncButton /> : null}
      </p>
    </div>
  );
}
