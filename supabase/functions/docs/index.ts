const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
};

const sections = [
  {
    id: "overview",
    title: "How to Use These Docs",
    content: `This documentation describes a real-time chat system where CLI clients communicate with a web-based host dashboard.

To build a client, you need to:
1. Obtain a registration token from the web host (Settings page)
2. POST the token to the /register endpoint to get credentials
3. Connect to Supabase Realtime using the returned credentials
4. Join the lobby channel for presence and your chat channel for messaging

This endpoint serves the full documentation. Use ?section=<id> to get a specific section, or ?format=markdown for plain text.

Available sections: overview, architecture, registration, chat-protocol, api-reference`,
  },
  {
    id: "architecture",
    title: "Architecture",
    content: `The system has three parts:

1. Web Dashboard (React SPA) — the host UI with sidebar showing connected clients, chat view, settings for token management, and this documentation
2. Edge Functions (Deno) — /register (token exchange), /manage-tokens (CRUD), /docs (this endpoint)
3. CLI Client (Node.js) — registers via token, connects to Supabase Realtime for presence + broadcast messaging

Data flow:
- Host generates token → CLI client exchanges token for {supabase_url, supabase_anon_key, client_id}
- CLI joins "chat-lobby" channel (presence) → appears in web sidebar
- CLI joins "chat:<client_id>" channel (broadcast) → bidirectional messaging with host
- No message persistence — live chat only`,
  },
  {
    id: "registration",
    title: "Registration Flow",
    content: `## Endpoint
POST /functions/v1/register

## Request
Content-Type: application/json
{"token": "<64-char-hex-string>"}

## Success Response (200)
{"client_id": "a1b2c3d4", "supabase_url": "https://...", "supabase_anon_key": "eyJ..."}

## Error Responses
- 400: {"error": "Token is required"} — missing/invalid token field
- 401: {"error": "Invalid token"} — token not in database
- 401: {"error": "Token already used"} — one-time token already redeemed
- 401: {"error": "Token expired"} — expiry token past its date

## Token Types
- one_time: single use, marked as used after redemption
- expiry: reusable until expires_at timestamp

## Client Credential Storage
After registration, save the response to ~/.chat-client-creds.json for subsequent runs.`,
  },
  {
    id: "chat-protocol",
    title: "Realtime Chat Protocol",
    content: `## Channels

### 1. Lobby: "chat-lobby" (Presence)
- Purpose: track online CLI clients
- Presence key: "cli:<client_id>"
- Track payload: {"name": "<client_id>", "type": "cli", "joinedAt": "<ISO8601>"}
- Events: sync, join, leave
- The web dashboard filters presence by type === "cli"

### 2. Chat: "chat:<client_id>" (Broadcast)
- Purpose: bidirectional messaging between host and one client
- Event name: "message"
- Payload: {"id": "<uuid>", "sender": "<name>", "text": "<content>", "timestamp": "<ISO8601 or epoch ms>"}
- CLI uses broadcast ack: true for delivery confirmation

## Connection Sequence
1. Create Supabase client with credentials from registration
2. Join "chat-lobby" channel, call .track() with presence payload
3. Join "chat:<client_id>" channel, listen for "message" broadcast events
4. Send messages via channel.send({type: "broadcast", event: "message", payload: {...}})
5. On disconnect, remove both channels`,
  },
  {
    id: "api-reference",
    title: "API Reference",
    content: `## Edge Functions

### POST /functions/v1/register
Exchange a registration token for Supabase credentials.
Request: {"token": "string"}
Response: {"client_id": "string", "supabase_url": "string", "supabase_anon_key": "string"}

### GET /functions/v1/manage-tokens
List all registration tokens. Returns array of token objects.

### POST /functions/v1/manage-tokens
Create a token. Request: {"label?": "string", "token_type?": "one_time|expiry", "expires_at?": "ISO8601"}
Response: created token object (201)

### DELETE /functions/v1/manage-tokens
Delete a token. Request: {"id": "uuid"}

### GET /functions/v1/docs
This endpoint. Returns documentation as JSON or markdown.
Query params: ?section=<id> — single section; ?format=markdown — plain text output

## Realtime Channels
- "chat-lobby": Presence channel for tracking online clients
- "chat:<client_id>": Broadcast channel for per-client messaging

## Dependencies for CLI Client
npm install @supabase/supabase-js ws
Requires Node.js 18+ (for native fetch)`,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sectionId = url.searchParams.get("section");
  const format = url.searchParams.get("format") || "json";

  const data = sectionId
    ? sections.find((s) => s.id === sectionId) || { error: `Unknown section: ${sectionId}. Available: ${sections.map(s => s.id).join(", ")}` }
    : { sections };

  if (format === "markdown") {
    let md: string;
    if (sectionId) {
      const section = sections.find((s) => s.id === sectionId);
      md = section ? `# ${section.title}\n\n${section.content}` : `Unknown section: ${sectionId}`;
    } else {
      md = sections.map((s) => `# ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
    }
    return new Response(md, {
      headers: { ...corsHeaders, "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
