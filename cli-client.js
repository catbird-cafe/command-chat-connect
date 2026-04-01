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

console.log(`[init] Client name: "${name}"`);
console.log(`[init] Supabase URL: ${SUPABASE_URL}`);
console.log(`[init] Connecting...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Join lobby with presence
const lobby = supabase.channel("chat-lobby", {
  config: { presence: { key: "lobby" } },
});

lobby
  .on("presence", { event: "sync" }, () => {
    const state = lobby.presenceState();
    const count = Object.values(state).flat().length;
    console.log(`[lobby] Presence sync — ${count} user(s) in lobby`);
  })
  .on("presence", { event: "join" }, ({ newPresences }) => {
    for (const p of newPresences) {
      console.log(`[lobby] Join: ${p.name || "unknown"}`);
    }
  })
  .on("presence", { event: "leave" }, ({ leftPresences }) => {
    for (const p of leftPresences) {
      console.log(`[lobby] Leave: ${p.name || "unknown"}`);
    }
  })
  .subscribe(async (status, err) => {
    console.log(`[lobby] Subscribe status: ${status}`);
    if (err) console.error(`[lobby] Error:`, err);
    if (status === "SUBSCRIBED") {
      const trackResult = await lobby.track({ name, type: "cli" });
      console.log(`[lobby] Track result: ${trackResult}`);
      console.log(`✓ Connected as "${name}". Waiting for messages...`);
    }
  });

// Join personal chat channel
const chat = supabase.channel(`chat:${name}`);
chat
  .on("broadcast", { event: "message" }, ({ payload }) => {
    console.log(`[${payload.sender}] ${payload.text}`);
  })
  .subscribe((status, err) => {
    console.log(`[chat] Subscribe status: ${status}`);
    if (err) console.error(`[chat] Error:`, err);
  });

// Read stdin for outgoing messages
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (line.trim()) {
    chat.send({
      type: "broadcast",
      event: "message",
      payload: { sender: name, text: line.trim(), timestamp: Date.now() },
    });
    console.log(`[you] ${line.trim()}`);
  }
});
