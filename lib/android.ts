/** Where the ARC Android app (the Health Connect bridge) is downloaded from. */
export const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL || "https://github.com/pranavhole/WinterARC/releases/latest/download/arc-bridge.apk";

const ANDROID_PACKAGE = "app.arc.bridge";

/**
 * One-tap setup link that fills in the server and device token in the app.
 * Uses Chrome's intent:// form, which opens this exact app (arcbridge://setup
 * inside) and falls back to the APK download when the app isn't installed.
 */
export function androidSetupLink(server: string, token: string): string {
  const params = new URLSearchParams({ server, token });
  return `intent://setup?${params}#Intent;scheme=arcbridge;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(ANDROID_APP_URL)};end`;
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}
