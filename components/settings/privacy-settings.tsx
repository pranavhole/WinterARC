"use client";

import { useState, useTransition } from "react";
import { updatePrivacyAction, updateUsernameAction } from "@/lib/actions/profile";
import { buttonClass } from "@/components/ui/button";

type Privacy = {
  profileVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  leaderboardVisibility: "SHOW" | "ANONYMOUS" | "HIDDEN";
  showXp: boolean;
  showStreak: boolean;
  showBadges: boolean;
  showArcDay: boolean;
};

const TOGGLES: { key: keyof Pick<Privacy, "showXp" | "showStreak" | "showBadges" | "showArcDay">; label: string }[] = [
  { key: "showXp", label: "Show my XP and level" },
  { key: "showStreak", label: "Show my streak" },
  { key: "showBadges", label: "Show my badges" },
  { key: "showArcDay", label: "Show my Arc day" },
];

/** Saves each change immediately. Health data is never shown to anyone, whatever these say. */
export function PrivacySettings({ initial, username }: { initial: Privacy; username: string }) {
  const [privacy, setPrivacy] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const save = (patch: Partial<Privacy>) => {
    const previous = privacy;
    setPrivacy({ ...privacy, ...patch });
    setError(null);
    start(async () => {
      const result = await updatePrivacyAction(patch);
      if (!result.ok) {
        setPrivacy(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-7">
      <UsernameField initial={username} />

      <Choice
        label="Profile visibility"
        value={privacy.profileVisibility}
        options={[
          { value: "PUBLIC", label: "Public", hint: "Anyone with the link" },
          { value: "FRIENDS", label: "Friends", hint: "Only your friends" },
          { value: "PRIVATE", label: "Private", hint: "Only you" },
        ]}
        onChange={(v) => save({ profileVisibility: v })}
      />

      <Choice
        label="Leaderboards"
        value={privacy.leaderboardVisibility}
        options={[
          { value: "SHOW", label: "Show me", hint: "With your name" },
          { value: "ANONYMOUS", label: "Anonymous", hint: "Ranked, no name" },
          { value: "HIDDEN", label: "Hide me", hint: "Not ranked" },
        ]}
        onChange={(v) => save({ leaderboardVisibility: v })}
      />

      <fieldset>
        <legend className="text-sm font-medium">On your profile</legend>
        <div className="mt-2 divide-y divide-line border-y border-line">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex min-h-12 cursor-pointer items-center justify-between gap-4 text-sm">
              {t.label}
              <input type="checkbox" checked={privacy[t.key]} onChange={(e) => save({ [t.key]: e.target.checked })} className="h-4 w-4 accent-[var(--color-fg)]" />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Hiding a stat also leaves you off that stat&apos;s leaderboard. Health data is never shown to anyone.</p>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${value === o.value ? "border-fg" : "border-line text-muted hover:text-fg"}`}
          >
            <input type="radio" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="block">{o.label}</span>
            <span className="mt-0.5 block text-[0.6875rem] text-muted">{o.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function UsernameField({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await updateUsernameAction(value);
          if (result.ok) setSaved(value.trim().toLowerCase());
          else setError(result.error);
        });
      }}
    >
      <label htmlFor="username" className="text-sm font-medium">
        Username
      </label>
      <div className="mt-2 flex gap-2">
        <div className="flex h-11 flex-1 items-center rounded-lg border border-line bg-surface px-3 text-sm focus-within:border-fg">
          <span className="text-muted">@</span>
          <input id="username" value={value} onChange={(e) => setValue(e.target.value)} maxLength={20} autoComplete="off" className="ml-0.5 w-full bg-transparent outline-none" />
        </div>
        <button type="submit" disabled={pending || value.trim().toLowerCase() === saved} className={buttonClass("secondary")}>
          Save
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{error ?? `Your profile: /u/${saved}`}</p>
    </form>
  );
}
