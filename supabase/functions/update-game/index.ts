import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const requiredKeysByGame: Record<string, string[]> = {
  "rpg-tcc": ["battles"],
  "vila-saude": ["medications", "buildings"],
  "laboratorio": ["items", "interactions"],
  detetive: ["questions"],
  resseccao: ["board"],
  milionario: ["questions"],
  domino: ["tiles"],
  carreira: ["board", "chestCards"],
  plantao: ["prontuario", "book", "computerPassword", "safeCode"],
  clearance: ["patientInfo", "labResults", "doses"],
  "alerta-vermelho": ["patientInfo", "currentMeds", "availableTests", "correctMedId"],
  janela: ["drugName", "parameterName", "targetMin", "targetMax"],
  labirinto: ["storyNodes"],
  bolsa: ["biomarkers", "historyData"],
};

function parseModelJson(content: string) {
  let jsonStr = content.trim();

  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  return JSON.parse(jsonStr);
}

function hasMeaningfulChange(nextData: Record<string, unknown>, currentData: Record<string, unknown> | null) {
  if (!currentData) return true;

  const keys = new Set([...Object.keys(nextData || {}), ...Object.keys(currentData || {})]);
  for (const key of keys) {
    if (JSON.stringify(nextData?.[key]) !== JSON.stringify(currentData?.[key])) {
      return true;
    }
  }

  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gameId, aiPrompt, userPrompt, updateType = "incremental", currentData = null } = await req.json();

    if (!gameId || !aiPrompt) {
      return new Response(JSON.stringify({ error: "gameId e aiPrompt são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requiredKeys = requiredKeysByGame[gameId] || [];
    const baseInstruction = userPrompt
      ? `Pedido do utilizador para o jogo "${gameId}": "${userPrompt}"`
      : `Atualize o conteúdo padrão do jogo "${gameId}".`;

    const formatInstruction = requiredKeys.length > 0
      ? `Campos obrigatórios no JSON final: ${requiredKeys.join(", ")}.`
      : "Retorne um objeto JSON compatível com o jogo.";

    let gameData: Record<string, unknown> | null = null;
    let lastError = "Erro desconhecido";

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data } = await callAI({
          messages: [
            {
              role: "system",
              content: `Você é especialista em criação de conteúdo para jogos clínicos educativos.
RETORNE APENAS JSON VÁLIDO (sem markdown, sem texto extra).
Sempre mantenha compatibilidade com a estrutura do jogo.
Tipo de atualização: ${updateType === "major" ? "GRANDE" : "INCREMENTAL"}.
${formatInstruction}
Se o utilizador pedir novas fases/personagens/enredo, implemente no conteúdo final sem remover os campos obrigatórios.
Seed de aleatoriedade: ${Math.floor(Math.random() * 100000)}.`,
            },
            {
              role: "user",
              content: `${baseInstruction}\n\nEstrutura base do jogo:\n${aiPrompt}\n\nDados atuais do jogo (se existir): ${JSON.stringify(currentData)}`,
            },
          ],
          temperature: 1,
          model: "google/gemini-3-flash-preview",
        });

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("IA não retornou conteúdo");

        const parsed = parseModelJson(content);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("A IA retornou um formato inválido");
        }

        const missingRequired = requiredKeys.filter((key) => !(key in parsed));
        if (missingRequired.length > 0) {
          throw new Error(`Faltam campos obrigatórios: ${missingRequired.join(", ")}`);
        }

        if (!hasMeaningfulChange(parsed, currentData)) {
          throw new Error("A IA retornou dados sem alterações efetivas");
        }

        gameData = parsed;
        break;
      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError.message : "Erro ao processar atualização";
        console.warn(`[update-game] tentativa ${attempt} falhou:`, lastError);
      }
    }

    if (!gameData) {
      throw new Error(`Não foi possível aplicar a atualização: ${lastError}`);
    }

    return new Response(JSON.stringify({ gameData, updateType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-game error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

