"use client";

import { useState, useTransition } from "react";
import {
  createBridgeTokenAction,
  deleteHealthDataAction,
  disconnectHealthAction,
  revokeBridgeTokenAction,
  setHabitIntegrationAction,
} from "@/lib/actions/integrations";
import { HEALTH_DATA_LABELS, HEALTH_DATA_TYPES, type HealthDataType } from "@/lib/health/types";
import { buttonClass } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { SyncButton } from "@/components/health/sync-button";

type Connection = { provider: "GOOGLE_HEALTH" | "HEALTH_CONNECT"; status: "ACTIVE" | "EXPIRED"; lastSyncedAt: string | null; dataTypes: HealthDataType[] };
type Device = { id: string; name: string; lastUsedAt: string | null; createdAt: string };
type Rule = { id: string; title: string; integrationType: "NONE" | "STEPS" | "SLEEP" | "EXERCISE"; integrationTarget: number | null };

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never";

export function HealthSettings({
  configured,
  connections,
  devices,
  rules,
  goals,
  notice,
}: {
  configured: boolean;
  connections: Connection[];
  devices: Device[];
  rules: Rule[];
  goals: { stepGoal: number; sleepGoal: number };
  notice: string | null;
}) {
  const google = connections.find((c) => c.provider === "GOOGLE_HEALTH");
  const bridge = connections.find((c) => c.provider === "HEALTH_CONNECT");

  return (
    <div className="space-y-8">
      {notice ? (
        <p role="status" className="text-sm">
          {notice}
        </p>
      ) : null}

      <div>
        <h3 className="text-sm font-medium">Google Health</h3>
        {!configured ? (
          <p className="mt-2 text-sm text-muted">Google Health isn&apos;t set up on this ARC server yet.</p>
        ) : google?.status === "ACTIVE" ? (
          <GoogleConnected connection={google} />
        ) : (
          <GoogleConnect expired={google?.status === "EXPIRED"} initial={google?.dataTypes} />
        )}
      </div>

      <div className="border-t border-line pt-7">
        <h3 className="text-sm font-medium">Android · Health Connect</h3>
        <p className="mt-1 text-xs text-muted">
          Health Connect lives on your phone, so a small ARC bridge app reads it (with your permission) and sends daily summaries here.
        </p>
        {bridge ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <CheckIcon size={13} /> Last upload {when(bridge.lastSyncedAt)} · {bridge.dataTypes.map((t) => HEALTH_DATA_LABELS[t]).join(", ") || "No data types"}
          </p>
        ) : null}
        <BridgeDevices devices={devices} connected={!!bridge} />
      </div>

      {rules.length ? (
        <div className="border-t border-line pt-7">
          <h3 className="text-sm font-medium">Rules that complete themselves</h3>
          <p className="mt-1 text-xs text-muted">Only rules you connect here are checked off by health data. You can always override a day by tapping it.</p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {rules.map((r) => (
              <RuleIntegration key={r.id} rule={r} goals={goals} />
            ))}
          </ul>
        </div>
      ) : null}

      {connections.length ? <DeleteHealthData /> : null}
    </div>
  );
}

function GoogleConnect({ expired, initial }: { expired: boolean; initial?: HealthDataType[] }) {
  const [types, setTypes] = useState<HealthDataType[]>(initial?.length ? initial : ["steps", "sleep", "exercise"]);
  const href = `/api/health/connect?types=${types.join(",")}&returnTo=${encodeURIComponent("/arc/settings")}`;
  return (
    <div className="mt-2">
      {expired ? <p className="mb-3 text-sm">Health connection expired.</p> : null}
      <p className="text-xs text-muted">Choose what ARC can read. Read-only; you can change or revoke it any time.</p>
      <div className="mt-3 divide-y divide-line border-y border-line">
        {HEALTH_DATA_TYPES.map((t) => (
          <label key={t} className="flex min-h-12 cursor-pointer items-center justify-between text-sm">
            {HEALTH_DATA_LABELS[t]}
            <input
              type="checkbox"
              checked={types.includes(t)}
              onChange={(e) => setTypes((list) => (e.target.checked ? [...list, t] : list.filter((x) => x !== t)))}
              className="h-4 w-4 accent-[var(--color-fg)]"
            />
          </label>
        ))}
      </div>
      <a href={types.length ? href : undefined} aria-disabled={!types.length} className={buttonClass("primary", `mt-4 ${types.length ? "" : "pointer-events-none opacity-40"}`)}>
        {expired ? "Reconnect" : "Connect Google Health"}
      </a>
    </div>
  );
}

function GoogleConnected({ connection }: { connection: Connection }) {
  const [pending, start] = useTransition();
  const [changing, setChanging] = useState(false);
  if (changing) return <GoogleConnect expired={false} initial={connection.dataTypes} />;
  return (
    <div className="mt-2">
      <p className="flex items-center gap-1.5 text-sm">
        <CheckIcon size={14} /> Connected
      </p>
      <dl className="mt-3 space-y-1 text-xs text-muted">
        <div>
          <dt className="inline">Last sync: </dt>
          <dd className="inline">{when(connection.lastSyncedAt)}</dd>
        </div>
        <div>
          <dt className="inline">Reading: </dt>
          <dd className="inline">{connection.dataTypes.map((t) => HEALTH_DATA_LABELS[t]).join(", ") || "nothing"}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <SyncButton variant="button" />
        <button type="button" onClick={() => setChanging(true)} className={buttonClass("ghost", "min-h-9 px-4 text-xs")}>
          Change permissions
        </button>
        <button type="button" disabled={pending} onClick={() => start(() => disconnectHealthAction("GOOGLE_HEALTH").then(() => undefined))} className={buttonClass("ghost", "min-h-9 px-4 text-xs")}>
          Disconnect
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">Synced once a day in the background, and when you open ARC if it&apos;s been a few hours.</p>
    </div>
  );
}

function BridgeDevices({ devices, connected }: { devices: Device[]; connected: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3">
      {devices.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {devices.map((d) => (
            <li key={d.id} className="flex min-h-12 items-center justify-between gap-4 text-sm">
              <span>
                {d.name}
                <span className="ml-2 text-xs text-muted">Last used {when(d.lastUsedAt)}</span>
              </span>
              <button type="button" disabled={pending} onClick={() => start(() => revokeBridgeTokenAction(d.id).then(() => undefined))} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {token ? (
        <div className="mt-3 rounded-lg border border-fg px-4 py-3">
          <p className="text-sm">Paste this into the ARC bridge app. It&apos;s shown once.</p>
          <code className="mt-2 block break-all rounded bg-subtle px-2 py-1.5 text-xs">{token}</code>
          <button type="button" onClick={() => navigator.clipboard?.writeText(token).catch(() => undefined)} className="mt-2 text-xs underline underline-offset-4">
            Copy
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await createBridgeTokenAction("Android phone");
              if (result.ok) setToken(result.token);
              else setError(result.error);
            })
          }
          className={buttonClass("secondary", "mt-3 min-h-9 px-4 text-xs")}
        >
          {connected || devices.length ? "Add another device" : "Set up Android bridge"}
        </button>
      )}
      {error ? <p className="mt-2 text-xs">{error}</p> : null}
      {devices.length && connected ? (
        <button type="button" disabled={pending} onClick={() => start(() => disconnectHealthAction("HEALTH_CONNECT").then(() => undefined))} className="mt-3 block text-xs text-muted underline underline-offset-4 hover:text-fg">
          Disconnect Health Connect
        </button>
      ) : null}
    </div>
  );
}

const TARGET_UNIT = { STEPS: "steps", SLEEP: "min of sleep", EXERCISE: "min of exercise" } as const;

function RuleIntegration({ rule, goals }: { rule: Rule; goals: { stepGoal: number; sleepGoal: number } }) {
  const [type, setType] = useState(rule.integrationType);
  const [target, setTarget] = useState(rule.integrationTarget?.toString() ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const placeholder = type === "STEPS" ? String(goals.stepGoal) : type === "SLEEP" ? String(Math.round(goals.sleepGoal * 60)) : "1";

  const save = (nextType: Rule["integrationType"], nextTarget: string) =>
    start(async () => {
      const n = nextTarget.trim() ? Number(nextTarget) : null;
      const result = await setHabitIntegrationAction({ habitId: rule.id, type: nextType, target: n !== null && Number.isFinite(n) ? Math.round(n) : null });
      setStatus(result.ok ? "Saved" : result.error);
    });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate">{rule.title}</span>
      <select
        aria-label={`Health data for ${rule.title}`}
        value={type}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Rule["integrationType"];
          setType(next);
          save(next, target);
        }}
        className="h-9 rounded-lg border border-line bg-surface px-2 text-xs"
      >
        <option value="NONE">Manual only</option>
        <option value="STEPS">Steps</option>
        <option value="SLEEP">Sleep</option>
        <option value="EXERCISE">Exercise</option>
      </select>
      {type !== "NONE" ? (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          at least
          <input
            inputMode="numeric"
            value={target}
            placeholder={placeholder}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => save(type, target)}
            aria-label="Target"
            className="h-9 w-20 rounded-lg border border-line bg-surface px-2 text-right text-xs text-fg"
          />
          {TARGET_UNIT[type]}
        </span>
      ) : null}
      {status ? <span className="w-full text-right text-[0.6875rem] text-muted">{status}</span> : null}
    </li>
  );
}

function DeleteHealthData() {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="border-t border-line pt-7">
      <h3 className="text-sm font-medium">Imported health data</h3>
      <p className="mt-1 text-xs text-muted">Deletes ARC&apos;s copy only: steps, sleep and weight filled in by a sync, and rules it checked off. Your data at Google or on your phone isn&apos;t touched.</p>
      {done ? (
        <p className="mt-3 text-sm">Imported health data deleted.</p>
      ) : confirm ? (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span>Delete it?</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await deleteHealthDataAction(true);
                if (result.ok) setDone(true);
                setConfirm(false);
              })
            }
            className={buttonClass("danger", "min-h-9 px-4 text-xs")}
          >
            Delete imported data
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="text-xs text-muted hover:text-fg">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className={buttonClass("secondary", "mt-3 min-h-9 px-4 text-xs")}>
          Delete imported health data
        </button>
      )}
    </div>
  );
}
