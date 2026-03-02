import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId, limit = 20 } = await req.json();
    if (!gameId) {
      return new Response(JSON.stringify({ error: "gameId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const source = `game:${gameId}`;

    const { data: pointsRows, error: pointsError } = await admin
      .from("student_points")
      .select("user_id, points")
      .eq("source", source);

    if (pointsError) throw pointsError;

    const totalsByUser = new Map<string, number>();
    (pointsRows || []).forEach((row) => {
      totalsByUser.set(row.user_id, (totalsByUser.get(row.user_id) || 0) + (row.points || 0));
    });

    const userIds = Array.from(totalsByUser.keys());
    let namesByUser: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      (profiles || []).forEach((profile) => {
        namesByUser[profile.user_id] = profile.full_name || "Jogador";
      });
    }

    const ranking = Array.from(totalsByUser.entries())
      .map(([user_id, total_points]) => ({
        user_id,
        total_points,
        full_name: namesByUser[user_id] || "Jogador",
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, Math.max(1, Math.min(Number(limit) || 20, 100)));

    return new Response(JSON.stringify({ ranking }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("game-ranking error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
