import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";
import { getFullAccess } from "../_shared/subscription.ts";
import { checkAndIncrementVoiceUsage } from "../_shared/voice-rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um avaliador de habilidades de anamnese e comunicação clínica. Vai receber a transcrição completa de uma entrevista entre um estudante (role "user") e um paciente simulado (role "assistant"), além da ficha completa da persona do paciente (incluindo o que era "hiddenInfo" — fatos que só deveriam ser revelados se perguntados especificamente).

Sua tarefa é avaliar OBJETIVAMENTE a técnica de entrevista do estudante — NÃO avalie se ele "diagnosticou certo", pois este exercício é sobre CONDUÇÃO DA ENTREVISTA, não sobre decisão clínica.

Para cada item em "rubricFocus" da persona, determine se o estudante demonstrou essa competência ao longo da conversa (perguntas abertas, investigação de detalhes, sensibilidade ao abordar temas delicados, etc.). Para cada item em "hiddenInfo", determine se o estudante conseguiu extrair aquele fato através de uma pergunta adequada (não conta se o paciente ofereceu voluntariamente).

Gere sempre via tool calling usando "submit_evaluation". O score deve refletir a proporção de competências/fatos cobertos, ponderada pela qualidade das perguntas (perguntas abertas e específicas pesam mais que perguntas genéricas). Seja justo mas rigoroso — um estudante que fez poucas perguntas genéricas não deve receber nota alta mesmo que o paciente tenha voluntariado informação.`;

const tools = [
  {
    type: "function",
    function: {
      name: "submit_evaluation",
      description: "Submit the structured evaluation of a student's anamnesis interview",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number", description: "0-100" },
          rubricItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                competency: { type: "string" },
                category: { type: "string" },
                covered: { type: "boolean" },
                note: { type: "string" },
              },
              required: ["competency", "category", "covered", "note"],
            },
          },
          narrativeFeedback: { type: "string", description: "2-4 parágrafos, tom formativo, em português" },
        },
        required: ["score", "rubricItems", "narrativeFeedback"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    if (!(await getFullAccess(userId))) {
      return new Response(JSON.stringify({ error: "Paciente-IA por Voz é um recurso exclusivo do plano Premium." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Closing the interview is also a paid call — counts as one more turn against the same daily cap.
    await checkAndIncrementVoiceUsage(userId);

    const { transcript, persona } = await req.json();
    if (!transcript || !Array.isArray(transcript) || !persona) {
      return new Response(JSON.stringify({ error: "Campos 'transcript' e 'persona' são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextMsg = `## FICHA DO PACIENTE SIMULADO (uso interno de avaliação, o estudante não teve acesso a isso)
${JSON.stringify(persona, null, 2)}

## TRANSCRIÇÃO DA ENTREVISTA
${JSON.stringify(transcript, null, 2)}`;

    const { data, provider } = await callAI({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextMsg },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "submit_evaluation" } },
      temperature: 0.3,
      userId,
      promptType: "voice-patient-eval",
    });

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta de avaliação inválida (sem tool call)");

    const evaluation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ...evaluation, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-patient-eval error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /\b429\b/.test(msg) ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
