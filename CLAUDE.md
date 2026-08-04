# FitAI — Project Brief for AI Assistants

Mobile-first nutrition/fitness tracker. React 19 + Vite + Tailwind 4 frontend (single-page, deployed on Vercel at fitpush.vercel.app), Supabase backend (Postgres + Auth + Storage + Edge Functions), and a ChatGPT Custom GPT that logs meals through the `gpt-action` edge function.

## Session context — read first

All durable project knowledge lives in **`docs/context/`** — one folder, one file per concern:

| File | What it holds |
|---|---|
| [architecture.md](docs/context/architecture.md) | System map: data flows, auth paths, integrations |
| [database.md](docs/context/database.md) | Actual schema, migration state, drift warnings |
| [api.md](docs/context/api.md) | gpt-action endpoints, auth model, OpenAPI spec locations |
| [known-issues.md](docs/context/known-issues.md) | Prioritized audit findings (2026-07-16) — check before "fixing" anything already known |
| [decisions.md](docs/context/decisions.md) | Decision log — append, never rewrite history |
| [conventions.md](docs/context/conventions.md) | Naming/code standards going forward |

**Workflow:** at the start of a session, skim this file + the context file(s) relevant to your task. When you finish meaningful work, update the relevant context file (and `decisions.md` if a choice was made). Keep entries short and dated. Delete stale info rather than piling on.

## Current state warnings (as of 2026-07-16, post-repair)

- **Read [docs/context/HANDOFF.md](docs/context/HANDOFF.md) first** — the repair session ended with committed-nothing/uncommitted-everything due to a platform outage; that file lists the exact finish steps (`scripts/finish-repair.sh`), the rotation/deploy sequence, and the verification still owed. Delete it once consumed.

- **Key rotation + coordinated deploy is the top outstanding item.** The live site still runs the pre-repair bundle with the **service_role** key as `VITE_SUPABASE_ANON_KEY`; secrets remain in git history. Follow the runbook in known-issues.md #1 — deploy the repaired code and rotate keys together. Never paste keys into files.
- The repair pass (conflicts resolved, dynamic nutrients finished, OAuth hardened, `/run-migration` deleted) is in the working tree but **not yet deployed**. `supabase functions deploy gpt-action` requires `CRON_SECRET` to be set (the hardcoded fallback is gone) and the GPT spec (`gpt/openapi.yaml`) re-pasted into the ChatGPT config afterwards.
- Nutrients are dynamic: `meals.nutrients` jsonb + `profiles.tracked_nutrients`. The default list lives in `src/constants/nutrition.ts` and must stay in sync with the DB default. Never reintroduce `carbs/fats/fiber` columns on meals/profiles.
- Pending small deletions (were tool-blocked): `src/components/LandingPage.FC.tsx`, `src/components/MascotCoach.tsx`, `design.md`, `supabase/functions/gpt-action/openapi.yaml`; move `goal.md`/`phases_summary.md`/`gpt_max_potential_strategy.md` → `docs/archive/`; `git rm --cached env.md`.

## Commands

- `npm run dev` — Vite dev server on :3000
- `npm run build` — production build (esbuild; does NOT type-check)
- `npm run lint` — `tsc --noEmit` (the real error gate)
- Edge functions deploy via Supabase CLI (`supabase functions deploy gpt-action`)

## Rules

- `.agents/AGENTS.md` defines the "Fiber Rule" (fiber is a first-class macro, 4-column layouts). Note it currently conflicts with the dynamic-nutrients direction — see decisions.md.
- Migrations: add a new timestamped file under `supabase/migrations/`; never edit applied ones; keep `schema.sql` in sync in the same commit; never run DDL through HTTP endpoints.
