"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { saveDailyRecord } from "@/lib/actions/daily-record";
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
 * Footer of the TODAY card. On a laptop: type steps in by hand, or read how to
 * connect Google Fit from the phone. On Android: the same guide, with the app
 * download inline.
 */
export function HealthActions({
  date,
  steps,
  editable,
  connected,
}: {
  date: string;
  steps: number | null;
  editable: boolean;
  connected: boolean;
}) {
  const platform = useSyncExternalStore(noSubscribe, detect, (): Platform => "server");
  const [guide, setGuide] = useState(false);
  if (platform === "server") return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      {platform !== "android" && editable ? <ManualSteps key={`${date}:${steps ?? ""}`} date={date} steps={steps} /> : null}
      {!connected ? (
        <button type="button" onClick={() => setGuide(true)} className="mt-3 text-xs text-muted underline underline-offset-4 hover:text-fg">
          Connect Google Fit
        </button>
      ) : null}
      {guide ? <FitGuide open onClose={() => setGuide(false)} platform={platform} /> : null}
    </div>
  );
}

function ManualSteps({ date, steps }: { date: string; steps: number | null }) {
  const [value, setValue] = useState(steps?.toString() ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = value.trim() === "" ? null : Number(value.replace(/[,\s]/g, ""));
        if (n !== null && (!Number.isInteger(n) || n < 0 || n > 200_000)) {
          setMessage("Enter a whole number of steps.");
          return;
        }
        setMessage(null);
        start(async () => {
          const res = await saveDailyRecord(date, { steps: n });
          if (res.ok) {
            setMessage("Saved");
          } else setMessage(res.error);
        });
      }}
    >
      <label htmlFor={`steps-${date}`} className="text-xs text-muted">
        Add steps
      </label>
      <input
        id={`steps-${date}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 8,400"
        autoComplete="off"
        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-fg"
      />
      <button type="submit" disabled={pending} className={buttonClass("secondary", "min-h-9 px-3 text-xs")}>
        {pending ? "…" : "Save"}
      </button>
      {message ? (
        <span role="status" className="text-[0.6875rem] text-muted">
          {message}
        </span>
      ) : null}
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
