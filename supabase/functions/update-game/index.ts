import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gameId, aiPrompt, userPrompt } = await req.json();

    if (!gameId || !aiPrompt) {
      return new Response(JSON.stringify({ error: "gameId e aiPrompt são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalPrompt = userPrompt 
      ? `O utilizador pediu a seguinte melhoria para o jogo "${gameId}": "${userPrompt}"\n\nUse como base a estrutura de dados do jogo descrita abaixo e adapte conforme o pedido do utilizador:\n\n${aiPrompt}`
      : aiPrompt;

    const { data } = await callAI({
      messages: [
        {
          role: "system",
          content: `Você é um especialista em farmácia clínica, medicina e desenvolvimento de jogos educacionais. 
Gere conteúdo novo, criativo e clinicamente preciso para jogos clínicos educativos.
RETORNE APENAS UM JSON VÁLIDO, sem markdown, sem blocos de código, sem explicações.
O JSON deve ser um objeto com os campos específicos solicitados.
Adapte o conteúdo conforme a instrução do utilizador, mantendo a estrutura de dados compatível com o jogo.
Seed de aleatoriedade: ${Math.floor(Math.random() * 100000)}.`
        },
        { role: "user", content: finalPrompt },
      ],
      temperature: 1.1,
      model: "google/gemini-3-flash-preview",
    });

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("IA não retornou conteúdo");

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const gameData = JSON.parse(jsonStr);

    return new Response(JSON.stringify({ gameData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-game error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
