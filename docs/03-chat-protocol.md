# Realtime Chat Protocol

## Channels

The system uses two Supabase Realtime channel patterns:

### 1. Lobby Channel: `chat-lobby`

**Purpose**: Presence tracking — lets the web dashboard see which CLI clients are online.

**Joined by**: Both the web dashboard and every CLI client.

#### Presence Payload (tracked by CLI clients)

```json
{
  "name": "<client_id>",
  "type": "cli",
  "joinedAt": "2025-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | The `client_id` from registration |
| `type` | string | Always `"cli"` for CLI clients |
| `joinedAt` | ISO 8601 | When the client connected |

#### Presence Key

CLI clients use the key `cli:<client_id>` when joining presence.
The web dashboard uses the key `"lobby"`.

#### Events

| Event | Description |
|-------|-------------|
| `sync` | Full presence state update — rebuild the client list |
| `join` | A new client came online |
| `leave` | A client went offline |

The web dashboard filters presence entries by `type === "cli"` and deduplicates by `name`.

---

### 2. Chat Channel: `chat:<client_id>`

**Purpose**: Bidirectional messaging between the web host and a specific CLI client.

**Channel name**: `chat:` followed by the client's `client_id` (e.g., `chat:a1b2c3d4`)

**Joined by**: The CLI client (always) and the web dashboard (when the host clicks on that client in the sidebar).

#### Broadcast Event: `message`

Both sides send and listen for the `message` event.

```json
{
  "type": "broadcast",
  "event": "message",
  "payload": {
    "id": "uuid-string",
    "sender": "<name>",
    "text": "Hello!",
    "timestamp": "2025-01-15T10:31:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique message ID (UUID) |
| `sender` | string | Display name of the sender |
| `text` | string | Message content |
| `timestamp` | ISO 8601 / number | When the message was sent |

> **Note**: The web dashboard uses ISO timestamps, the CLI client uses `Date.now()` (epoch ms). Both are acceptable.

#### Broadcast Config

The CLI client enables `ack: true` for delivery confirmation:

```js
supabase.channel(`chat:<client_id>`, {
  config: { broadcast: { ack: true } }
})
```

The web dashboard does not use ack.

## Connection Lifecycle

```
CLI Client                          Web Dashboard
    │                                      │
    ├── Join "chat-lobby" ────────────────►│ (presence sync)
    ├── Track presence ───────────────────►│ (client appears in sidebar)
    ├── Join "chat:<id>" ──────────────────┤
    │                                      │
    │          (host clicks client)        │
    │                                      ├── Join "chat:<id>"
    │                                      │
    │◄──────── broadcast "message" ────────┤ (host types)
    ├──────── broadcast "message" ─────────►│ (client types)
    │                                      │
    │          (client disconnects)        │
    ├── Untrack / remove channels ────────►│ (client leaves sidebar)
```
