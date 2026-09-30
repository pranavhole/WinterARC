import "server-only";
import { getActiveArc } from "@/lib/arc";

/**
 * Where a signed-in user belongs. Pages and server actions redirect here
 * directly, never via /start: a server-action redirect to a route handler
 * renders the target under the /start URL, and the next server action then
 * POSTs to /start (405).
 */
export async function homePath(userId: string): Promise<"/arc" | "/onboarding"> {
  return (await getActiveArc(userId)) ? "/arc" : "/onboarding";
}
