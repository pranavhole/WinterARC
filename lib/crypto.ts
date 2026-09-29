import "server-only";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * AES-256-GCM for OAuth tokens at rest. The key is TOKEN_ENCRYPTION_KEY
 * (32 bytes, base64) or, when unset, derived from AUTH_SECRET with HKDF.
 * Stored format: v1.<iv>.<tag>.<ciphertext>, each part base64url.
 */

const VERSION = "v1";

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const explicit = process.env.TOKEN_ENCRYPTION_KEY;
  if (explicit) {
    const raw = Buffer.from(explicit, "base64");
    if (raw.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
    cachedKey = raw;
  } else {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Set TOKEN_ENCRYPTION_KEY or AUTH_SECRET to store integration tokens");
    cachedKey = Buffer.from(hkdfSync("sha256", secret, "arc-token-encryption", "arc/v1", 32));
  }
  return cachedKey;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Unrecognized secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
