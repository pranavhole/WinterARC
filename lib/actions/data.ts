"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseBackup, restoreBackup, restoresAsActive } from "@/lib/backup";
import { getActiveArc } from "@/lib/arc";
import { logError, revalidateArc } from "@/lib/actions/context";

export type ImportPreview =
  | {
      ok: true;
      startDate: string;
      endDate: string;
      habits: number;
      days: number;
      tasks: number;
      restoresAsActive: boolean;
      archivesCurrent: boolean;
    }
  | { ok: false; error: string };

/** Validate a backup and describe what importing it would do. Writes nothing. */
export async function previewImport(text: string): Promise<ImportPreview> {
  const user = await requireUser();
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  const b = parsed.backup;
  const active = restoresAsActive(b);
  const current = await getActiveArc(user.id);
  const days = new Set([...b.dailyRecords.map((r) => r.date), ...b.habitLogs.map((l) => l.date)]).size;
  return {
    ok: true,
    startDate: b.arc.startDate,
    endDate: b.arc.endDate,
    habits: b.habits.length,
    days,
    tasks: b.tasks.length,
    restoresAsActive: active,
    archivesCurrent: active && current !== null,
  };
}

export async function importBackup(text: string): Promise<{ ok: false; error: string } | undefined> {
  const user = await requireUser();
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  try {
    await restoreBackup(user.id, parsed.backup);
  } catch (error) {
    logError("importBackup", error);
    return { ok: false, error: "Something went wrong. Nothing was imported. Try again." };
  }
  revalidateArc();
  redirect("/arc");
}
