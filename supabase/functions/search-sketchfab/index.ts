import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SKETCHFAB_API_KEY = Deno.env.get('SKETCHFAB_API_KEY');
    if (!SKETCHFAB_API_KEY) {
      throw new Error('SKETCHFAB_API_KEY is not configured');
    }

    const { query, count = 8, categories } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({
      q: query,
      type: 'models',
      downloadable: 'false',
      count: String(count),
      sort_by: '-relevance',
    });

    if (categories) {
      params.set('categories', categories);
    }

    const response = await fetch(
      `https://api.sketchfab.com/v3/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Token ${SKETCHFAB_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sketchfab API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();

    // Extract only the fields we need
    const models = (data.results || []).map((result: any) => ({
      uid: result.uid,
      name: result.name,
      description: result.description?.substring(0, 200) || '',
      thumbnailUrl: result.thumbnails?.images?.[0]?.url || '',
      viewerUrl: result.viewerUrl || '',
      isDownloadable: result.isDownloadable || false,
      user: result.user?.displayName || '',
      viewCount: result.viewCount || 0,
      likeCount: result.likeCount || 0,
    }));

    return new Response(JSON.stringify({ models, totalCount: data.totalCount || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error searching Sketchfab:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
