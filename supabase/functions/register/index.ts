import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRecord, error: fetchError } = await supabase
      .from("client_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRecord.token_type === "one_time" && tokenRecord.used) {
      return new Response(JSON.stringify({ error: "Token already used" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRecord.token_type === "expiry" && tokenRecord.expires_at) {
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const clientId = crypto.randomUUID().slice(0, 8);

    await supabase
      .from("client_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
        client_id: clientId,
      })
      .eq("id", tokenRecord.id);

    // Clean response: ws info for direct connection + relay for HTTP fallback
    return new Response(
      JSON.stringify({
        client_id: clientId,
        ws: {
          url: supabaseUrl,
          key: anonKey,
          channels: {
            lobby: "chat-lobby",
            direct: `chat:${clientId}`,
          },
        },
        relay: `${supabaseUrl}/functions/v1/relay`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});