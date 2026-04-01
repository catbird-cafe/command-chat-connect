# Command Chat Connect

Vite + React + TypeScript SPA with Supabase realtime chat and a CLI client.

## Development

- **Install**: `npm install`
- **Dev server**: `npm run dev` — Vite listens on port **8080** (see `vite.config.ts`). The **`lovable-tagger`** Vite plugin stays enabled in development so the project stays compatible with **[Lovable](https://lovable.dev)** sync and tooling (it does nothing in production builds).

Playwright: if you use Lovable’s agent Playwright package, it is picked up automatically; otherwise the repo includes a default Playwright config for local runs.

Configure **Supabase** in `.env` using `VITE_*` variables (for example `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Links like `/register` and `/docs` use the current deployment origin at runtime rather than a hardcoded domain.

## CLI client

End users install with **`curl`**; the script creates **`./client`** in their current directory and does not use this repository. With the dev server or production build running, this app serves **`/install-cli.sh`** and **`/cli-client/*`**. See **`client/README.md`**.

Maintainers: **`npm run sync-cli-public`** copies **`client/*`** and the remote installer into **`public/`** (runs before **`npm run dev`** and **`npm run build`**). Those **`public/cli-client/`** and **`public/install-cli.sh`** artifacts are **gitignored**—only **`client/`** and **`scripts/install-cli-remote.sh`** are source.

## Docs

- In-app documentation: **`/docs`** route (see `src/pages/Docs.tsx`).
- Additional markdown under `docs/` may not match the SPA verbatim; treat `Docs.tsx` as the source of truth for the embedded help UI.
