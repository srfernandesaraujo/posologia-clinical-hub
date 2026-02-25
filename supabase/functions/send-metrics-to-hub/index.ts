import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-METRICS] Starting metrics collection...");

    const hubServiceKey = Deno.env.get("HUB_SERVICE_KEY");
    const hubServiceId = Deno.env.get("HUB_SERVICE_ID");
    if (!hubServiceKey || !hubServiceId) {
      throw new Error("HUB_SERVICE_KEY or HUB_SERVICE_ID not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Total users
    const { count: totalUsers, error: usersErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (usersErr) throw new Error(`profiles count: ${usersErr.message}`);

    // Active users (updated_at in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers, error: activeErr } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", thirtyDaysAgo);
    if (activeErr) throw new Error(`active users: ${activeErr.message}`);

    // AI-generated cases today (proxy for AI requests)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count: aiRequests, error: aiErr } = await supabase
      .from("simulator_cases")
      .select("*", { count: "exact", head: true })
      .eq("is_ai_generated", true)
      .gte("created_at", todayStart.toISOString());
    if (aiErr) throw new Error(`ai requests: ${aiErr.message}`);

    const payload = {
      service_id: hubServiceId,
      total_users: totalUsers ?? 0,
      active_users: activeUsers ?? 0,
      subscribers: 0,
      ai_requests: aiRequests ?? 0,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
      revenue_usd: 0,
      mrr_usd: 0,
    };

    console.log("[SEND-METRICS] Payload:", JSON.stringify(payload));

    const hubRes = await fetch(
      "https://slmnpcabhjsqithkmkxn.supabase.co/functions/v1/report-metrics",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": hubServiceKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const hubBody = await hubRes.text();
    if (!hubRes.ok) {
      throw new Error(`Hub responded ${hubRes.status}: ${hubBody}`);
    }

    console.log("[SEND-METRICS] Success:", hubBody);

    return new Response(JSON.stringify({ success: true, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SEND-METRICS] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
