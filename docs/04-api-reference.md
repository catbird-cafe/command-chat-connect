# API Reference

## Edge Functions

### POST `/functions/v1/register`

Exchange a registration token for Supabase credentials and a client ID.

**Request**

```http
POST /functions/v1/register
Content-Type: application/json

{
  "token": "string (required)"
}
```

**Success Response** `200 OK`

```json
{
  "client_id": "a1b2c3d4",
  "supabase_url": "https://<project>.supabase.co",
  "supabase_anon_key": "eyJ..."
}
```

**Error Responses**

| Status | Body | When |
|--------|------|------|
| 400 | `{"error": "Token is required"}` | Missing/invalid `token` field |
| 401 | `{"error": "Invalid token"}` | Token not found |
| 401 | `{"error": "Token already used"}` | One-time token already redeemed |
| 401 | `{"error": "Token expired"}` | Expiry token past its date |

---

### GET `/functions/v1/manage-tokens`

List all registration tokens.

**Response** `200 OK`

```json
[
  {
    "id": "uuid",
    "token": "64-char-hex",
    "label": "Dev laptop",
    "token_type": "one_time",
    "expires_at": null,
    "used": false,
    "used_at": null,
    "client_id": null,
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

---

### POST `/functions/v1/manage-tokens`

Create a new registration token.

**Request**

```json
{
  "label": "string (optional)",
  "token_type": "one_time | expiry (default: one_time)",
  "expires_at": "ISO 8601 timestamp (required if type is expiry)"
}
```

**Response** `201 Created`

Returns the full token record (same shape as GET list items).

---

### DELETE `/functions/v1/manage-tokens`

Delete a token.

**Request**

```json
{
  "id": "uuid (required)"
}
```

**Response** `200 OK`

```json
{
  "success": true
}
```

---

## Realtime Channels

### `chat-lobby`

| Feature | Detail |
|---------|--------|
| Type | Presence |
| Presence key (CLI) | `cli:<client_id>` |
| Presence key (Web) | `lobby` |
| Tracked fields | `name`, `type`, `joinedAt` |
| Events | `sync`, `join`, `leave` |

### `chat:<client_id>`

| Feature | Detail |
|---------|--------|
| Type | Broadcast |
| Event name | `message` |
| Payload | `{ id, sender, text, timestamp }` |
| Ack (CLI) | Enabled |
| Ack (Web) | Disabled |

---

## CLI Client

See **`client/README.md`**. **Curl** the installer from your deployed app (`/install-cli.sh`); it creates **`./client`** in the current directory.

### First Run (Registration)

```bash
curl -fsSL https://<your-app-host>/install-cli.sh | bash -s -- https://<your-app-host>
cd client
REGISTER_URL="https://<project_id>.supabase.co/functions/v1/register" \
  node cli-client.js <token>
```

### Subsequent Runs

```bash
cd client
node cli-client.js
```

Credentials are stored in `creds.json` next to `cli-client.js` in the CLI install directory:

```json
{
  "client_id": "a1b2c3d4",
  "supabase_url": "https://...",
  "supabase_anon_key": "eyJ..."
}
```

### Dependencies

The curl installer runs **`npm install`** inside **`./client`**. Requires Node.js 18+ (for native `fetch`) and **curl**.
