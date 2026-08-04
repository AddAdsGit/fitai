# HANDOFF — repair session of 2026-07-16

_Transient file: this captures in-flight state between sessions. Consume it, act on it, then **delete it** (rules of this folder: current beats complete). Everything durable already lives in the other files here._

## Where things stand

A full audit + repair pass ran on 2026-07-16 (owner-approved plan: finish dynamic nutrients forward, P0+P1+hygiene scope, patch OAuth). **All code and doc changes are complete in the working tree and `npm run lint` (tsc) passes.** Nothing is committed, pushed, or deployed yet — a platform outage (tool-permission classifier) blocked all shell/git mutations for the final ~hour of the session.

Production readiness at handoff: **live site ≈ 2.5/10** (service key public, writes failing against migrated DB); **this tree once deployed + keys rotated ≈ 6.5/10**.

## Step 1 — run the finish script (any session, or the owner directly)

```bash
zsh scripts/finish-repair.sh
```

It does the queued mechanical work: clears the two unmerged index entries (`src/App.tsx`, `supabase/functions/gpt-action/index.ts` — conflicts are already content-resolved), deletes 5 dead files, archives 3 root notes to `docs/archive/`, untracks `env.md` + `card_samples/`, runs lint + build, and makes two commits. **No push, no deploy.** Delete the script after success.

## Step 2 — owner-only: key rotation + coordinated deploy

Follow the runbook in [known-issues.md](known-issues.md) **#1** exactly (rotate Supabase keys → real anon key into Vercel env + local `.env` → `supabase secrets set CRON_SECRET GEMINI_API_KEY FRONTEND_URL` → push main + `supabase functions deploy gpt-action gemini` → revoke old Gemini key). Deploy and rotation must land **together** — each without the other leaves production broken.

## Step 3 — after deploy: update the Custom GPT

Re-paste **both** files into the ChatGPT GPT config: `gpt/openapi.yaml` (Actions schema — nutrients model) and `gpt/instructions.md` (Instructions box — now 6,951 chars; the box has a hard 8,000-char limit, the old file was 9,632 and was being truncated).

## Step 4 — verification still owed

The in-browser click-through never ran (blocked by the same outage). After deploy, verify with a test account: signup, onboarding finish (was broken), dashboard weight section (was crashing), water/wellness logging, meal log via GPT, macro-target edit in Edit Profile persists after reload (was silently not saving), OAuth consent shows an explicit Approve screen (no auto-redirect), Telegram test message with a user-configured bot.

## What changed this session (summary — details in known-issues.md Resolved + decisions.md)

- Merge conflicts + duplicate block resolved in gpt-action; missing `Clock` import fixed.
- Dynamic-nutrients migration finished across every frontend/backend read+write path (production-breaking writes eliminated); `gpt/openapi.yaml` is the single canonical spec.
- Security: OAuth hardened (explicit approve, redirect allowlist, token-exchange validation), `/run-migration` deleted, `/profile` projection, crypto-random api keys, CRON fail-closed, Gemini bundled-key exposure removed, session-less localStorage login gated to DEV, logout wipes `fitai_*`, Telegram user-token precedence fixed.
- Hygiene: fake paywall disabled, TestCardRunner dev-only, constants centralized (`src/constants/app.ts`, `nutrition.ts`), real README, proper `.gitignore`.
- New bugs found & fixed during audit: onboarding wrote dropped columns; macro-target edits never persisted; ProfileView recipe-from-meal inserted a nonexistent column.

## Open items (tracked in known-issues.md)

#1 rotation/deploy (above) · #11 migration chain can't rebuild DB · #16–19 time handling & remaining hardcoded values · #23 App.tsx monolith split (deferred by owner) · #28 no tests/CI · #29 no account deletion · #31 user-supplied Gemini keys still client-side for multimodal · token endpoint doesn't verify the OAuth client secret · Telegram Markdown not escaped in display names.
