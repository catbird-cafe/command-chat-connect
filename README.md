# Command Chat Connect

Vite + React + TypeScript app with Supabase realtime chat and a CLI client.

## Lovable.dev

This repo comes from **[Lovable](https://lovable.dev)** (AI-assisted app builder). Typical workflow:

- Edit in Lovable’s UI and/or clone and work locally with git.
- **Dev**: `npm install` then `npm run dev` (Vite uses port **8080** per `vite.config.ts`).
- **Lovable dev plugin**: `lovable-tagger` runs only in development to support Lovable tooling; it does not affect production builds.

Configure **Supabase** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.) in your Lovable project environment (or `.env` locally). The hosted app URL for links like `/register` and `/docs` is always the deployment origin — the UI derives it at runtime rather than hardcoding a domain.

## Docs

- In-app documentation: **`/docs`** route (see `src/pages/Docs.tsx`).
- Additional markdown under `docs/` may not match the SPA verbatim; treat `Docs.tsx` as the source of truth for the embedded help UI.
