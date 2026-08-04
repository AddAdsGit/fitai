# docs/context — the project's shared memory

This folder is the single place where durable knowledge about FitAI lives, so any collaborator (human or AI, in any conversation) can load the current state of the project without re-discovering it.

## The files

> **If `HANDOFF.md` exists in this folder, read it first** — it holds in-flight state from an interrupted session (pending steps, uncommitted work). Act on it, then delete it.

| File | Question it answers | Update when… |
|---|---|---|
| `architecture.md` | How do the pieces fit together? | a component, integration, or data flow is added/removed |
| `database.md` | What does the schema actually look like right now? | any migration is written or applied |
| `api.md` | What endpoints exist and how is auth done? | gpt-action or specs change |
| `known-issues.md` | What's broken/risky and in what priority? | an issue is found or fixed (move fixed items to the bottom, dated) |
| `decisions.md` | Why is it built this way? | any non-obvious choice is made |
| `conventions.md` | How should new code/schema be written? | a standard is adopted or changed |

## Rules of the folder

1. **One topic, one file.** Don't create new files per session; append to the right one.
2. **Date every entry** (`YYYY-MM-DD`). Newest at top, except `decisions.md` (chronological).
3. **Keep it current, not complete.** Delete or correct stale statements instead of stacking contradictions. Git history preserves the old text.
4. **Short beats thorough.** A five-line accurate map is worth more than a five-page stale one.
5. **No secrets.** Keys, tokens, and passwords never go in this folder (or anywhere in the repo).

Root `CLAUDE.md` is the entry point that AI sessions load automatically; it links here.

## Related root files (pre-existing)

`goal.md`, `phases_summary.md`, `gpt_max_potential_strategy.md` are earlier planning notes at the repo root. Historical context only — treat this folder as the source of truth where they disagree. (Candidates to be merged in here and removed.)
