/**
 * Granular Google Health permissions. ARC asks only for the scopes behind the
 * data types the user switched on, read-only.
 */

import { HEALTH_DATA_TYPES, type HealthDataType } from "@/lib/health/types";

const SCOPE_BASE = "https://www.googleapis.com/auth/googlehealth.";

export const GOOGLE_HEALTH_SCOPES: Record<HealthDataType, string> = {
  steps: `${SCOPE_BASE}activity_and_fitness.readonly`,
  exercise: `${SCOPE_BASE}activity_and_fitness.readonly`,
  sleep: `${SCOPE_BASE}sleep.readonly`,
  weight: `${SCOPE_BASE}health_metrics_and_measurements.readonly`,
};

export function parseDataTypes(value: unknown): HealthDataType[] {
  const list = typeof value === "string" ? value.split(/[\s,]+/) : Array.isArray(value) ? value : [];
  return HEALTH_DATA_TYPES.filter((t) => list.includes(t));
}

/** De-duplicated scopes for the chosen data types. */
export function scopesFor(types: HealthDataType[]): string[] {
  return [...new Set(types.map((t) => GOOGLE_HEALTH_SCOPES[t]))];
}

/** The chosen types that the granted scopes actually cover (users may untick scopes on the consent screen). */
export function grantedTypes(chosen: HealthDataType[], grantedScopes: string[]): HealthDataType[] {
  const granted = new Set(grantedScopes);
  return chosen.filter((t) => granted.has(GOOGLE_HEALTH_SCOPES[t]));
}
