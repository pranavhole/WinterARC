import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold tracking-[0.3em]">ARC</p>
      <h1 className="mt-10 text-xl font-medium">This page doesn&apos;t exist.</h1>
      <p className="mt-2 text-sm text-muted">Let&apos;s get you back on track.</p>
      <Link href="/" className={buttonClass("secondary", "mt-8")}>
        Go home
      </Link>
    </main>
  );
}
