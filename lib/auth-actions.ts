"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle() {
  if (await getCurrentUser()) redirect("/start");
  await signIn("google", { redirectTo: "/start" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
