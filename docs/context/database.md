# Database

_Last verified: 2026-07-16 (post-repair). Live DB probed same day; treat live as canonical until the migration chain is reconciled (known-issues #11)._

## Tables (live state)

| Table | Purpose | RLS | Notes |
|---|---|---|---|
| `profiles` | user profile, goals, agent config, integration creds, `api_key` | own-row (`auth.uid() = id`) | `tracked_nutrients jsonb` holds carb/fat/fiber/custom targets; `protein_goal` + `daily_calories_goal` stay first-class columns |
| `meals` | logged meals per day | own-rows | `nutrients jsonb` map (carbs/fats/fiber/custom); `protein`/`calories` columns; `tags text[]`; `time` still text |
| `recipes` | saved recipes | own-rows | keeps fixed `carbs/fats/fiber` columns + `description`; **no `micros` column live** |
| `daily_wellness` | notes + water + stool per day | own-rows | `unique(profile_id, date)`; `notes` NOT NULL; `water_intake`, `stool_type`, `stool_size`, `*_log_time` |
| `weight_logs` | one weight per day | own-rows | `unique(profile_id, date)`, `log_time text` |
| `shares` | public share payload snapshots | select: anyone; insert: authenticated | no delete policy, rows immortal; `data jsonb` may contain personal info |
| `oauth_codes` | ChatGPT OAuth codes (5-min TTL) | service_role only | now present in schema.sql; still no timestamped migration creates it |

## Dynamic nutrients (finished forward 2026-07-16)

`20260715000000_dynamic_nutrients.sql` (applied live) dropped `meals.carbs/fats/fiber` and `profiles.carbs_goal/fats_goal/fiber_goal` in favor of `meals.nutrients` / `profiles.tracked_nutrients`. Historical macro values were **not** copied (data lost unless restored from backups/PITR — still worth checking).

All code paths now use the new model: frontend signup/onboarding/realtime/save, gpt-action meals POST/PATCH (accepts a `nutrients` map; flat `carbs/fats/fiber` accepted as legacy aliases), `getDailyRemaining`, telegram reports, Notion sync. The canonical default nutrient list lives in `src/constants/nutrition.ts` and must match the DB default in the migration.

## Sources of truth

1. **Live DB** — canonical.
2. **`schema.sql`** — hand-maintained snapshot; updated 2026-07-16 to match live (dynamic nutrients, `oauth_codes`, `recipes.description`, no `recipes.micros`). Goal: replace with `supabase db dump` output (known-issues #11).
3. **Timestamped migrations** — still incomplete for a from-scratch rebuild: nothing creates `oauth_codes` or the `profiles.id → auth.users` FK. Never DDL over HTTP (the `/run-migration` endpoint is deleted).

## Remaining smells

- Times stored as free text (`meals.time` "8:30 AM", `weight_logs.log_time`) — unsortable, unvalidated (known-issues #17).
- `profiles.preferences text[]` doubles as a config store (`"onboarded"`, `"gemini_api_key:…"`, `"plus_button_action:…"`). The gpt-action `/profile` projection now strips key-bearing entries, but the pattern remains (known-issues #31).
