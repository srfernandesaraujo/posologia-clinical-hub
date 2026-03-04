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
  milionario: ["contexts"],
  domino: ["tiles"],
  carreira: ["board", "chestCards"],
  plantao: ["prontuario", "book", "computerPassword", "safeCode"],
  clearance: ["patientInfo", "labResults", "doses"],
  "alerta-vermelho": ["patientInfo", "currentMeds", "availableTests", "correctMedId"],
  janela: ["drugName", "parameterName", "targetMin", "targetMax"],
  labirinto: ["storyNodes"],
  bolsa: ["biomarkers", "historyData"],
};

// Specialized system prompts per game type for precise AI updates
const gameSpecialistPrompts: Record<string, string> = {
  milionario: `Você é um especialista no jogo "Milionário da Farmacologia", um quiz clínico estilo "Quem Quer Ser Milionário".

ESTRUTURA DO JOGO:
- O jogo possui CONTEXTOS CLÍNICOS (ex: Diabetes, Hipertensão, Antibióticos, Psicofarmacologia, Dor).
- Cada contexto tem exatamente 15 perguntas com dificuldade progressiva.
- Os níveis de dificuldade são: "Interno" (perguntas 1-3), "Residente Júnior" (4-6), "Residente Sênior" (7-9), "Especialista" (10-12), "Chefe de Clínica" (13-15).

FORMATO OBRIGATÓRIO:
{
  "contexts": [
    {
      "id": "slug-unico",
      "label": "Nome do Contexto",
      "icon": "emoji",
      "questions": [
        {
          "id": 1,
          "levelName": "Interno",
          "question": "Cenário clínico realista e detalhado",
          "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
          "correctIndex": 0,
          "hint": "Dica educativa do preceptor",
          "audienceVotes": [65, 15, 12, 8]
        }
      ]
    }
  ]
}

REGRAS:
- Cada contexto DEVE ter exatamente 15 perguntas
- audienceVotes deve ser array de 4 números que somam ~100, com o maior valor no correctIndex
- As perguntas devem usar cenários clínicos REALISTAS com pacientes
- As opções erradas devem ser plausíveis (não absurdas)
- A dificuldade deve crescer progressivamente
- Cada hint deve ser EDUCATIVO, ajudando o aluno a raciocinar`,

  "rpg-tcc": `Você é um especialista no jogo "RPG do TCC Farmacêutico", um RPG por turnos com batalhas clínicas.

ESTRUTURA: O jogo tem "battles" — array de batalhas onde cada uma possui inimigo (doença/condição), ataques disponíveis (intervenções farmacêuticas), e desfechos clínicos.

REGRAS:
- Cada batalha deve ter cenário clínico realista
- Os ataques devem ser intervenções farmacêuticas reais
- Os desfechos devem ser clinicamente corretos`,

  "vila-saude": `Você é um especialista no jogo "Vila da Saúde", um jogo de gestão de farmácia comunitária.

ESTRUTURA: O jogo tem "medications" (lista de medicamentos com propriedades) e "buildings" (estruturas da vila).

REGRAS:
- Medicamentos devem ser reais com nomes genéricos
- As propriedades farmacológicas devem ser corretas`,

  laboratorio: `Você é um especialista no jogo "Laboratório de Interações", um jogo sobre interações medicamentosas.

ESTRUTURA: O jogo tem "items" (fármacos/substâncias) e "interactions" (pares de interações com tipo e descrição).

REGRAS:
- Interações devem ser clinicamente relevantes e documentadas
- Descreva mecanismo, severidade e conduta`,

  detetive: `Você é um especialista no jogo "Detetive Histórico", um quiz sobre história da farmacologia.

ESTRUTURA: O jogo tem "questions" — perguntas históricas sobre descobertas farmacológicas.

REGRAS:
- Fatos devem ser historicamente corretos
- Inclua datas, cientistas e contexto da descoberta`,

  resseccao: `Você é um especialista no jogo "Ressecção Oncológica" (Resta 1).

ESTRUTURA: O jogo tem "board" — array 7x7 onde null=fora, 0=vazio, 1=célula tumoral, em formato de cruz.

REGRAS:
- O tabuleiro deve ser solucionável
- A posição vazia pode variar`,

  domino: `Você é um especialista no jogo "Dominó Clínico" sobre cascata prescritiva.

ESTRUTURA: O jogo tem "tiles" (peças com left/right), "diseases" e "drugs" (para coloração).

REGRAS:
- A cascata deve seguir: Doença → Fármaco → Efeito Adverso → Novo Fármaco
- Use cascatas prescritivas reais e documentadas`,

  carreira: `Você é um especialista no jogo "Carreira Clínica", um jogo de tabuleiro estilo banco imobiliário clínico.

ESTRUTURA: O jogo tem "board" (casas do tabuleiro) e "chestCards" (cartas de sorte/revés).

REGRAS:
- As casas devem representar situações clínicas reais
- Os eventos devem ser educativos`,

  plantao: `Você é um especialista no jogo "Plantão Noturno", um escape room hospitalar.

ESTRUTURA: O jogo tem "prontuario", "book", "computerPassword" e "safeCode".

REGRAS:
- Os enigmas devem ser baseados em farmacologia clínica
- As pistas devem ser logicamente conectadas`,

  clearance: `Você é um especialista no jogo "Gestor de Clearance", sobre ajuste de dose renal.

ESTRUTURA: O jogo tem "patientInfo", "labResults" e "doses".

REGRAS:
- Use dados laboratoriais realistas
- Os cálculos de clearance devem ser corretos`,

  "alerta-vermelho": `Você é um especialista no jogo "Alerta Vermelho", sobre RAM (Reações Adversas a Medicamentos).

ESTRUTURA: O jogo tem "patientInfo", "currentMeds", "availableTests" e "correctMedId".

REGRAS:
- As RAMs devem ser clinicamente documentadas
- O raciocínio diagnóstico deve ser seguido passo a passo`,

  janela: `Você é um especialista no jogo "Janela Terapêutica", sobre TDM (Monitorização Terapêutica).

ESTRUTURA: O jogo tem "drugName", "parameterName", "targetMin" e "targetMax".

REGRAS:
- Use faixas terapêuticas reais baseadas em guidelines
- Inclua fármacos que realmente requerem TDM`,

  labirinto: `Você é um especialista no jogo "Labirinto do Hemograma", uma aventura baseada em decisões clínicas.

ESTRUTURA: O jogo tem "storyNodes" — nós narrativos com decisões clínicas.

REGRAS:
- As decisões devem ser farmacologicamente corretas
- Os desfechos devem refletir consequências clínicas reais`,

  bolsa: `Você é um especialista no jogo "Bolsa Metabólica", sobre monitorização de biomarcadores.

ESTRUTURA: O jogo tem "biomarkers" e "historyData".

REGRAS:
- Use biomarcadores reais com faixas de referência corretas
- As tendências devem ser clinicamente significativas`,
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
    if (JSON.stringify(nextData?.[key]) !== JSON.stringify(currentData?.[key])) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requiredKeys = requiredKeysByGame[gameId] || [];

    // Use specialized prompt if available, otherwise generic
    const specialistPrompt = gameSpecialistPrompts[gameId] || "";

    const baseInstruction = userPrompt
      ? `PEDIDO DO UTILIZADOR: "${userPrompt}"\n\nVocê DEVE seguir esta instrução com precisão. Analise o que o utilizador pede e implemente exatamente.`
      : `Atualize o conteúdo padrão do jogo "${gameId}" com novos dados.`;

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
              content: `${specialistPrompt}

INSTRUÇÕES TÉCNICAS:
- RETORNE APENAS JSON VÁLIDO (sem markdown, sem texto antes/depois, sem comentários).
- Tipo de atualização: ${updateType === "major" ? "GRANDE (mude significativamente o conteúdo)" : "INCREMENTAL (melhore/ajuste o conteúdo existente)"}.
- ${formatInstruction}
- SIGA RIGOROSAMENTE o pedido do utilizador. Se ele pede algo específico, faça EXATAMENTE isso.
- Mantenha a estrutura de dados intacta — apenas modifique o conteúdo conforme solicitado.
- Seed: ${Math.floor(Math.random() * 100000)}.`,
            },
            {
              role: "user",
              content: `${baseInstruction}

ESTRUTURA BASE DO JOGO (referência de formato):
${aiPrompt}

DADOS ATUAIS DO JOGO:
${JSON.stringify(currentData)}

IMPORTANTE: Siga o pedido do utilizador com precisão. Retorne APENAS o JSON atualizado.`,
            },
          ],
          temperature: 0.8,
          model: "google/gemini-3-flash-preview",
        });

        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error("IA não retornou conteúdo");

        const parsed = parseModelJson(content);
        if (!parsed || typeof parsed !== "object") throw new Error("Formato inválido");

        const missingRequired = requiredKeys.filter((key) => !(key in parsed));
        if (missingRequired.length > 0) throw new Error(`Faltam campos: ${missingRequired.join(", ")}`);

        if (!hasMeaningfulChange(parsed, currentData)) throw new Error("Sem alterações efetivas");

        gameData = parsed;
        break;
      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError.message : "Erro ao processar";
        console.warn(`[update-game] tentativa ${attempt} falhou:`, lastError);
      }
    }

    if (!gameData) throw new Error(`Não foi possível aplicar a atualização: ${lastError}`);

    return new Response(JSON.stringify({ gameData, updateType }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-game error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
