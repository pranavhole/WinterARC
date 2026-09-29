"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_DRAFT,
  isAnswered,
  parseAnswers,
  QUESTIONS,
  type DraftAnswers,
  type Question,
} from "@/lib/assessment";
import { generateArc, type GeneratedArc } from "@/lib/arc-engine";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, GoalIcons, MountainIcon } from "@/components/ui/icons";
import { ArcPreview } from "@/components/onboarding/arc-preview";

const AUTO_ADVANCE_MS = 260;
const INTRO = -1;
const PREVIEW = QUESTIONS.length;

export function Assessment({ returning }: { returning: boolean }) {
  const [step, setStep] = useState(INTRO);
  const [draft, setDraft] = useState<DraftAnswers>(DEFAULT_DRAFT);
  const [arc, setArc] = useState<GeneratedArc | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Move focus to the new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (step !== INTRO) headingRef.current?.focus();
  }, [step]);

  useEffect(() => () => clearTimeout(advanceTimer.current ?? undefined), []);

  const question = step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null;
  const isLast = step === QUESTIONS.length - 1;

  function goTo(next: number) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setStep(next);
  }

  function finish(finalDraft: DraftAnswers) {
    const answers = parseAnswers(finalDraft);
    if (!answers) {
      // Jump to the first unanswered question.
      const missing = QUESTIONS.findIndex((q) => !isAnswered(q, finalDraft));
      goTo(Math.max(0, missing));
      return;
    }
    setArc(generateArc(answers));
    goTo(PREVIEW);
  }

  function next(currentDraft = draft) {
    if (!question || !isAnswered(question, currentDraft)) return;
    if (isLast) finish(currentDraft);
    else goTo(step + 1);
  }

  function selectSingle(q: Question, value: string) {
    const updated = { ...draft, [q.key]: value };
    setDraft(updated);
    if (!isLast) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => setStep((s) => s + 1), AUTO_ADVANCE_MS);
    }
  }

  function toggleMulti(q: Question, value: string) {
    const current = (draft[q.key] as string[] | undefined) ?? [];
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setDraft({ ...draft, [q.key]: updated });
  }

  if (step === INTRO) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-subtle">
          <MountainIcon size={26} />
        </div>
        <h1 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em]">
          {returning ? "Ready for another Arc?" : "You haven’t started yet."}
        </h1>
        <p className="mt-3 text-sm text-muted">Your next 90 days are waiting.</p>
        <p className="mt-8 max-w-xs text-sm leading-relaxed text-muted">
          Answer {QUESTIONS.length} short questions honestly. ARC builds a few daily rules around you.
        </p>
        <button type="button" onClick={() => goTo(0)} className={buttonClass("primary", "mt-10 min-w-48")}>
          Build my Arc
        </button>
      </div>
    );
  }

  if (step === PREVIEW && arc) {
    return <ArcPreview arc={arc} answers={draft} onBack={() => goTo(QUESTIONS.length - 1)} />;
  }

  if (!question) return null;
  const answered = isAnswered(question, draft);
  const showContinue = question.type !== "single" || isLast;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 pb-6 pt-5 sm:px-8 sm:pt-10">
      <div className="flex items-center gap-4">
        <div
          className="h-0.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label="Assessment progress"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={QUESTIONS.length}
        >
          <div
            className="h-full bg-fg transition-[width] duration-300"
            style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span className="tabular">
          {step + 1} / {QUESTIONS.length}
        </span>
        {!isLast ? (
          <button
            type="button"
            onClick={() => next()}
            disabled={!answered}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 hover:text-fg disabled:opacity-40"
          >
            Next <ArrowRightIcon size={13} />
          </button>
        ) : null}
      </div>

      <div key={question.key} className="flex flex-1 animate-fade flex-col">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-10 max-w-md text-2xl font-medium leading-snug tracking-tight outline-none sm:mt-16 sm:text-[1.7rem]"
        >
          {question.title}
        </h1>
        {question.hint ? <p className="mt-2 text-sm text-muted">{question.hint}</p> : null}

        <div className="mt-8 sm:mt-10">
          {question.type === "text" ? (
            <div>
              <label htmlFor="futureSelf" className="sr-only">
                {question.title}
              </label>
              <textarea
                id="futureSelf"
                rows={4}
                maxLength={question.maxLength}
                placeholder={question.placeholder}
                value={(draft.futureSelf as string | undefined) ?? ""}
                onChange={(e) => setDraft({ ...draft, futureSelf: e.target.value })}
                className="w-full resize-none rounded-xl border border-line bg-surface p-4 text-base leading-relaxed placeholder:text-muted focus:border-fg focus:outline-none"
              />
              <p className="mt-2 text-xs text-muted">This becomes your statement. You can leave it blank.</p>
            </div>
          ) : (
            <div
              role="group"
              aria-label={question.title}
              className={cn(
                "grid gap-2.5 sm:gap-3",
                question.type === "single" && question.icons ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              {question.options.map((option) => {
                const value = draft[question.key];
                const selected = Array.isArray(value) ? (value as string[]).includes(option.value) : value === option.value;
                const Icon = question.type === "single" && question.icons ? GoalIcons[option.value] : null;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      question.type === "multi" ? toggleMulti(question, option.value) : selectSingle(question, option.value)
                    }
                    className={cn(
                      "relative flex items-center rounded-xl border px-4 transition-colors",
                      Icon
                        ? "min-h-28 flex-col justify-center gap-3 text-center text-sm sm:min-h-32"
                        : "min-h-14 text-left text-[0.9375rem]",
                      selected
                        ? "border-fg bg-surface"
                        : "border-line bg-surface/60 hover:border-muted hover:bg-surface",
                    )}
                  >
                    {Icon ? <Icon size={20} /> : null}
                    <span className={cn(!Icon && "pr-8")}>{option.label}</span>
                    {selected ? (
                      <span
                        className={cn(
                          "absolute flex h-5 w-5 animate-pop items-center justify-center rounded-full bg-fg text-bg",
                          Icon ? "right-2.5 top-2.5" : "right-4 top-1/2 -mt-2.5",
                        )}
                      >
                        <CheckIcon size={12} strokeWidth={2.5} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-10">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm text-muted hover:text-fg"
          >
            <ArrowLeftIcon size={14} /> Back
          </button>
          {showContinue ? (
            <button
              type="button"
              onClick={() => next()}
              disabled={!answered}
              className={buttonClass("primary", "min-w-40")}
            >
              {isLast ? "Build my Arc" : "Continue"} <ArrowRightIcon size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
