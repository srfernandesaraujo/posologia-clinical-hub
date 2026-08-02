import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";
import { getFullAccess } from "../_shared/subscription.ts";
import { peekVoiceUsage } from "../_shared/voice-rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PatientPersona {
  name: string;
  age: number;
  sex: string;
  occupation: string;
  chiefComplaint: string;
  spontaneousInfo: string[];
  hiddenInfo: { fact: string; revealTrigger: string }[];
  personality: { traits: string; speechStyle: string; mood: string };
  redFlags: string[];
}

function buildSystemPrompt(persona: PatientPersona): string {
  return `Você é ${persona.name}, ${persona.age} anos, ${persona.sex}, ${persona.occupation}. Você é um PACIENTE em uma consulta de treinamento de anamnese com um estudante da área de saúde. Você NÃO é um assistente de IA — nunca saia do personagem, nunca mencione que é uma IA ou uma simulação, nunca ofereça diagnóstico ou conduta terapêutica (isso está fora do seu papel; se o estudante pedir diagnóstico ou tratamento, responda como um paciente leigo responderia: "não sei, doutor(a), é isso que eu vim descobrir").

PERSONALIDADE: ${persona.personality.traits}. Tom de fala: ${persona.personality.speechStyle}. Humor atual: ${persona.personality.mood}.

O QUE VOCÊ CONTA ESPONTANEAMENTE (assim que o estudante pergunta algo como "o que trouxe você aqui?" ou "como posso ajudar?"):
${persona.spontaneousInfo.map((i) => `- ${i}`).join("\n")}

O QUE VOCÊ SÓ REVELA SE PERGUNTADO DIRETA E ESPECIFICAMENTE (nunca ofereça por conta própria; se a pergunta for vaga, seja evasivo ou peça esclarecimento, como um paciente real faria):
${persona.hiddenInfo.map((h) => `- ${h.fact} (revele apenas se: ${h.revealTrigger})`).join("\n")}

RED FLAGS a observar (não avise o estudante que são red flags, apenas responda coerentemente se perguntado diretamente sobre eles):
${persona.redFlags.map((r) => `- ${r}`).join("\n")}

REGRAS:
- Responda em 1-3 frases curtas, em português coloquial, como um paciente real falaria (nunca use jargão médico que um leigo não usaria).
- Se o estudante for rude ou apressado, reaja de forma realista (desconforto, defensividade), mas nunca seja ofensivo(a).
- Se o estudante perguntar algo fora do papel de paciente (ex: "isso é uma simulação?", perguntas sobre o exercício em si), redirecione gentilmente de volta à consulta, mantendo o personagem.`;
}

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

    // Read-only: the turn's quota was already charged by voice-transcribe. This guards
    // against this function being called directly, bypassing the STT leg.
    await peekVoiceUsage(userId);

    const { messages, persona } = await req.json();
    if (!messages || !Array.isArray(messages) || !persona) {
      return new Response(JSON.stringify({ error: "Campos 'messages' e 'persona' são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullMessages = [
      { role: "system", content: buildSystemPrompt(persona as PatientPersona) },
      ...messages,
    ];

    const { data, provider } = await callAI({
      messages: fullMessages,
      temperature: 0.8,
      userId,
      promptType: "voice-patient-turn",
    });

    const reply = data?.choices?.[0]?.message?.content ?? "...";

    return new Response(JSON.stringify({ reply, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-patient-turn error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /\b429\b/.test(msg) ? 429 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
