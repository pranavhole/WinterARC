"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { saveManualLog } from "@/lib/actions/manual-log";
import { ANDROID_APP_URL, isAndroid } from "@/lib/android";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Platform = "server" | "android" | "ios" | "desktop";

const noSubscribe = () => () => {};
function detect(): Platform {
  const ua = navigator.userAgent;
  if (isAndroid(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "desktop";
}

/**
 * Footer of the TODAY card: log steps, sleep, exercise and weight by hand, and
 * (when nothing is connected) the guide to connecting Google Fit from a phone.
 */
export function HealthActions({
  date,
  values,
  editable,
  connected,
}: {
  date: string;
  values: ManualValues;
  editable: boolean;
  connected: boolean;
}) {
  const platform = useSyncExternalStore(noSubscribe, detect, (): Platform => "server");
  const [guide, setGuide] = useState(false);
  const [logging, setLogging] = useState(false);
  if (platform === "server") return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      {editable ? (
        logging ? (
          <ManualLog key={date} date={date} values={values} onDone={() => setLogging(false)} />
        ) : (
          <button type="button" onClick={() => setLogging(true)} className={buttonClass("secondary", "min-h-9 w-full px-3 text-xs")}>
            Log manually
          </button>
        )
      ) : null}
      {!connected ? (
        <button type="button" onClick={() => setGuide(true)} className="mt-3 text-xs text-muted underline underline-offset-4 hover:text-fg">
          Connect Google Fit
        </button>
      ) : null}
      {guide ? <FitGuide open onClose={() => setGuide(false)} platform={platform} /> : null}
    </div>
  );
}

export type ManualValues = {
  steps: number | null;
  sleepMinutes: number | null;
  exerciseMinutes: number | null;
  weight: number | null;
};

/** "" → null (clear); otherwise a finite number or undefined when invalid. */
function parse(value: string): number | null | undefined {
  const t = value.replace(/[,\s]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function ManualLog({ date, values, onDone }: { date: string; values: ManualValues; onDone: () => void }) {
  const [steps, setSteps] = useState(values.steps?.toString() ?? "");
  const [sleep, setSleep] = useState(values.sleepMinutes !== null ? String(Math.round((values.sleepMinutes / 60) * 100) / 100) : "");
  const [exercise, setExercise] = useState(values.exerciseMinutes?.toString() ?? "");
  const [weight, setWeight] = useState(values.weight?.toString() ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const field = (id: string, label: string, unit: string, value: string, set: (v: string) => void, placeholder: string, decimal = false) => (
    <label htmlFor={`${id}-${date}`} className="block">
      <span className="text-[0.6875rem] text-muted">{label}</span>
      <span className="mt-1 flex h-9 items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-fg">
        <input
          id={`${id}-${date}`}
          inputMode={decimal ? "decimal" : "numeric"}
          value={value}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="tabular min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <span className="ml-1 text-[0.6875rem] text-muted">{unit}</span>
      </span>
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const s = parse(steps);
        const sl = parse(sleep);
        const ex = parse(exercise);
        const w = parse(weight);
        if (s === undefined || (s !== null && (!Number.isInteger(s) || s > 200_000))) return setMessage("Steps: a whole number, up to 200,000.");
        if (sl === undefined || (sl !== null && sl > 24)) return setMessage("Sleep: hours, e.g. 7.5.");
        if (ex === undefined || (ex !== null && (!Number.isInteger(ex) || ex > 1440))) return setMessage("Exercise: whole minutes.");
        if (w === undefined || (w !== null && (w <= 0 || w > 500))) return setMessage("Weight: kilograms, e.g. 72.4.");

        // Only send what changed, so an untouched imported value stays imported.
        const payload: Record<string, number | null> = {};
        if (s !== values.steps) payload.steps = s;
        const sleepMin = sl === null ? null : Math.round(sl * 60);
        if (sleepMin !== values.sleepMinutes) payload.sleepMinutes = sleepMin;
        if (ex !== values.exerciseMinutes) payload.exerciseMinutes = ex;
        if (w !== values.weight) payload.weight = w;
        if (!Object.keys(payload).length) return onDone();

        setMessage(null);
        start(async () => {
          const res = await saveManualLog(date, payload);
          if (res.ok) onDone();
          else setMessage(res.error);
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {field("steps", "Steps", "", steps, setSteps, "8,400")}
        {field("sleep", "Sleep", "h", sleep, setSleep, "7.5", true)}
        {field("exercise", "Exercise", "min", exercise, setExercise, "45")}
        {field("weight", "Weight", "kg", weight, setWeight, "72.4", true)}
      </div>
      {message ? (
        <p role="alert" className="mt-2 text-xs">
          {message}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "min-h-9 flex-1 px-3 text-xs")}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className={buttonClass("ghost", "min-h-9 px-3 text-xs")}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** How to get Google Fit steps into ARC: Fit → Health Connect → the ARC app. */
function FitGuide({ open, onClose, platform }: { open: boolean; onClose: () => void; platform: Platform }) {
  const site = typeof window !== "undefined" ? window.location.host : "this site";
  return (
    <Dialog open={open} onClose={onClose} title="Connect Google Fit">
      {platform === "ios" ? (
        <p className="text-sm text-muted">Google Fit sync works through Android&apos;s Health Connect, so it needs an Android phone. On iPhone, add your steps by hand for now.</p>
      ) : (
        <>
          <p className="text-sm text-muted">Google Fit keeps your data on your phone, so connect it from there. It takes about two minutes.</p>
          <ol className="mt-4 space-y-3.5 text-sm">
            <Step n={1} title="Sync Google Fit with Health Connect">
              In the Google Fit app, tap <b>Sync Fit with Health Connect → Get started</b> (or Profile → Settings → Health Connect) and allow steps, sleep, activity and weight.
            </Step>
            <Step n={2} title="Install the ARC app">
              {platform === "android" ? (
                <>
                  <a href={ANDROID_APP_URL} className="underline underline-offset-4">
                    Download the ARC app
                  </a>
                  , open it and tap <b>Install</b> (allow installs from your browser if asked).
                </>
              ) : (
                <>
                  On your phone, open <b>{site}</b> and sign in. Tap <b>Install</b> on the &ldquo;Get the ARC app&rdquo; banner.
                </>
              )}
            </Step>
            <Step n={3} title="Link it to your Arc">
              In ARC on your phone, go to <b>Settings → Health → Set up Android bridge</b> and tap <b>Open in ARC app</b>.
            </Step>
            <Step n={4} title="Allow and sync">
              Tap <b>Save and grant access</b>, allow the permissions in Health Connect, then <b>Sync now</b>. After that it syncs every day on its own.
            </Step>
          </ol>
        </>
      )}
      <button type="button" onClick={onClose} className={buttonClass("secondary", "mt-6 w-full")}>
        Got it
      </button>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg text-xs font-medium text-bg">{n}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted [&_b]:font-medium [&_b]:text-fg">{children}</p>
      </div>
    </li>
  );
}
