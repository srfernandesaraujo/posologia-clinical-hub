import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchSketchfab(
  apiKey: string,
  query: string,
  count: number,
  categories?: string,
) {
  const params = new URLSearchParams({
    q: query,
    type: "models",
    downloadable: "false",
    count: String(count),
    sort_by: "-relevance",
  });

  if (categories) {
    params.set("categories", categories);
  }

  const response = await fetch(`https://api.sketchfab.com/v3/search?${params.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sketchfab API error [${response.status}]: ${errorText}`);
  }

  return await response.json();
}

function buildQueryCandidates(rawQuery: string) {
  const normalized = rawQuery.trim().replace(/\s+/g, " ");
  const simplified = normalized
    .replace(/\b(cone\s*beam|cbct|ct|tomografia|avaliacao|planejamento|procedimento)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const firstThree = normalized.split(" ").slice(0, 3).join(" ").trim();
  const firstTwo = normalized.split(" ").slice(0, 2).join(" ").trim();

  return Array.from(new Set([normalized, simplified, firstThree, firstTwo].filter((q) => q.length >= 3)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SKETCHFAB_API_KEY = Deno.env.get("SKETCHFAB_API_KEY");
    if (!SKETCHFAB_API_KEY) {
      throw new Error("SKETCHFAB_API_KEY is not configured");
    }

    const { query, count = 8, categories } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const queryCandidates = buildQueryCandidates(query);
    let data: any = null;

    for (const candidate of queryCandidates) {
      const candidateData = await fetchSketchfab(SKETCHFAB_API_KEY, candidate, count, categories);
      if (!data) data = candidateData;

      if ((candidateData.results || []).length > 0) {
        data = candidateData;
        break;
      }
    }

    const models = (data?.results || []).map((result: any) => ({
      uid: result.uid,
      name: result.name,
      description: result.description?.substring(0, 200) || "",
      thumbnailUrl: result.thumbnails?.images?.[0]?.url || "",
      viewerUrl: result.viewerUrl || "",
      isDownloadable: result.isDownloadable || false,
      user: result.user?.displayName || "",
      viewCount: result.viewCount || 0,
      likeCount: result.likeCount || 0,
    }));

    const totalCount = data?.totalCount ?? data?.total ?? models.length;

    return new Response(JSON.stringify({ models, totalCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error searching Sketchfab:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
