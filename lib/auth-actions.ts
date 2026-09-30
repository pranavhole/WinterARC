"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, signIn, signOut } from "@/lib/auth";
import { homePath } from "@/lib/home";

export async function signInWithGoogle() {
  const user = await getCurrentUser();
  if (user) redirect(await homePath(user.id));
  // After Google, the browser does a full-page GET to /start, which redirects correctly.
  await signIn("google", { redirectTo: "/start" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
