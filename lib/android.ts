/** Where the ARC Android app (the Health Connect bridge) is downloaded from. */
export const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL || "https://github.com/pranavhole/WinterARC/releases/latest/download/arc-bridge.apk";

/** One-tap setup link the Android app handles: fills in the server and device token. */
export function androidSetupLink(server: string, token: string): string {
  const params = new URLSearchParams({ server, token });
  return `arcbridge://setup?${params}`;
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}
