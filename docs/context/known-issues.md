# Known issues — prioritized audit findings

_Audit date: 2026-07-16. Repair pass same day (see decisions.md): most P0/P1 items fixed in code; items needing owner action or deploys are marked. Update this file when an issue is fixed: move it to "Resolved" at the bottom with the date._

## P0 — Critical (still open)

1. **Service-role key shipped to every browser & committed to git — OWNER ACTION REQUIRED.** `.env` and `env.md` set `VITE_SUPABASE_ANON_KEY` to the **service_role** JWT; it is live on fitpush.vercel.app and in git history. The code is now anon-key-compatible; what remains is the rotation itself.
   **Rotation runbook (do in this order):**
   1. Supabase dashboard → Settings → API → **rotate the JWT secret** (invalidates both anon and service_role keys) — or at minimum regenerate the service key.
   2. Copy the NEW **anon** key into: Vercel project env (`VITE_SUPABASE_ANON_KEY`) and local `.env`. The service key goes NOWHERE client-side; edge functions read it from Supabase-provided env automatically.
   3. `supabase secrets set` for anything the functions need (`CRON_SECRET` is now required — the hardcoded fallback was removed; also `GEMINI_API_KEY`, `FRONTEND_URL`).
   4. Redeploy: push `main` (Vercel) + `supabase functions deploy gpt-action gemini`.
   5. Revoke the exposed Gemini API key in Google AI Studio and issue a fresh one (set only as a function secret).
   6. `env.md` is untracked/gitignored now, but git **history** still contains every old secret — rotation is the real mitigation; optionally purge history if the repo ever becomes public.
   ⚠️ Deploy the current code and the key rotation **together**: the old deployed bundle breaks the moment the old key is revoked.

## P1 — High (still open)

11. **Migration chain cannot rebuild the DB.** Partially improved 2026-07-16: `schema.sql` now includes `oauth_codes`, drops phantom `recipes.micros`, adds `recipes.description`, and reflects dynamic nutrients. Still missing: timestamped migrations for `oauth_codes` and the `profiles.id → auth.users` FK; `schema.sql` is still hand-maintained rather than `supabase db dump` output. Treat the live DB as canonical.

## P2 — Medium (still open)

16. **Wellness "notes" round-trip corruption risk**: `syncWellnessLogsToNotes` embeds structured logs as text into the same `notes` field the GPT writes freely.
17. **Time handling is stringly-typed everywhere** (`"8:30 AM"` text, ISO-string comparisons); `x-timezone-offset` header math is DST-fragile.
18. **`getLocalTimeAndDate` sign bug risk**: verify the frontend sends the negated `getTimezoneOffset()` value consistently.
19. **Hardcoded values (remainder)**: Unsplash fallback image, default goals still duplicated (DB defaults vs `INITIAL_PROFILE_STATE` vs edge-function fallbacks), telegram report window 21:00–22:00, reminder window 15 min, oauth code TTL 5 min. (GPT URL, water goal, bot handle centralized in `src/constants/app.ts` 2026-07-16.)

## P3 — Structure / hygiene (still open)

23. **App.tsx is a ~5,400-line monolith** — extract a data-access layer (`src/lib/api.ts`), auth flow, and per-view components. Deferred by owner decision 2026-07-16.
24. **Three competing profile shapes** (DB row / `Profile` type / `INITIAL_PROFILE_STATE`) with mapping duplicated across load/realtime/save. Partially converged via `src/constants/nutrition.ts` helpers.
26. **Root clutter (remainder)**: `goal.md`, `phases_summary.md`, `gpt_max_potential_strategy.md` await move to `docs/archive/`; `scripts/`, `.venv/`, `card_samples/` now gitignored but present locally; dead components `LandingPage.FC.tsx`, `MascotCoach.tsx`, empty `design.md`, stale `supabase/functions/gpt-action/openapi.yaml` await deletion (blocked by tooling during the 2026-07-16 session — delete on sight).
27. **Scattered localStorage usage** (8+ ad-hoc keys). Cross-account leak fixed (logout wipes `fitai_*`); consolidate keys into `LS_KEYS` (`src/constants/app.ts`) opportunistically.
28. **No tests, no CI, no error boundary; `npm run build` skips type-checking** — `npm run lint` is the only gate.
29. **No account-deletion path** for a consumer health-data app.
30. **Duplicate image-generation pipeline** (App.tsx `onAddMeal` vs gpt-action POST /meals) — consolidate server-side.
31. **User-supplied Gemini keys still stored in `profiles.preferences` and used from the browser** for multimodal calls (photo analysis, image generation) — the edge function only proxies text. Move to a server-side per-user secret + extend the `gemini` function for multimodal. (Bundled `VITE_GEMINI_API_KEY` and localStorage copies were removed 2026-07-16; the GPT no longer sees preference secrets.)

## Resolved

- **2026-07-16 #2 OAuth account takeover**: auto-approve removed (explicit Approve click required), `redirect_uri` allowlisted to ChatGPT callback URLs client- and server-side, `/oauth/token` now verifies `client_id`+`redirect_uri` against the stored code. _Deploy pending._
- **2026-07-16 #3 Unauthenticated `/run-migration` DDL endpoint**: deleted. _Deploy pending._
- **2026-07-16 #4 Merge conflicts + duplicate `resolvedTime`/`resolvedDate` in gpt-action**: resolved keeping the newer (tags/fiber/timezone-header) side; dead stashed DELETE/PATCH blocks removed. (The two git stashes were left untouched.)
- **2026-07-16 #5 Missing `Clock` import in App.tsx**: fixed; `npm run lint` passes.
- **2026-07-16 #6 Production writes to dropped columns**: dynamic nutrients finished forward everywhere — signup/bypass inserts, onboarding save (was also broken: wrote `carbs_goal` etc.), realtime handler, gpt-action meals POST/PATCH (`nutrients` jsonb + legacy flat-field compatibility), `getDailyRemaining`, telegram report, Notion sync, recipes POST, ProfileView recipe-from-meal (also wrote nonexistent `micros`). _Deploy pending._
- **2026-07-16 #7 `/profile` GET secret leak**: replaced full-row return with a projection; preference entries carrying keys are stripped.
- **2026-07-16 #8 Weak `api_key` generation**: all sites now `crypto.randomUUID()`-based (App signup, dev bypass, gpt-action /logout).
- **2026-07-16 #9 Gemini keys exposed client-side** (bundled/localStorage part): `VITE_GEMINI_API_KEY` usage and `fitai_gemini_api_key` localStorage removed; text generation goes through the `gemini` edge function only. Remainder tracked as #31.
- **2026-07-16 #10 daily-wellness clobber**: POST now merges only provided fields; water/stool exposed in API + spec.
- **2026-07-16 #12 CRON secret fallback**: removed; endpoint fails closed (503) without `CRON_SECRET`.
- **2026-07-16 #13 Fake "Start 7-Day Free Trial" button**: replaced with disabled "Coming soon".
- **2026-07-16 #14/#15 Realtime & telegram reads of dropped columns**: fixed (part of #6).
- **2026-07-16 #19 (partial)**: GPT URL, water goal, telegram bot handle centralized in `src/constants/app.ts`; default nutrient list centralized in `src/constants/nutrition.ts`.
- **2026-07-16 #20 Recipes POST dropping `description`/`fiber`**: both persisted now.
- **2026-07-16 #21 Local-mode ID collisions**: `crypto.randomUUID()`.
- **2026-07-16 #22 `createBucket` on every upload**: removed (bucket is provisioned once).
- **2026-07-16 #25 Duplicated OpenAPI specs**: `gpt/openapi.yaml` is canonical and updated (nutrients model, no `memories`, wellness fields); stale `supabase/functions/gpt-action/openapi.yaml` marked for deletion (see #26).
- **2026-07-16 #26 (partial)**: `TestCardRunner` gated to dev builds; README rewritten; `.gitignore` covers `env.md`/`.venv`/`card_samples`/`supabase/.temp`.
- **2026-07-16 #27 (partial)**: logout now wipes all `fitai_*` localStorage keys.
- **2026-07-16 (new, found during repair)**: EditProfileView macro-target steppers edited `profileData.macros` but the debounced save only persisted the untouched `tracked_nutrients` — carb/fat/fiber target edits silently never saved. Save path now folds `macros` values back into `tracked_nutrients`.
- **2026-07-16 (new, isolation audit)**: session-less auth path — with no Supabase session the app restored identity from `localStorage.fitai_active_profile_id` and treated the user as logged in (with the deployed service key this = account access by UUID). Now DEV-only (it exists solely to persist the dev-bypass login).
- **2026-07-16 (new, telegram audit)**: global `TELEGRAM_BOT_TOKEN` env var took precedence over each user's own bot token in both `/telegram/cron` and `/telegram/test` — users paired with their own bot would get failed/wrong-bot sends. Precedence flipped: user token first, env as fallback.
- **2026-07-16 (new, GPT config)**: `gpt/instructions.md` was 9,632 chars — over ChatGPT's **8,000-char Instructions limit** (would truncate). Rewritten to ~6,950 chars with all behaviors preserved; limit documented in `gpt/SETUP.md`.
