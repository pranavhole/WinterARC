"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { createPostAction } from "@/lib/actions/social";
import { getLinkedInStatusAction, shareToLinkedInAction } from "@/lib/actions/integrations";
import { LINKEDIN_MAX, linkedInText, type ShareSubject } from "@/lib/linkedin/templates";
import { parseMilestone } from "@/lib/social/milestones";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { VisibilitySelect } from "@/components/social/visibility-select";

export type ShareTarget =
  | { kind: "milestone"; milestoneType: string; title: string; arcLength: number | null }
  | { kind: "badge"; badgeKey: string; title: string; description: string; dayNumber: number | null; arcLength: number | null };

function templateSubject(t: ShareTarget): ShareSubject | null {
  if (t.kind === "badge") return { kind: "badge", badgeName: t.title, badgeDescription: t.description, dayNumber: t.dayNumber, arcLength: t.arcLength };
  const milestone = parseMilestone(t.milestoneType);
  return milestone ? { kind: "milestone", milestone, arcLength: t.arcLength } : null;
}

type Tab = "arc" | "linkedin";

/**
 * Share a milestone or badge on ARC or LinkedIn. LinkedIn always shows an
 * editable preview and posts only when the user presses "Post to LinkedIn".
 */
export function ShareDialog({ target, open, onClose, initialTab = "arc" }: { target: ShareTarget; open: boolean; onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <Dialog open={open} onClose={onClose} title="Share">
      <div className="rounded-xl bg-subtle px-5 py-5 text-center">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.3em] text-muted">ARC</p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.14em]">{target.title}</p>
        {target.kind === "badge" ? <p className="mt-2 text-xs text-muted">{target.description}</p> : null}
      </div>

      <div role="tablist" aria-label="Where to share" className="mt-5 grid grid-cols-2 rounded-lg border border-line p-0.5 text-sm">
        {(["arc", "linkedin"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("h-9 rounded-md transition-colors", tab === t ? "bg-fg text-bg" : "text-muted hover:text-fg")}
          >
            {t === "arc" ? "Share on ARC" : "Share on LinkedIn"}
          </button>
        ))}
      </div>

      <div className="mt-5">{tab === "arc" ? <ArcShare target={target} onDone={onClose} /> : <LinkedInShare target={target} />}</div>
    </Dialog>
  );
}

function ArcShare({ target, onDone }: { target: ShareTarget; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("FRIENDS");
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [pending, start] = useTransition();

  if (shared) return <p className="text-sm">Shared with {visibility === "PUBLIC" ? "everyone" : visibility === "FRIENDS" ? "your friends" : "only you"}.</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const result = await createPostAction({
            type: target.kind === "badge" ? "BADGE" : "MILESTONE",
            content: note,
            visibility,
            milestoneType: target.kind === "milestone" ? target.milestoneType : null,
            badgeKey: target.kind === "badge" ? target.badgeKey : null,
          });
          if (result.ok) {
            setShared(true);
            setTimeout(onDone, 900);
          } else setError(result.error);
        });
      }}
    >
      <label className="block text-xs text-muted" htmlFor="share-note">
        Add a line (optional)
      </label>
      <textarea
        id="share-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="The hardest part was simply showing up."
        className="mt-2 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg"
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <VisibilitySelect value={visibility} onChange={setVisibility} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "min-w-28")}>
          {pending ? "Sharing…" : "Share"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}

type Status = Awaited<ReturnType<typeof getLinkedInStatusAction>>;

function LinkedInShare({ target }: { target: ShareTarget }) {
  const pathname = usePathname();
  const subject = templateSubject(target);
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState(() => (subject ? linkedInText(subject) : ""));
  const [editing, setEditing] = useState(false);
  const [attachCard, setAttachCard] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<{ message: string; reconnect?: boolean } | null>(null);
  const [posted, setPosted] = useState<{ url: string | null } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    getLinkedInStatusAction().then(setStatus, () => setStatus({ configured: false, connected: false }));
  }, []);

  const connectHref = `/api/linkedin/connect?returnTo=${encodeURIComponent(pathname)}`;

  if (!status) return <p className="text-sm text-muted">Checking LinkedIn…</p>;
  if (!status.configured) return <p className="text-sm text-muted">LinkedIn sharing isn&apos;t set up on this ARC server yet.</p>;
  if (!status.connected || status.expired || error?.reconnect) {
    return (
      <div>
        <p className="text-sm">{status.connected && (status.expired || error?.reconnect) ? "LinkedIn connection expired." : "Connect LinkedIn to share this milestone."}</p>
        <p className="mt-1 text-xs text-muted">You&apos;ll see a preview and confirm before anything is posted.</p>
        <a href={connectHref} className={buttonClass("primary", "mt-4 w-full")}>
          {status.connected ? "Reconnect LinkedIn" : "Connect LinkedIn"}
        </a>
      </div>
    );
  }

  if (posted) {
    return (
      <div>
        <p className="text-sm font-medium">Posted to LinkedIn.</p>
        {posted.url ? (
          <a href={posted.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-muted underline underline-offset-4 hover:text-fg">
            View post
          </a>
        ) : null}
      </div>
    );
  }

  const apiSubject = target.kind === "badge" ? { kind: "badge", badgeKey: target.badgeKey } : { kind: "milestone", milestoneType: target.milestoneType };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted">Preview</p>
        <button type="button" onClick={() => setEditing((e) => !e)} className="text-xs text-muted underline underline-offset-4 hover:text-fg">
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      {editing ? (
        <textarea
          aria-label="LinkedIn post text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setConfirming(false);
          }}
          maxLength={LINKEDIN_MAX}
          rows={9}
          className="mt-2 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-fg"
        />
      ) : (
        <div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed">{text}</div>
      )}
      <p className="mt-2 text-xs text-muted">Posting as {status.name ?? "you"}. Health data and private habits are never included.</p>

      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={attachCard} onChange={(e) => setAttachCard(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-fg)]" />
        <span>
          Attach a milestone card
          <span className="block text-xs text-muted">Publishes this milestone as a public ARC page that LinkedIn links to.</span>
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error.message}
        </p>
      ) : null}

      {confirming ? (
        <div className="mt-5 rounded-lg border border-fg px-4 py-3">
          <p className="text-sm">Post this to your LinkedIn now?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending || !text.trim()}
              className={buttonClass("primary", "flex-1")}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const result = await shareToLinkedInAction({ subject: apiSubject, text, attachCard });
                  if (result.ok) setPosted({ url: result.url });
                  else setError({ message: result.error, reconnect: result.reconnect });
                  setConfirming(false);
                })
              }
            >
              {pending ? "Posting…" : "Yes, post"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonClass("secondary")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={!text.trim()} onClick={() => setConfirming(true)} className={buttonClass("primary", "mt-5 w-full")}>
          Post to LinkedIn
        </button>
      )}
    </div>
  );
}
