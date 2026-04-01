# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────┐
│                  Web Dashboard                  │
│  (React SPA — Login, Dashboard, Settings, Docs) │
│                                                 │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Sidebar     │  │ ChatView │  │ Settings   │ │
│  │ (presence)  │  │ (msgs)   │  │ (tokens)   │ │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘ │
│         │              │              │         │
│         ▼              ▼              ▼         │
│    Supabase Realtime          Edge Functions     │
│    (Presence + Broadcast)     (manage-tokens,    │
│                                register)         │
└─────────────────────────────────────────────────┘
           ▲                        ▲
           │  WebSocket             │  HTTPS POST
           │                        │
┌──────────┴────────────────────────┴──────────────┐
│                  CLI Client                       │
│  (Node.js script — registers, joins channels)     │
│                                                   │
│  1. POST /register with token → gets creds        │
│  2. Joins "chat-lobby" channel (presence)          │
│  3. Joins "chat:<client_id>" channel (broadcast)   │
│  4. stdin → broadcast messages, stdout ← received  │
└───────────────────────────────────────────────────┘
```

## Components

| Component | Tech | Purpose |
|-----------|------|---------|
| Web Dashboard | React + Vite + Tailwind | Host UI for managing clients and chatting |
| CLI Client | Node.js + `@supabase/supabase-js` + `ws` | Terminal-based chat participant |
| Realtime Presence | Supabase Realtime | Tracks online CLI clients in the lobby |
| Realtime Broadcast | Supabase Realtime | Sends/receives chat messages per client |
| Edge Functions | Deno (Supabase) | Token management and client registration |
| Token System | Postgres table + Edge Functions | Generates and validates registration tokens |

## Data Flow

1. **Host** logs into the web dashboard with a display name (no auth — localStorage)
2. **Host** generates a registration token in Settings
3. **CLI client** calls the `/register` endpoint with the token
4. **CLI client** receives `{ supabase_url, supabase_anon_key, client_id }`
5. **CLI client** connects to Realtime, joins `chat-lobby` (presence) and `chat:<client_id>` (broadcast)
6. **Web dashboard** sees the client appear in the sidebar via presence sync
7. **Host** clicks on a client → opens the `chat:<client_id>` broadcast channel
8. Both sides send/receive messages via broadcast events

## No Persistence

Messages are **not stored** in a database. They exist only while both parties are connected. Disconnecting loses the history.
