"use client";

import { useState, useTransition } from "react";
import { createPostAction } from "@/lib/actions/social";
import { buttonClass } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/label";
import { VisibilitySelect, type VisibilityValue } from "@/components/social/visibility-select";

type Option = { value: string; label: string };

type Attachment = { kind: "progress" } | { kind: "milestone"; value: string; label: string } | { kind: "badge"; value: string; label: string };

/**
 * SHARE YOUR ARC. Text on its own is a reflection; attaching progress, a
 * milestone or a badge makes it that kind of post. Only milestones and badges
 * the server says you've reached are offered (and accepted).
 */
export function Composer({ milestones, badges, hasArc }: { milestones: Option[]; badges: Option[]; hasArc: boolean }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [picker, setPicker] = useState<"milestone" | "badge" | null>(null);
  const [visibility, setVisibility] = useState<VisibilityValue>("FRIENDS");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const type = attachment?.kind === "milestone" ? "MILESTONE" : attachment?.kind === "badge" ? "BADGE" : attachment?.kind === "progress" ? "PROGRESS" : hasArc ? "REFLECTION" : "CUSTOM";
  const canShare = !!attachment || text.trim().length > 0;

  return (
    <form
      className="rounded-2xl border border-line bg-surface px-5 py-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canShare) return;
        setError(null);
        start(async () => {
          const result = await createPostAction({
            type,
            content: text,
            visibility,
            milestoneType: attachment?.kind === "milestone" ? attachment.value : null,
            badgeKey: attachment?.kind === "badge" ? attachment.value : null,
          });
          if (result.ok) {
            setText("");
            setAttachment(null);
          } else setError(result.error);
        });
      }}
    >
      <SectionLabel as="p">Share your Arc</SectionLabel>
      <label htmlFor="composer" className="sr-only">
        What&apos;s happening?
      </label>
      <textarea
        id="composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="What's happening?"
        className="mt-3 w-full resize-none bg-transparent text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted"
      />

      {attachment ? (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-subtle px-3 py-2 text-sm">
          <span>{attachment.kind === "progress" ? "Today's progress" : attachment.label}</span>
          <button type="button" onClick={() => setAttachment(null)} className="text-xs text-muted hover:text-fg">
            Remove
          </button>
        </div>
      ) : null}

      {picker ? (
        <div className="mt-2 rounded-lg border border-line">
          {(picker === "milestone" ? milestones : badges).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setAttachment({ kind: picker, value: o.value, label: o.label });
                setPicker(null);
              }}
              className="block w-full border-b border-line px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-subtle"
            >
              {o.label}
            </button>
          ))}
          {(picker === "milestone" ? milestones : badges).length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">{picker === "milestone" ? "Your first milestone is Day 7." : "No badges yet. Complete a day to earn your first."}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {hasArc ? (
          <button type="button" onClick={() => setAttachment({ kind: "progress" })} className={buttonClass("ghost", "min-h-9 px-3 text-xs")}>
            Add progress
          </button>
        ) : null}
        <button type="button" onClick={() => setPicker(picker === "milestone" ? null : "milestone")} className={buttonClass("ghost", "min-h-9 px-3 text-xs")}>
          Add milestone
        </button>
        <button type="button" onClick={() => setPicker(picker === "badge" ? null : "badge")} className={buttonClass("ghost", "min-h-9 px-3 text-xs")}>
          Add badge
        </button>
        <div className="ml-auto flex items-center gap-2">
          <VisibilitySelect value={visibility} onChange={setVisibility} />
          <button type="submit" disabled={pending || !canShare} className={buttonClass("primary", "min-w-20")}>
            {pending ? "…" : "Share"}
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
