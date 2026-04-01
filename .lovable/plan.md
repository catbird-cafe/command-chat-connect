

# Chat Dashboard with Supabase Realtime

## Prerequisites

You don't have Supabase connected yet. Before I can build this, you'll need to connect Supabase to the project. I'll prompt you to do that as part of implementation.

## Architecture

```text
CLI Client (Node.js script)
    │
    ├── Joins Supabase Realtime channel "chat-lobby"
    ├── Tracks presence (announces itself as available client)
    └── Sends/receives broadcast messages on per-client channels
    
Web Dashboard (React)
    │
    ├── Simple username login screen (localStorage, no real auth)
    ├── Sidebar: subscribes to "chat-lobby" presence → shows online CLI clients
    ├── Chat view: joins per-client channel "chat:{clientName}" for broadcast messaging
    └── No message persistence — live only
```

## Plan

### 1. Connect Supabase
Prompt you to connect a Supabase project via the connector. This gives us the URL and anon key.

### 2. Create login page
Simple username prompt stored in localStorage. No Supabase Auth — just a display name for the web host. Redirects to dashboard after entry.

### 3. Build dashboard layout
- Sidebar (using shadcn Sidebar) listing connected CLI clients from Realtime Presence
- Main area showing the active chat conversation
- Each CLI client in the sidebar is clickable to open that chat

### 4. Implement Realtime logic
- **Lobby channel** (`chat-lobby`): All CLI clients join and track presence. Web dashboard subscribes to presence to render the client list.
- **Per-client chat channel** (`chat:{clientName}`): When web host clicks a client, both sides exchange broadcast events (`message`) on this channel. Messages stored in React state only.

### 5. Build chat UI
- Message list with sender labels and timestamps
- Input box + send button at the bottom
- Visual distinction between host and client messages

### 6. Provide CLI client script
A standalone Node.js script (`cli-client.js`) that:
- Takes a client name as argument
- Uses `@supabase/supabase-js` to join the lobby channel with presence
- Joins its own `chat:{name}` channel
- Reads stdin for messages, broadcasts them, prints received messages to stdout
- User runs: `SUPABASE_URL=... SUPABASE_ANON_KEY=... node cli-client.js myname`

### Files to create/modify
- `src/pages/Login.tsx` — username prompt
- `src/pages/Dashboard.tsx` — main layout with sidebar + chat
- `src/components/ClientSidebar.tsx` — presence-based client list
- `src/components/ChatView.tsx` — message display + input
- `src/hooks/useRealtimePresence.ts` — lobby presence hook
- `src/hooks/useRealtimeChat.ts` — per-client broadcast hook
- `src/lib/supabase.ts` — Supabase client init
- `src/App.tsx` — add routes
- `/cli-client.js` — Node.js CLI script (provided in chat, not in the app)

### Technical details
- Supabase Realtime channels with `channel.on('broadcast', ...)` for messages
- `channel.track()` for presence
- No database tables needed — purely Realtime features
- No RLS or migrations required

