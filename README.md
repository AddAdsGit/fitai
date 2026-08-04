# FitAI

Mobile-first nutrition and fitness tracker. Meals are logged either in the web app or through a ChatGPT Custom GPT that calls the `gpt-action` Supabase edge function; the web app (React 19 + Vite + Tailwind 4, deployed on Vercel) is the dashboard.

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and the *anon* key
npm run dev            # Vite dev server on :3000
```

- `npm run lint` — TypeScript check (`tsc --noEmit`). **This is the real error gate**; `npm run build` does not type-check.
- `npm run build` — production build.
- Edge functions deploy with `supabase functions deploy gpt-action`.

## Project knowledge

All durable context (architecture, schema state, API surface, known issues, decisions, conventions) lives in [`docs/context/`](docs/context/README.md) — start there. AI assistants load [`CLAUDE.md`](CLAUDE.md) automatically, which points to the same folder.

## Secrets

Frontend env vars (`VITE_*`) are public — only the Supabase **anon** key belongs there. Function secrets live in `supabase secrets`; deployment env vars in Vercel. Nothing secret is committed to this repo.
