import Link from "next/link";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24">
      <Link href="/" className="text-sm font-semibold tracking-[0.3em]">
        ARC
      </Link>
      <h1 className="mt-12 text-2xl font-medium tracking-tight">{title}</h1>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted [&_strong]:font-medium [&_strong]:text-fg">
        {children}
      </div>
    </main>
  );
}
