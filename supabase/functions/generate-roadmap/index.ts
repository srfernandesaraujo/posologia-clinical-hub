import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { existingTitles = [], categories = [] } = await req.json();

    const systemPrompt = `Você é um consultor de produto para uma plataforma educacional de saúde chamada MedToolForge. A plataforma já possui:
- Calculadoras clínicas (risco cardiovascular, doses, escores)
- Simuladores interativos (farmácia clínica, fisiologia, bioquímica, farmacologia, farmacotécnica, química farmacêutica, docência, odontologia, fisioterapia, nutrição)
- Laboratório Virtual (bancadas de pesquisa, modelagem molecular, toxicologia, forense)
- Jogos Clínicos educacionais gamificados
- Salas Virtuais com PIN para atividades em grupo
- MedView 3D com modelos anatômicos
- Marketplace de ferramentas e gamificação com pontos/badges
- Pipeline de atualizações

Categorias disponíveis: ${categories.join(", ")}

Funcionalidades já existentes ou planejadas:
${existingTitles.map((t: string) => `- ${t}`).join("\n")}

Gere exatamente 7 sugestões de novas funcionalidades altamente relevantes que ainda NÃO existem. Cada uma deve ser inovadora, prática e agregar muito valor para estudantes e professores da área da saúde.

Responda APENAS com um JSON array no formato:
[{"title":"...","description":"...","category":"...","priority":"high|medium|critical"}]

Sem markdown, sem explicações, apenas o JSON.`;

    const { data } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Gere 7 sugestões de roadmap para os próximos 30 dias." },
      ],
      temperature: 0.8,
    });

    const content = data?.choices?.[0]?.message?.content || "";
    let ideas = [];
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      ideas = JSON.parse(cleaned);
    } catch {
      console.error("[ROADMAP] Failed to parse AI response:", content);
      ideas = [];
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ROADMAP] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
