#!/bin/zsh
# FitAI repair — remaining mechanical steps, queued during the 2026-07-16 tool-permission outage.
# Safe/local only: staging, dead-file deletion, moves, untracking, commits. NO push, NO deploy.
# Run from anywhere: it cd's to the repo root. Delete this script after it has run successfully.
set -e
cd "$(dirname "$0")/.."

# 1. Clear the unmerged index state (conflicts already content-resolved in both files)
git add src/App.tsx supabase/functions/gpt-action/index.ts

# 2. Delete dead files
rm -f src/components/LandingPage.FC.tsx src/components/MascotCoach.tsx design.md
rm -f supabase/functions/gpt-action/openapi.yaml   # stale duplicate; gpt/openapi.yaml is canonical
rm -f gpt/instructions.txt                          # stale duplicate; gpt/instructions.md is canonical

# 3. Archive old planning notes (move, not delete)
mkdir -p docs/archive
git mv goal.md phases_summary.md gpt_max_potential_strategy.md docs/archive/ 2>/dev/null || \
  mv goal.md phases_summary.md gpt_max_potential_strategy.md docs/archive/

# 4. Untrack committed files that .gitignore now covers (files stay on disk)
git rm --cached env.md
git rm -r --cached card_samples/

# 5. Verify
npm run lint          # tsc must pass (it did at handoff time)
npm run build         # must bundle cleanly

# 6. Commit in logical chunks (NO push — Vercel auto-deploys main; deploy is coordinated with key rotation)
git add src/ supabase/ gpt/ .agents/
git commit -m "fix: resolve merge conflicts, finish dynamic-nutrients migration, harden security

- resolve gpt-action conflicts (keep tags/fiber/timezone side) + remove duplicate resolvedTime block
- add missing Clock import (App.tsx)
- finish dynamic nutrients: signup/onboarding/realtime/save, gpt-action meals POST/PATCH (nutrients jsonb
  + legacy flat aliases), getDailyRemaining, telegram report, Notion sync, recipes description/fiber
- fold EditProfileView macro-target edits back into tracked_nutrients on save (targets never persisted)
- OAuth: explicit approve, redirect_uri allowlist, token-exchange client/redirect validation
- gate session-less localStorage profile restore and dev bypass to DEV builds
- delete unauthenticated /run-migration endpoint; CRON_SECRET now required (fail closed)
- /profile GET returns a projection (no api_key/integration secrets); crypto.randomUUID api keys
- daily-wellness merge semantics + water/stool fields; weight log_time passthrough
- telegram: user bot token takes precedence over global env token (cron + test)
- Gemini: text only via edge function; bundled VITE key and localStorage copies removed
- centralize constants (src/constants/app.ts, nutrition.ts); GPT spec updated; instructions under
  ChatGPT's 8,000-char limit (was 9,632)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

git add -A
git commit -m "chore: hygiene cleanup — dead files, root archive, gitignore, README, docs/context handoff

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

echo "DONE. Next: owner runs the key-rotation + deploy runbook (docs/context/known-issues.md #1),"
echo "then re-pastes gpt/openapi.yaml AND gpt/instructions.md into the Custom GPT."
