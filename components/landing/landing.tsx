import Link from "next/link";
import { GoogleButton } from "@/components/landing/google-button";
import { MountainArt } from "@/components/landing/mountain-art";
import { buttonClass } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

const STEPS = [
  { title: "Answer honestly", body: "A short assessment shapes an Arc around your goals, your habits and your days." },
  { title: "Show up daily", body: "Habits, discipline rules and tasks in one quiet list. A day at 80% keeps the streak." },
  { title: "Track the proof", body: "Streaks, progress, levels and badges, earned only by showing up." },
];

const EXAMPLES = ["Day 30", "7 Day Discipline", "90 Day Finisher"];

export function Landing() {
  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-8">
        <header className="flex h-16 items-center justify-between sm:h-20">
          <Wordmark />
          <GoogleButton variant="secondary" size="sm" className="hidden sm:block" />
        </header>

        <section className="grid min-h-[calc(100svh-4rem)] items-center gap-10 pb-16 pt-6 sm:min-h-[calc(100svh-5rem)] md:grid-cols-[1.1fr_1fr] md:gap-16 md:pt-0">
          <div className="animate-fade">
            <h1 className="text-[2.5rem] font-medium leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Build your Arc.</h1>
            <p className="mt-6 max-w-xs text-base leading-relaxed text-muted sm:text-lg">
              90 days.
              <br />
              Your rules.
              <br />
              Your progress.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <GoogleButton label="Start your Arc" />
              <a href="#how" className={buttonClass("ghost")}>
                See how it works
              </a>
            </div>
            <p className="mt-10 text-sm leading-relaxed text-muted">
              Build consistency.
              <br />
              Track the work.
              <br />
              Share the journey.
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm md:max-w-md">
            <div className="overflow-hidden rounded-2xl border border-line">
              <MountainArt className="block h-auto w-full" />
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-8 border-t border-line py-24 sm:py-32">
          <p className="text-center text-2xl font-medium tracking-tight sm:text-3xl">This isn&apos;t a challenge.</p>
          <p className="mt-3 text-center text-lg text-muted sm:text-xl">It&apos;s a commitment to yourself.</p>
          <ol className="mx-auto mt-16 grid max-w-4xl gap-10 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <p className="tabular text-xs text-muted">0{i + 1}</p>
                <p className="mt-2 text-base font-medium">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col items-center border-t border-line py-24 text-center sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted">Do it together</p>
          <p className="mt-8 text-base leading-loose">
            Build your Arc.
            <br />
            Find your people.
            <br />
            Stay accountable.
          </p>
          <ul className="mt-12 flex flex-wrap justify-center gap-2" aria-label="Examples of shared milestones">
            {EXAMPLES.map((e) => (
              <li key={e} className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium uppercase tracking-[0.14em]">
                {e}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-sm text-xs leading-relaxed text-muted">
            Share milestones with friends, or keep your Arc private. Your health data is never shared.
          </p>
        </section>

        <section className="flex flex-col items-center border-t border-line py-28 text-center sm:py-36">
          <p className="text-base leading-loose">
            90 days.
            <br />
            A few rules.
            <br />
            One day at a time.
          </p>
          <GoogleButton label="Start your Arc" className="mt-12" />
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-14 text-center sm:px-8">
          <p className="text-2xl font-semibold tracking-[0.3em]">ARC</p>
          <p className="text-sm text-muted">Build your Arc. Keep your promises. Track the proof.</p>
          <nav aria-label="Legal" className="mt-8 flex gap-6 text-xs text-muted">
            <Link href="/privacy" className="hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fg">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
