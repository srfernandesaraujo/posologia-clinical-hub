import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const PUBLIC_BASE = "https://simulador.posologia.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    const format = (url.searchParams.get("format") || "json").toLowerCase();
    const maxwidth = parseInt(url.searchParams.get("maxwidth") || "800", 10);
    const maxheight = parseInt(url.searchParams.get("maxheight") || "600", 10);

    if (!target) {
      return new Response(JSON.stringify({ error: "missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format !== "json") {
      return new Response("Only JSON format supported", {
        status: 501,
        headers: { ...corsHeaders },
      });
    }

    // Extract token from embed URL: https://simulador.posologia.app/embed/<token>
    const match = target.match(/\/embed\/([^/?#]+)/);
    if (!match) {
      return new Response(JSON.stringify({ error: "url not embeddable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = match[1];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: share } = await supabase
      .from("shared_tools")
      .select("is_active, tools(name, short_description)")
      .eq("share_token", token)
      .maybeSingle();

    if (!share || !share.is_active) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tool = (share.tools as { name?: string; short_description?: string } | null) || {};
    const title = tool.name || "Ferramenta Clínica";
    const embedUrl = `${PUBLIC_BASE}/embed/${token}`;
    const width = Math.min(maxwidth, 800);
    const height = Math.min(maxheight, 600);

    const html = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="clipboard-write" style="border-radius:12px;border:1px solid #e5e7eb;"></iframe>`;

    const payload = {
      version: "1.0",
      type: "rich",
      provider_name: "Posologia Clinical Hub",
      provider_url: PUBLIC_BASE,
      title,
      html,
      width,
      height,
      cache_age: 86400,
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
