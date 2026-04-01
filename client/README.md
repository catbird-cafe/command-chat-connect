# Command Chat CLI

Node.js client for Command Chat Connect. **End users** install with `curl` into a local **`./client`** folder (see below). This folder in the repo is the **source** for those published assets.

## Install with curl (recommended)

With the web app running, run this **from the directory where you want `client/` created** (for example your home folder or a project folder).

**Copy-paste all of the following** (replace `<token>` with the token from Settings; use your real app URL instead of the example):

```bash
curl -fsSL https://your-app.example.com/install-cli.sh | bash -s -- https://your-app.example.com
cd client
REGISTER_URL="https://your-app.example.com/register" node cli-client.js <token>
```

Local dev (default Vite port):

```bash
curl -fsSL http://localhost:8080/install-cli.sh | bash -s -- http://localhost:8080
cd client
REGISTER_URL="http://localhost:8080/register" node cli-client.js <token>
```

The `curl` line creates **`./client`** next to your shell’s current directory, downloads the CLI files into it, and runs `npm install` there. Use **`INSTALL_DIR`** to pick a different path. If you already ran the installer, skip the `curl` line and only run `cd client` and the `node` line.

`REGISTER_URL` is your app’s **`/register` page URL** (same host as the dashboard). The Vite **dev** and **`vite preview`** servers accept `POST /register` and forward the body to the Supabase Edge Function. A **static file host** must provide the same POST proxy (or the CLI cannot register using only that URL).

## Requirements

- **Node.js 18+**
- **curl** (for the remote installer)
- Network access to Supabase Realtime (`wss://`)

## Developing the CLI in this repository

If you are working on the app repo itself, this directory is the source of truth. From **here** (`client/`):

```bash
./install.sh
```

or `npm install`. Run `node cli-client.js` with the same environment variables as above.

## Usage

All examples assume your shell’s **current working directory is the `client/` folder** that the installer created (or this repo’s `client/` when developing).

### Registration (token from the web app Settings)

```bash
REGISTER_URL="https://your-host/register" node cli-client.js <token>
```

### After registration (saved credentials)

```bash
node cli-client.js
```

### Direct mode (no registration file)

```bash
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_ANON_KEY="<anon-key>" \
node cli-client.js <display-name>
```

### npm script

```bash
npm run cli -- <token>
```

## Files

| File | Purpose |
|------|---------|
| `cli-client.js` | Entry script |
| `install.sh` | Local `npm install` when developing in the repo |
| `package.json` | Dependencies: `@supabase/supabase-js`, `ws` |
| `../scripts/install-cli-remote.sh` | Published as **`/install-cli.sh`** (copied to `public/` by `npm run sync-cli-public` in the web app) |
