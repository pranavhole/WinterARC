import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/ui/icons";

/** A dashboard panel: icon + title header, optional link or right-side content, body. */
export function DashCard({
  icon: Icon,
  title,
  href,
  aside,
  className,
  children,
}: {
  icon?: (p: { size?: number; className?: string }) => React.ReactElement;
  title: string;
  href?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface/55 p-5", className)} aria-label={title}>
      <header className="mb-4 flex items-center gap-2.5">
        {Icon ? <Icon size={17} className="shrink-0" /> : null}
        <h2 className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{title}</h2>
        {aside}
        {href ? (
          <Link href={href} prefetch={false} aria-label={`Open ${title}`} className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-fg">
            <ChevronRightIcon size={15} />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}
