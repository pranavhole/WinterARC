import "server-only";
import { headers } from "next/headers";

/** Public base URL for OAuth redirects and share links. AUTH_URL wins; otherwise the request host. */
export async function appUrl(): Promise<string> {
  const configured = process.env.AUTH_URL;
  if (configured) return configured.replace(/\/+$/, "").replace(/\/api\/auth$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
