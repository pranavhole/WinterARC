"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidateArc } from "@/lib/actions/context";

/** Stop the current Arc early. History is kept; the user can build a new one. */
export async function endArc() {
  const user = await requireUser();
  await prisma.arc.updateMany({ where: { userId: user.id, status: "ACTIVE" }, data: { status: "ARCHIVED" } });
  revalidateArc();
  redirect("/onboarding");
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim().toLowerCase() !== "delete") return;

  // Cascades to accounts, sessions, arcs, answers, habits, logs, records and tasks.
  await prisma.user.delete({ where: { id: user.id } });

  const jar = await cookies();
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) jar.delete(name);
  redirect("/");
}
