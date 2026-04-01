import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-relay-client-id",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Expected paths: /relay/send, /relay/listen, /relay/presence
  const action = pathParts[pathParts.length - 1];

  const clientId = req.headers.get("x-relay-client-id") || url.searchParams.get("client_id");

  if (!clientId) {
    return new Response(JSON.stringify({ error: "Missing client_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST /relay/send — send a message via broadcast
  if (req.method === "POST" && action === "send") {
    try {
      const body = await req.json();
      const channel = supabase.channel(`chat:${clientId}`);

      // Subscribe briefly to send
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          else if (status === "CHANNEL_ERROR") reject(new Error("Channel error"));
        });
      });

      await channel.send({
        type: "broadcast",
        event: "message",
        payload: {
          sender: body.sender || clientId,
          text: body.text,
          timestamp: new Date().toISOString(),
        },
      });

      await supabase.removeChannel(channel);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to send message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // GET /relay/listen — SSE stream of messages for this client
  if (req.method === "GET" && action === "listen") {
    const channel = supabase.channel(`chat:${clientId}`);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Send a heartbeat every 15s to keep connection alive
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);

        channel
          .on("broadcast", { event: "message" }, (payload) => {
            sendEvent(payload.payload);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              sendEvent({ type: "connected", client_id: clientId });
            }
          });

        // Clean up on client disconnect
        req.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          supabase.removeChannel(channel);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // POST /relay/presence — join/track presence in lobby
  if (req.method === "POST" && action === "presence") {
    try {
      const body = await req.json();
      const lobby = supabase.channel("chat-lobby");

      await new Promise<void>((resolve, reject) => {
        lobby.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
          else if (status === "CHANNEL_ERROR") reject(new Error("Channel error"));
        });
      });

      await lobby.track({
        client_id: clientId,
        name: body.name || clientId,
        online_at: new Date().toISOString(),
      });

      // Keep presence alive for 30s then clean up
      // (In production, the client would periodically POST to keep alive)
      setTimeout(async () => {
        await lobby.untrack();
        await supabase.removeChannel(lobby);
      }, 30000);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to track presence" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action", valid: ["send", "listen", "presence"] }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
