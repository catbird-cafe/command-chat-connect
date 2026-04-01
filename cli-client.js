#!/usr/bin/env node
const { createClient } = require("@supabase/supabase-js");
const readline = require("node:readline");
const fs = require("node:fs");
const path = require("node:path");

const CREDS_FILE = path.join(process.env.HOME || ".", ".chat-client-creds.json");

function resolveTransport() {
  try {
    const ws = require("ws");
    return ws;
  } catch {
    if (typeof WebSocket !== "undefined") return WebSocket;
    console.error("No WebSocket transport. Run: npm install ws");
    process.exit(1);
  }
}

async function getCredentials() {
  if (fs.existsSync(CREDS_FILE)) {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    console.log(`[init] Using saved credentials (client: ${creds.client_id})`);
    return creds;
  }

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
  const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, client_id: name, supabase_url, supabase_anon_key } = creds;
  const finalUrl = SUPABASE_URL || supabase_url;
  const finalKey = SUPABASE_ANON_KEY || supabase_anon_key;

  const transport = resolveTransport();
  console.log(`[init] Client: "${name}"`);
  console.log("[init] Connecting...");

  const supabase = createClient(finalUrl, finalKey, {
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
      console.log(`✓ Connected as "${name}". Type a message and press Enter.`);
    }
  };

  const connectionTimer = setTimeout(() => {
    if (lobbyReady && chatReady) return;
    console.error("[diag] Connection timed out. Check network/firewall.");
  }, 12000);

  const lobby = supabase.channel("chat-lobby", {
    config: { presence: { key: `cli:${name}` } },
  });

  lobby
    .on("presence", { event: "sync" }, () => {
      const count = Object.values(lobby.presenceState()).flat().length;
      console.log(`[lobby] ${count} participant(s)`);
    })
    .on("presence", { event: "join" }, ({ newPresences }) => {
      for (const p of newPresences) console.log(`[lobby] Join: ${p.name || "unknown"}`);
    })
    .on("presence", { event: "leave" }, ({ leftPresences }) => {
      for (const p of leftPresences) console.log(`[lobby] Leave: ${p.name || "unknown"}`);
    })
    .subscribe(async (status, err) => {
      if (err) console.error("[lobby] Error:", err);
      if (status === "SUBSCRIBED") {
        lobbyReady = true;
        await lobby.track({ name, type: "cli", joinedAt: new Date().toISOString() });
        maybeReady();
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
      if (err) console.error("[chat] Error:", err);
      if (status === "SUBSCRIBED") {
        chatReady = true;
        maybeReady();
      }
    });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) return;
    if (!chatReady) {
      console.error("[chat] Not connected yet.");
      return;
    }
    await chat.send({
      type: "broadcast",
      event: "message",
      payload: { sender: name, text, timestamp: Date.now() },
    });
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
}

main().catch((err) => {
  console.error("[init] Fatal:", err.message);
  process.exit(1);
});
