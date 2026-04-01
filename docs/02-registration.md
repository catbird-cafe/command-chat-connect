# Registration Flow

## Overview

CLI clients don't receive Supabase credentials directly. Instead, the web host generates a **registration token** which the CLI client exchanges for credentials via the `/register` endpoint.

## Token Types

| Type | Behavior |
|------|----------|
| `one_time` | Can be used exactly once. After registration, the token is marked as used. |
| `expiry` | Can be reused until the `expires_at` timestamp passes. |

## Step-by-Step

### 1. Generate a Token (Web UI)

Go to **Settings** in the dashboard sidebar menu. Fill in:
- **Label** (optional): A friendly name like "Dev laptop"
- **Type**: One-time or Expiry
- **Expires at** (expiry only): When the token becomes invalid

Click **Generate Token**. Copy the token string.

### 2. Register the CLI Client

**Curl installer** (app must be running; run from the folder where you want a **`client/`** directory):

```bash
curl -fsSL https://<your-app-host>/install-cli.sh | bash -s -- https://<your-app-host>
cd client
REGISTER_URL="https://<project_id>.supabase.co/functions/v1/register" \
  node cli-client.js <token>
```

The CLI client sends:

```http
POST /functions/v1/register
Content-Type: application/json

{
  "token": "<64-char-hex-string>"
}
```

### 3. Successful Response

```json
{
  "client_id": "a1b2c3d4",
  "supabase_url": "https://<project>.supabase.co",
  "supabase_anon_key": "eyJ..."
}
```

The CLI client saves this to `creds.json` in its `client/` directory (next to `cli-client.js`) for future use.

### 4. Subsequent Runs

```bash
cd client
node cli-client.js
```

No token or environment variables needed — credentials are loaded from the saved file.

## Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error": "Token is required"}` | Missing or invalid token field |
| 401 | `{"error": "Invalid token"}` | Token not found in database |
| 401 | `{"error": "Token already used"}` | One-time token was already redeemed |
| 401 | `{"error": "Token expired"}` | Expiry token past its `expires_at` date |

## Token Storage

Tokens are stored in the `client_tokens` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `token` | TEXT | 64-char hex string (auto-generated) |
| `label` | TEXT | Optional friendly name |
| `token_type` | TEXT | `one_time` or `expiry` |
| `expires_at` | TIMESTAMPTZ | Expiration date (expiry type only) |
| `used` | BOOLEAN | Whether the token has been redeemed |
| `used_at` | TIMESTAMPTZ | When it was redeemed |
| `client_id` | TEXT | The client_id assigned on registration |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

The table has RLS enabled with a deny-all policy — all access goes through the edge functions using the service role key.
