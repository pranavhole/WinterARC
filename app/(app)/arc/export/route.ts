import { getCurrentUser } from "@/lib/auth";
import { buildBackup } from "@/lib/backup";
import { todayKey } from "@/lib/utils";

/** Download the signed-in user's Arc as a JSON backup. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const backup = await buildBackup(user.id);
  if (!backup) return new Response("No Arc to export yet.", { status: 404 });

  const filename = `arc-backup-${todayKey(backup.arc.timezone)}.json`;
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
