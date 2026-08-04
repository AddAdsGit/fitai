# Decision log

Append-only. Format: date — decision — why — consequences. Record decisions *when made*, including ones that later turn out wrong (add a follow-up entry instead of editing).

---

## Reconstructed from history (pre-2026-07-16, inferred from commits/code — verify with owner)

- **~2026-07-09 — Project bootstrapped from Google AI Studio export** (stock README, `metadata.json`). Consequence: no test/CI scaffolding, single-file App.tsx grew unchecked.
- **~2026-07-10 — Meals are logged primarily through a ChatGPT Custom GPT** hitting `gpt-action`; the web app is the dashboard. Consequence: two write paths (GPT API + direct supabase-js) that must stay in sync.
- **~2026-07-11 — Per-user permanent `api_key` in `profiles` as GPT bearer token**, bridged via a custom OAuth-code flow. Consequence: key = full account access; rotation only via /logout.
- **~2026-07-13 — Secrets deliberately committed** ("track .env in private repo for easy multi-machine dev setup", later moved to `env.md`). Consequence: repo must be treated as compromised; rotation pending (known-issues #1).
- **~2026-07-14 — Tags system**: user-defined `tracking_tags` on profile, `tags text[]` on meals, GPT applies them. Applied to live DB via the `/run-migration` HTTP endpoint rather than CLI. Consequence: live-DB/migration drift began here.
- **~2026-07-15 — "Dynamic nutrients" direction**: replace fixed carbs/fats/fiber columns with `meals.nutrients jsonb` + `profiles.tracked_nutrients jsonb` (protein and calories stay first-class). Work-in-progress; conflicts with `.agents/AGENTS.md` "Fiber Rule". Consequence: half-migrated code, destructive untracked migration (known-issues #6).

## 2026-07-16 (later) — Repair pass (owner-approved plan)

- **Decision (owner): finish dynamic nutrients forward** — live DB already migrated, historical macro data already gone; every remaining write/read path converted to `meals.nutrients` + `profiles.tracked_nutrients` (protein/calories stay first-class). gpt-action still accepts flat `carbs/fats/fiber` fields as legacy aliases so older GPT configs keep working. `.agents/AGENTS.md` Fiber Rule restated for the dynamic model (fiber = default-enabled tracked nutrient).
- **Decision (owner): repair scope = P0 + P1 + hygiene**; App.tsx monolith split deferred.
- **Decision (owner): keep the custom OAuth bridge, hardened** (explicit approve + redirect_uri allowlist + token-exchange validation) instead of switching ChatGPT to plain bearer auth.
- **Decision:** `gpt/openapi.yaml` is the single canonical GPT Action spec; the copy under `supabase/functions/gpt-action/` is deleted.
- **Decision:** conflict resolution kept the "Updated upstream" sides (newer tags/fiber/timezone work); the "Stashed changes" sides were stale/dead. The two git stashes were intentionally left in place as history.
- **Decision:** client-side Gemini calls: text goes only through the `gemini` edge function; the bundled `VITE_GEMINI_API_KEY` and localStorage key copies are gone. User-supplied keys (preferences) still power multimodal features from the browser — follow-up as known-issues #31.
- **Note:** key rotation + coordinated deploy is the remaining P0 — runbook in known-issues.md #1. Nothing was pushed/deployed during the repair session.

## 2026-07-16 — Full audit + context framework (this folder)

- **Decision:** durable project knowledge lives in `docs/context/` (one file per concern), entry point `CLAUDE.md`. Older root notes (`goal.md`, `phases_summary.md`, `gpt_max_potential_strategy.md`) are historical.
- **Decision:** no code repairs performed during the audit — problems identified and prioritized first (owner's explicit instruction). Fix order proposed in known-issues.md.
- **Open decision (owner call needed):** finish dynamic-nutrients migration vs. roll it back to fixed macro columns. Live probe confirmed the migration IS applied and production writes are failing (database.md) — finishing forward is now the cheaper path, but check Supabase backups first for the dropped macro data.
- **Open decision:** keep the custom OAuth bridge or switch ChatGPT auth to plain API-key auth (ChatGPT Actions support bearer auth directly, which would delete the riskiest code path).
