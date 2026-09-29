# ARC Bridge (Android · Health Connect)

Health Connect is an on-device store: a web page can't read it. This tiny app reads it with the
user's permission and pushes daily records to ARC. It is deliberately not a second ARC app.

```
Health Connect ──► ARC Bridge ──► POST /api/health/ingest ──► PostgreSQL ──► ARC dashboard
```

## Setup

1. In ARC: **Settings → Health → Set up Android bridge**. Copy the `arc_hc_…` token (shown once).
2. Build and install: open `android-bridge/` in Android Studio (or `gradle :app:installDebug`).
3. In the app: enter your ARC address (https) and the token, pick what ARC may read, grant access in Health Connect.
4. **Sync now** once. After that WorkManager syncs every 24 hours on a network connection.

Permissions (read-only, each granted separately): `READ_STEPS`, `READ_SLEEP`, `READ_EXERCISE`, `READ_WEIGHT`.
The server URL and token are stored in `EncryptedSharedPreferences`.

## API contract

`POST /api/health/ingest` · `Authorization: Bearer arc_hc_…` · JSON, max 512 KB, 60 requests/hour.

```json
{
  "timeZone": "Asia/Kolkata",
  "permissions": ["steps", "sleep", "exercise"],
  "days": [
    {
      "date": "2026-09-29",
      "steps":    [{ "id": "hc-record-id", "start": "…Z", "end": "…Z", "count": 3000 }],
      "sleep":    [{ "id": "…", "start": "…Z", "end": "…Z", "minutesAsleep": 442 }],
      "exercise": [{ "id": "…", "start": "…Z", "end": "…Z", "minutes": 46, "type": "56" }],
      "weight":   [{ "id": "…", "time": "…Z", "kg": 72.4 }]
    }
  ]
}
```

Up to 14 days per request. Records are de-duplicated by Health Connect id and each day is hashed, so
re-sending the same days is a no-op. Responses: `200 {ok, days, changedDays}`, `400 invalid_payload`,
`401 unauthorized` (token revoked: create a new one), `413`, `429`.
