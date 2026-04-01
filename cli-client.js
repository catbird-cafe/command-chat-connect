#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const readline = require("readline");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const name = process.argv[2];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !name) {
  console.error("Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node cli-client.js <name>");
  process.exit(1);
}

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
    console.log(`✓ Connected as "${name}". Waiting for messages...`);
  }
};

supabase.realtime.onOpen(() => {
  console.log("[socket] open");
});

supabase.realtime.onClose((event) => {
  console.log("[socket] close", event ?? "");
});

supabase.realtime.onError((error) => {
  console.error("[socket] error", error);
});

const connectionTimer = setTimeout(() => {
  if (lobbyReady && chatReady) return;

  console.error("[diag] Realtime connection timed out.");
  console.error("[diag] If this is using native WebSocket, try: npm install @supabase/supabase-js ws");
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

