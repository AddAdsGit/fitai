# Conventions (going forward)

_Adopted 2026-07-16. Existing code violates several of these; bring code into line opportunistically when touching it — don't mass-rewrite._

## Database

- Tables: plural snake_case (`meals`, `weight_logs`). Columns: snake_case. Booleans `*_enabled`/`is_*`; timestamps `*_at` (timestamptz); dates `date`; clock times `*_time` as `time` type, not text (legacy text columns stay until migrated).
- Every table: RLS enabled + own-row policy, FK to `profiles(id) on delete cascade`, index on the main query path (`profile_id, date`).
- Schema changes ONLY via a new timestamped file in `supabase/migrations/`; never edit applied migrations; never DDL over HTTP; destructive changes require an explicit data-copy step and a note in decisions.md. Regenerate `schema.sql` (`supabase db dump`) in the same commit.

## TypeScript / React

- DB payload types mirror DB columns exactly (snake_case); convert at ONE mapping layer, not per-call-site. No parallel "UI shapes" (`goals.dailyCalories` style) — the audit found 3 competing profile shapes; converge on the DB-mirroring type.
- New components: one file per component in `src/components/`, PascalCase filename (`LandingPage.FC.tsx`-style suffixes are not allowed). Files >400 lines should be split.
- Data access goes through a shared module (`src/lib/`), not inline `supabase.from()` in JSX files. All supabase calls check `error`.
- No `console.log` left in committed code; user-visible failures get a toast.

## Config & secrets

- Secrets: Vercel env (frontend build) and `supabase secrets` (functions) only. Never in the repo, never in `VITE_*` vars (those are public), never in `profiles.preferences`, never in localStorage.
- Product constants (default goals, water target, GPT URL, bot names) live in `src/constants/`, defined once. If a value must match a DB default, the DB default is the source and the constant notes it.
- localStorage keys: prefix `fitai_`, registered in one constants file.

## ChatGPT GPT config

- `gpt/instructions.md` must stay **under 8,000 characters** (ChatGPT Instructions box hard limit; target ≤7,500). Check with `wc -c` after every edit; compress prose, never drop behaviors.
- `gpt/openapi.yaml` is the only spec. Any gpt-action endpoint/field change updates it in the same commit, and the spec must be re-pasted into the GPT after deploy.

## Process

- `npm run lint` (tsc) must pass before commit — `npm run build` alone proves nothing.
- Update the relevant `docs/context/` file in the same PR/commit as the change; date the entry.
- Commits: conventional prefixes (`feat:`, `fix:`, `chore:`) as already practiced.
