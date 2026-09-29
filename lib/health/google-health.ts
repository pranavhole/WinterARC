import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { dayRangeUtc } from "@/lib/tz";
import { addDays, type DayKey } from "@/lib/utils";
import { grantedTypes, scopesFor } from "@/lib/health/permissions";
import type { HealthProvider } from "@/lib/health/provider";
import {
  HealthAuthError,
  type DayRecords,
  type ExerciseData,
  type HealthDataType,
  type SleepData,
  type StepRecord,
  type WeightRecord,
} from "@/lib/health/types";

/**
 * Google Health API v4 (the successor to the Fitbit Web API and Google Fit).
 * A separate, explicit OAuth consent from Google sign-in: signing in never
 * grants health access. Read-only scopes, only for the types the user chose.
 * https://developers.google.com/health
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://health.googleapis.com/v4/users/me/dataTypes";
const MAX_PAGES = 20;

const clientId = () => process.env.GOOGLE_HEALTH_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "";
const clientSecret = () => process.env.GOOGLE_HEALTH_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "";

export function googleHealthConfigured(): boolean {
  return !!clientId() && !!clientSecret() && process.env.GOOGLE_HEALTH_ENABLED !== "false";
}

export const healthRedirectUri = (base: string) => `${base}/api/health/callback`;

export function googleHealthAuthorizeUrl(base: string, state: string, types: HealthDataType[]): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: healthRedirectUri(base),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    scope: scopesFor(types).join(" "),
    state,
  });
  return `${AUTH_URL}?${params}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string; error?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (res.status === 400 || res.status === 401) throw new HealthAuthError(json.error ?? "Token request rejected");
  if (!res.ok || !json.access_token) throw new Error(`Google token request failed (${res.status})`);
  return json;
}

/** Exchange the authorization code and store the encrypted tokens. Returns the data types granted. */
export async function completeGoogleHealthConnection(userId: string, base: string, code: string, types: HealthDataType[]) {
  const token = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: healthRedirectUri(base) });
  const granted = (token.scope ?? "").split(" ").filter(Boolean);
  // Users can untick scopes on Google's consent screen: keep only the types actually granted.
  const kept = granted.length ? grantedTypes(types, granted) : types;
  const data = {
    accessTokenEncrypted: encryptSecret(token.access_token),
    refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
    expiresAt: new Date(Date.now() + token.expires_in * 1000),
    scopes: granted.join(" "),
    dataTypes: kept.join(" "),
    status: "ACTIVE" as const,
  };
  await prisma.healthConnection.upsert({
    where: { userId_provider: { userId, provider: "GOOGLE_HEALTH" } },
    create: { userId, provider: "GOOGLE_HEALTH", ...data },
    update: data,
  });
  return kept;
}

type Connection = {
  id: string;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
  expiresAt: Date | null;
};

type DataPoint = Record<string, unknown> & { name?: string };

const num = (v: unknown) => (typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN);
const date = (v: unknown) => (typeof v === "string" ? new Date(v) : null);
/** "3600s" / "3600.5s" → minutes. */
const durationMinutes = (v: unknown) => (typeof v === "string" && v.endsWith("s") ? Math.round(Number(v.slice(0, -1)) / 60) : 0);

type Interval = { startTime?: string; endTime?: string };

export class GoogleHealthProvider implements HealthProvider {
  readonly kind = "GOOGLE_HEALTH" as const;

  constructor(
    private conn: Connection,
    private timeZone: string,
  ) {}

  private async accessToken(): Promise<string> {
    const fresh = this.conn.expiresAt && this.conn.expiresAt.getTime() > Date.now() + 60_000;
    if (fresh && this.conn.accessTokenEncrypted) return decryptSecret(this.conn.accessTokenEncrypted);
    if (!this.conn.refreshTokenEncrypted) throw new HealthAuthError("No refresh token");

    const token = await tokenRequest({ grant_type: "refresh_token", refresh_token: decryptSecret(this.conn.refreshTokenEncrypted) });
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);
    const accessTokenEncrypted = encryptSecret(token.access_token);
    await prisma.healthConnection.update({ where: { id: this.conn.id }, data: { accessTokenEncrypted, expiresAt } });
    this.conn = { ...this.conn, accessTokenEncrypted, expiresAt };
    return token.access_token;
  }

  private async list(dataType: string, filter: string, pageSize?: number): Promise<DataPoint[]> {
    const token = await this.accessToken();
    const out: DataPoint[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ filter });
      if (pageSize) params.set("pageSize", String(pageSize));
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`${API}/${dataType}/dataPoints?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) throw new HealthAuthError(`Google Health ${res.status}`);
      if (!res.ok) throw new Error(`Google Health ${dataType} list failed (${res.status})`);
      const json = (await res.json()) as { dataPoints?: DataPoint[]; nextPageToken?: string };
      out.push(...(json.dataPoints ?? []));
      pageToken = json.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  }

  private range(day: DayKey) {
    const { start, end } = dayRangeUtc(day, this.timeZone);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  async stepRecords(day: DayKey): Promise<StepRecord[]> {
    const { start, end } = this.range(day);
    const points = await this.list("steps", `steps.interval.start_time >= "${start}" AND steps.interval.start_time < "${end}"`);
    return points.flatMap((p, i) => {
      const d = p.steps as { interval?: Interval; count?: unknown } | undefined;
      const count = num(d?.count);
      const s = date(d?.interval?.startTime);
      const e = date(d?.interval?.endTime);
      return d && Number.isFinite(count) && s && e ? [{ id: p.name ?? `steps-${s.toISOString()}-${i}`, start: s, end: e, count }] : [];
    });
  }

  async sleepRecords(day: DayKey): Promise<SleepData[]> {
    // A night belongs to the day you wake up, like bedtime / wake time on the day record.
    const { start, end } = this.range(day);
    const points = await this.list("sleep", `sleep.interval.end_time >= "${start}" AND sleep.interval.end_time < "${end}"`, 25);
    return points.flatMap((p, i) => {
      const d = p.sleep as { interval?: Interval; summary?: { minutesAsleep?: unknown } } | undefined;
      const s = date(d?.interval?.startTime);
      const e = date(d?.interval?.endTime);
      if (!d || !s || !e) return [];
      const asleep = num(d.summary?.minutesAsleep);
      const minutesAsleep = Number.isFinite(asleep) ? asleep : Math.round((e.getTime() - s.getTime()) / 60000);
      return [{ id: p.name ?? `sleep-${s.toISOString()}-${i}`, start: s, end: e, minutesAsleep }];
    });
  }

  async exerciseRecords(day: DayKey): Promise<ExerciseData[]> {
    const points = await this.list(
      "exercise",
      `exercise.interval.civil_start_time >= "${day}" AND exercise.interval.civil_start_time < "${addDays(day, 1)}"`,
      25,
    );
    return points.flatMap((p, i) => {
      const d = p.exercise as { interval?: Interval; activeDuration?: unknown; exerciseType?: unknown } | undefined;
      const s = date(d?.interval?.startTime);
      const e = date(d?.interval?.endTime);
      if (!d || !s || !e) return [];
      const minutes = durationMinutes(d.activeDuration) || Math.round((e.getTime() - s.getTime()) / 60000);
      return [{ id: p.name ?? `exercise-${s.toISOString()}-${i}`, start: s, end: e, minutes, type: String(d.exerciseType ?? "OTHER") }];
    });
  }

  async weightRecords(day: DayKey): Promise<WeightRecord[]> {
    const { start, end } = this.range(day);
    const points = await this.list("weight", `weight.sample_time.physical_time >= "${start}" AND weight.sample_time.physical_time < "${end}"`);
    return points.flatMap((p, i) => {
      const d = p.weight as { sampleTime?: { physicalTime?: string }; weightGrams?: unknown } | undefined;
      const t = date(d?.sampleTime?.physicalTime);
      const grams = num(d?.weightGrams);
      return d && t && Number.isFinite(grams) && grams > 0 ? [{ id: p.name ?? `weight-${t.toISOString()}-${i}`, time: t, kg: grams / 1000 }] : [];
    });
  }

  async getSteps(day: DayKey) {
    return (await this.stepRecords(day)).reduce((sum, r) => sum + r.count, 0);
  }

  async getSleep(day: DayKey) {
    const nights = await this.sleepRecords(day);
    return nights.reduce<SleepData | null>((best, s) => (!best || s.minutesAsleep > best.minutesAsleep ? s : best), null);
  }

  getExercise(day: DayKey) {
    return this.exerciseRecords(day);
  }

  async getWeight(day: DayKey) {
    const latest = (await this.weightRecords(day)).sort((a, b) => b.time.getTime() - a.time.getTime())[0];
    return latest ? latest.kg : null;
  }

  async getDayRecords(day: DayKey, types: HealthDataType[]): Promise<DayRecords> {
    const want = new Set(types);
    const [steps, sleep, exercise, weight] = await Promise.all([
      want.has("steps") ? this.stepRecords(day) : [],
      want.has("sleep") ? this.sleepRecords(day) : [],
      want.has("exercise") ? this.exerciseRecords(day) : [],
      want.has("weight") ? this.weightRecords(day) : [],
    ]);
    return { steps, sleep, exercise, weight };
  }

  async disconnect() {
    const stored = this.conn.refreshTokenEncrypted ?? this.conn.accessTokenEncrypted;
    if (stored) {
      await fetch(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: decryptSecret(stored) }),
        cache: "no-store",
      }).catch(() => undefined);
    }
    await prisma.healthConnection.deleteMany({ where: { id: this.conn.id } });
  }
}
