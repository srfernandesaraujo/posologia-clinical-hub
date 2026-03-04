import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação via chave compartilhada
    const url = new URL(req.url);
    const keyFromParam = url.searchParams.get("key");
    const keyFromHeader = req.headers.get("x-hub-metrics-key");
    const providedKey = keyFromParam || keyFromHeader;

    const expectedKey = Deno.env.get("HUB_METRICS_KEY");
    if (!expectedKey || providedKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Contar usuários totais
    const { count: totalUsers } = await supabase.auth.admin.listUsers({
      perPage: 1, page: 1,
    });

    // Contar usuários ativos (últimos 7 dias)
    let activeUsers = 0;
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: allUsers } = await supabase.auth.admin.listUsers({
      perPage: 1000, page: 1,
    });
    if (allUsers?.users) {
      activeUsers = allUsers.users.filter(
        (u) => u.last_sign_in_at && u.last_sign_in_at > sevenDaysAgo
      ).length;
    }

    const metrics = {
      total_users: totalUsers ?? (allUsers?.users?.length ?? 0),
      active_users: activeUsers,
      subscribers: 0,
      ai_requests: 0,
      ai_tokens_used: 0,
      ai_cost_usd: 0,
      revenue_usd: 0,
      mrr_usd: 0,
      collected_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hub-metrics error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
