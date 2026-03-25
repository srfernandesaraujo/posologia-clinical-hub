import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalSmiles, modifiedSmiles, compoundName, originalAdmet, modifiedAdmet, userId } = await req.json();

    if (!originalSmiles || !modifiedSmiles || !originalAdmet || !modifiedAdmet) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a delta summary for each property
    const deltas = modifiedAdmet.predictions.map((mod: any) => {
      const orig = originalAdmet.predictions.find((o: any) => o.property === mod.property);
      return {
        property: mod.property,
        originalScore: orig?.score ?? null,
        modifiedScore: mod.score,
        originalRisk: orig?.risk ?? null,
        modifiedRisk: mod.risk,
        delta: orig ? mod.score - orig.score : null,
      };
    });

    const systemPrompt = `Você é um especialista em química medicinal e otimização de fármacos.
Analise as modificações estruturais realizadas em uma molécula e explique o impacto farmacológico de cada mudança.

Regras:
- Identifique quais grupos funcionais foram adicionados, removidos ou alterados comparando os SMILES
- Para cada propriedade ADMET que mudou significativamente (delta ≥ 5 pontos), explique POR QUE a modificação causou essa mudança
- Use linguagem científica mas acessível
- Seja específico sobre os mecanismos (ex: "a adição de um grupo amino aumenta a polaridade, reduzindo a penetração na BHE")
- Indique se as modificações são globalmente favoráveis ou desfavoráveis para o desenvolvimento do fármaco
- Sugira 1-2 otimizações adicionais que poderiam melhorar o perfil`;

    const userPrompt = `Composto: ${compoundName || "Desconhecido"}
SMILES Original: ${originalSmiles}
SMILES Modificado: ${modifiedSmiles}

Score Geral: ${originalAdmet.overall_score}/100 → ${modifiedAdmet.overall_score}/100

Mudanças por propriedade:
${deltas.map((d: any) => `- ${d.property}: ${d.originalScore}/100 (${d.originalRisk}) → ${d.modifiedScore}/100 (${d.modifiedRisk}) [Δ${d.delta > 0 ? "+" : ""}${d.delta}]`).join("\n")}

Meia-vida: ${originalAdmet.half_life_estimate} → ${modifiedAdmet.half_life_estimate}`;

    const { data } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "analyze_modification",
          description: "Return structured analysis of molecular modification impacts",
          parameters: {
            type: "object",
            required: ["modifications_detected", "property_impacts", "overall_assessment", "optimization_suggestions"],
            properties: {
              modifications_detected: {
                type: "array",
                description: "List of structural modifications identified",
                items: {
                  type: "object",
                  required: ["group", "action", "position_hint"],
                  properties: {
                    group: { type: "string", description: "Functional group name (ex: amino, hidroxila, metila)" },
                    action: { type: "string", enum: ["adicionado", "removido", "substituído"] },
                    position_hint: { type: "string", description: "Brief description of where in the molecule" },
                  },
                  additionalProperties: false,
                },
              },
              property_impacts: {
                type: "array",
                description: "Impact analysis for each significantly changed property",
                items: {
                  type: "object",
                  required: ["property", "direction", "explanation"],
                  properties: {
                    property: { type: "string", enum: ["absorption", "solubility", "hepatotoxicity", "mutagenicity", "bbb_penetration", "plasma_binding", "cyp_inhibition"] },
                    direction: { type: "string", enum: ["melhorou", "piorou", "estável"] },
                    explanation: { type: "string", description: "Scientific explanation of WHY this changed" },
                  },
                  additionalProperties: false,
                },
              },
              overall_assessment: {
                type: "string",
                description: "Overall assessment: is the modification favorable for drug development? 2-3 sentences in Portuguese",
              },
              optimization_suggestions: {
                type: "array",
                description: "1-2 suggestions for further optimization",
                items: {
                  type: "object",
                  required: ["suggestion", "expected_benefit"],
                  properties: {
                    suggestion: { type: "string" },
                    expected_benefit: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "analyze_modification" } },
      temperature: 0.3,
      userId: userId || undefined,
      promptType: "modification-analysis",
    });

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured analysis");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[analyze-modification]", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Limite") ? 429 : msg.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
