import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/** The signed-in user, resolved once per request. Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const sessionUser = (await auth())?.user;
  if (!sessionUser?.id) return null;
  return {
    id: sessionUser.id,
    name: sessionUser.name ?? null,
    email: sessionUser.email ?? null,
    image: sessionUser.image ?? null,
  };
});

/** Use in pages and server actions. The user id always comes from the session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
