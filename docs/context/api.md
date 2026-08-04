# API (gpt-action edge function)

_Last verified: 2026-07-16 (post-repair). Source: `supabase/functions/gpt-action/index.ts`. Conflicts resolved; deploy pending (coordinate with key rotation — known-issues #1)._

Base URL: `https://fitpush.vercel.app/api/*` → Vercel rewrite → `…supabase.co/functions/v1/gpt-action/*`.

## Auth model

- **Main API**: `Authorization: Bearer <profiles.api_key>` — permanent per-user key, generated with `crypto.randomUUID()`, rotated by `POST /logout`.
- **OAuth endpoints** (`/oauth/authorize|approve|token`) bridge ChatGPT to the api_key. Hardened 2026-07-16: `redirect_uri` must match the ChatGPT callback allowlist (`https://chat.openai.com|chatgpt.com/aip/*/oauth/callback`) at authorize + approve; consent requires an explicit Approve click (no auto-approval); `/oauth/token` verifies `client_id` + `redirect_uri` against the stored code (RFC 6749 §4.1.3).
- **`/telegram/cron`**: `?secret=` query param; `CRON_SECRET` env is **required** (fails closed 503 if unset — set it via `supabase secrets set`).
- Function runs with the service-role key; every endpoint scopes by the profile resolved from the bearer key.
- `/run-migration` **no longer exists**.

## Endpoints

| Path | Methods | Notes |
|---|---|---|
| `/profile` | GET, POST | GET returns a **projection** (goals, bio, tags, tracked_nutrients, agent_config, timezone) — never api_key/integration creds; key-bearing preference entries stripped. POST allowlists updatable fields |
| `/meals` | GET, POST, PATCH, DELETE | Nutrients as `nutrients` jsonb map; flat `carbs/fats/fiber` accepted as legacy aliases; `protein`/`calories` first-class. PATCH merges nutrient keys into the existing map. Fire-and-forget worker: image → storage (bucket must pre-exist), Notion (reads `nutrients`), Sheets |
| `/recipes` | GET, POST | POST persists `description` + `fiber`; no `micros` (column doesn't exist) |
| `/daily-wellness` | GET, POST/PATCH | Merge semantics — only provided fields change (notes no longer clobbered); exposes `water_intake`, `stool_type`, `stool_size` |
| `/weight` | GET, POST/PATCH | Upserts one log per date; accepts `log_time`; syncs `profiles.weight` if latest |
| `/logout` | POST | Rotates api_key (crypto.randomUUID) |
| `/telegram/test` | POST | Sends test message |
| `/telegram/cron` | secret-gated | Reminders + daily reports (reports compute from `tracked_nutrients`/`nutrients`) |

## OpenAPI spec

**`gpt/openapi.yaml` is the single canonical spec** (paste this into the ChatGPT GPT config). Updated 2026-07-16: `nutrients`/`tracked_nutrients` documented, `daily_remaining` is a dynamic map, `memories` removed, wellness water/stool + recipe `description`/`fiber` added. The old duplicate under `supabase/functions/gpt-action/` is deleted (if a copy lingers, remove it). After deploying the function, re-paste the spec into the GPT so the schema matches.

## gemini edge function

`supabase/functions/gemini/index.ts` — JWT-authenticated **text** proxy to Google Generative Language API using the `GEMINI_API_KEY` secret. As of 2026-07-16 it is the ONLY path for app text generation (client fallbacks removed). Model fallback list `["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]` — verify these IDs. Multimodal (photo analysis, image generation) still runs client-side on user-supplied keys — known-issues #31.
