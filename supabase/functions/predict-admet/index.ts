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
    const { smiles, compoundName, userId } = await req.json();

    if (!smiles) {
      return new Response(JSON.stringify({ error: "SMILES is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um sistema especialista em predição ADMET (Absorção, Distribuição, Metabolismo, Excreção e Toxicidade) de moléculas.
Analise a estrutura molecular fornecida em notação SMILES e retorne predições baseadas em regras farmacológicas conhecidas e padrões estruturais.

Critérios de avaliação (score 0-100, onde 100 = melhor):
- absorption: Absorção oral estimada (baseada em Lipinski, PSA, solubilidade)
- solubility: Solubilidade aquosa (baseada em LogP, grupos polares)
- hepatotoxicity: Risco de hepatotoxicidade (100 = sem risco, 0 = alto risco)
- mutagenicity: Risco de mutagenicidade (100 = sem risco, 0 = alto risco) — considere alertas estruturais de Benigni/Bossa
- bbb_penetration: Penetração na barreira hematoencefálica (baseada em MW, PSA, LogP)
- plasma_binding: Ligação a proteínas plasmáticas (100 = baixa ligação/mais fármaco livre, 0 = alta ligação)
- cyp_inhibition: Risco de inibição CYP450 (100 = sem risco, 0 = forte inibidor)
- half_life_estimate: Classificação da meia-vida estimada ("curta", "moderada", "longa")

Para cada critério, forneça também uma explicação curta (1 frase) e classificação de risco ("low", "moderate", "high").`;

    const { data } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise a molécula: ${compoundName ? `${compoundName} — ` : ""}SMILES: ${smiles}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "predict_admet",
          description: "Return structured ADMET predictions for a molecule",
          parameters: {
            type: "object",
            required: ["predictions", "overall_score", "summary"],
            properties: {
              predictions: {
                type: "array",
                items: {
                  type: "object",
                  required: ["property", "score", "risk", "explanation"],
                  properties: {
                    property: { type: "string", enum: ["absorption", "solubility", "hepatotoxicity", "mutagenicity", "bbb_penetration", "plasma_binding", "cyp_inhibition"] },
                    score: { type: "number", description: "0-100" },
                    risk: { type: "string", enum: ["low", "moderate", "high"] },
                    explanation: { type: "string" },
                  },
                  additionalProperties: false,
                },
              },
              half_life_estimate: { type: "string", enum: ["curta", "moderada", "longa"] },
              overall_score: { type: "number", description: "0-100 overall drug-likeness" },
              summary: { type: "string", description: "Brief summary of ADMET profile in Portuguese" },
            },
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "predict_admet" } },
      temperature: 0.3,
      userId: userId || undefined,
      promptType: "admet-prediction",
    });

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured ADMET data");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[predict-admet]", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    const status = msg.includes("Limite") ? 429 : msg.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
