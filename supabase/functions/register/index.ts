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

    // Find the token
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

    // Check if already used (one_time)
    if (tokenRecord.token_type === "one_time" && tokenRecord.used) {
      return new Response(JSON.stringify({ error: "Token already used" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (tokenRecord.token_type === "expiry" && tokenRecord.expires_at) {
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Generate a client_id
    const clientId = crypto.randomUUID().slice(0, 8);

    // Mark token as used
    await supabase
      .from("client_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
        client_id: clientId,
      })
      .eq("id", tokenRecord.id);

    return new Response(
      JSON.stringify({
        client_id: clientId,
        supabase_url: supabaseUrl,
        supabase_anon_key: anonKey,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
