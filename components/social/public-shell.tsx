import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";

/** Frame for public pages (profiles, milestone cards) seen by people who may not be signed in. */
export function PublicShell({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between sm:h-20">
        <Link href={signedIn ? "/arc" : "/"}>
          <Wordmark />
        </Link>
        <Link href={signedIn ? "/arc" : "/login"} className={buttonClass("secondary", "min-h-9 px-4 text-xs")}>
          {signedIn ? "Your Arc" : "Start your Arc"}
        </Link>
      </header>
      <main className="flex-1 pb-20 pt-4">{children}</main>
      <footer className="border-t border-line py-10 text-center text-xs text-muted">Build your Arc. Keep your promises. Track the proof.</footer>
    </div>
  );
}
