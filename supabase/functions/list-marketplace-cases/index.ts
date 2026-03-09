import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { search } = await req.json().catch(() => ({ search: null }));

    let query = supabaseAdmin
      .from("simulator_cases")
      .select("id, title, difficulty, simulator_slug, created_by, created_at, is_marketplace")
      .eq("is_marketplace", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeof search === "string" && search.trim().length > 0) {
      const q = search.trim();
      query = query.or(`title.ilike.%${q}%,simulator_slug.ilike.%${q}%`);
    }

    const { data: cases, error } = await query;
    if (error) throw error;

    const authorIds = [...new Set((cases || []).map((c: any) => c.created_by).filter(Boolean))];

    let authorMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", authorIds);

      authorMap = (profiles || []).reduce((acc: Record<string, string>, profile: any) => {
        acc[profile.user_id] = profile.full_name || "Usuário";
        return acc;
      }, {});
    }

    const enriched = (cases || []).map((caseItem: any) => ({
      ...caseItem,
      author_name: caseItem.created_by ? (authorMap[caseItem.created_by] || "Usuário") : "Sistema",
    }));

    return new Response(JSON.stringify({ cases: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar casos do marketplace";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
