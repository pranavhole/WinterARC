import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/home";
import { GoogleButton } from "@/components/landing/google-button";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(await homePath(user.id));
  const { error } = await searchParams;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="text-3xl font-semibold tracking-[0.35em]">
        ARC
      </Link>
      <p className="mt-4 text-sm text-muted">Sign in to continue</p>
      <GoogleButton variant="secondary" className="mt-10 w-full max-w-xs [&_button]:w-full" />
      {error ? (
        <p role="alert" className="mt-6 max-w-xs text-sm text-fg">
          Sign in didn&apos;t complete. Please try again.
        </p>
      ) : null}
      <p className="mt-10 text-xs text-muted">Secure · Private · Personal</p>
    </main>
  );
}
