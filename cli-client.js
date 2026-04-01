#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const readline = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");

const CREDS_FILE = path.join(process.env.HOME || ".", ".chat-client-creds.json");

async function getCredentials() {
  // If creds file exists, use it
  if (fs.existsSync(CREDS_FILE)) {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    console.log(`[init] Using saved credentials (client: ${creds.client_id})`);
    return creds;
  }

  // Otherwise, register with a token
  const token = process.argv[2];
  const registerUrl = process.env.REGISTER_URL;

  if (!token || !registerUrl) {
    console.error("First run — register with a token:");
    console.error("  REGISTER_URL=<url> node cli-client.js <token>");
    console.error("");
    console.error("After registration, credentials are saved and you can just run:");
    console.error("  node cli-client.js");
    process.exit(1);
  }

  console.log("[init] Registering with token...");
  const res = await fetch(registerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[init] Registration failed: ${err.error || res.statusText}`);
    process.exit(1);
  }

  const creds = await res.json();
  fs.writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2));
  console.log(`[init] Registered! Client ID: ${creds.client_id}`);
  console.log(`[init] Credentials saved to ${CREDS_FILE}`);
  return creds;
}

async function main() {
  const creds = await getCredentials();
  const { supabase_url: SUPABASE_URL, supabase_anon_key: SUPABASE_ANON_KEY, client_id: name } = creds;

function resolveTransport() {
  try {
    const ws = require("ws");
    console.log("[init] Transport: ws package");
    return ws;
  } catch {
    if (typeof WebSocket !== "undefined") {
      console.log("[init] Transport: native WebSocket");
      return WebSocket;
    }

    console.error("[init] No WebSocket transport found.");
    console.error("[init] Install dependencies with: npm install @supabase/supabase-js ws");
    process.exit(1);
  }
}

const transport = resolveTransport();
const realtimeEndpoint = `${SUPABASE_URL.replace(/^http/, "ws")}/realtime/v1/websocket`;

console.log(`[init] Client name: "${name}"`);
console.log(`[init] Node: ${process.version}`);
console.log(`[init] Realtime endpoint: ${realtimeEndpoint}`);
console.log("[init] Connecting...");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    transport,
    timeout: 10000,
    heartbeatIntervalMs: 15000,
    params: { eventsPerSecond: 10 },
  },
});

let lobbyReady = false;
let chatReady = false;

const maybeReady = () => {
  if (lobbyReady && chatReady) {
    clearTimeout(connectionTimer);
    console.log(`✓ Connected as \"${name}\". Waiting for messages...`);
  }
};

const connectionTimer = setTimeout(() => {
  if (lobbyReady && chatReady) return;
  console.error("[diag] Realtime connection timed out.");
  console.error("[diag] Try: npm install @supabase/supabase-js ws");
  console.error("[diag] VPNs, proxies, and firewalls can also block wss:// connections.");
}, 12000);

const lobby = supabase.channel("chat-lobby", {
  config: { presence: { key: `cli:${name}` } },
});

lobby
  .on("presence", { event: "sync" }, () => {
    const state = lobby.presenceState();
    const count = Object.values(state).flat().length;
    console.log(`[lobby] Presence sync — ${count} participant(s) in lobby`);
  })
  .on("presence", { event: "join" }, ({ newPresences }) => {
    for (const presence of newPresences) {
      console.log(`[lobby] Join: ${presence.name || "unknown"}`);
    }
  })
  .on("presence", { event: "leave" }, ({ leftPresences }) => {
    for (const presence of leftPresences) {
      console.log(`[lobby] Leave: ${presence.name || "unknown"}`);
    }
  })
  .subscribe(async (status, err) => {
    console.log(`[lobby] Subscribe status: ${status}`);
    if (err) console.error("[lobby] Error:", err);

    if (status === "SUBSCRIBED") {
      lobbyReady = true;
      const trackResult = await lobby.track({
        name,
        type: "cli",
        joinedAt: new Date().toISOString(),
      });
      console.log(`[lobby] Track result: ${trackResult}`);
      maybeReady();
    }

    if (status === "TIMED_OUT") {
      console.error("[lobby] Timed out before the socket finished joining.");
    }
  });

const chat = supabase.channel(`chat:${name}`, {
  config: { broadcast: { ack: true } },
});

chat
  .on("broadcast", { event: "message" }, ({ payload }) => {
    console.log(`[${payload.sender}] ${payload.text}`);
  })
  .subscribe((status, err) => {
    console.log(`[chat] Subscribe status: ${status}`);
    if (err) console.error("[chat] Error:", err);

    if (status === "SUBSCRIBED") {
      chatReady = true;
      maybeReady();
    }

    if (status === "TIMED_OUT") {
      console.error("[chat] Timed out before the socket finished joining.");
    }
  });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.on("line", async (line) => {
  const text = line.trim();
  if (!text) return;

  if (!chatReady) {
    console.error("[chat] Not connected yet — message not sent.");
    return;
  }

  const result = await chat.send({
    type: "broadcast",
    event: "message",
    payload: { sender: name, text, timestamp: Date.now() },
  });
  console.log(`[chat] Send result: ${result}`);
  console.log(`[you] ${text}`);
});

const shutdown = async () => {
  clearTimeout(connectionTimer);
  console.log("\n[shutdown] Disconnecting...");
  rl.close();
  await Promise.allSettled([
    supabase.removeChannel(lobby),
    supabase.removeChannel(chat),
  ]);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
