import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, specialty, difficulty } = await req.json();

    const systemPrompt = `Você é um gerador de cenários clínicos para simulação realística em saúde. Gere cenários detalhados, clinicamente precisos e educativos.

REGRAS:
- Sempre retorne via tool calling usando a função "create_scenario"
- Os dados devem ser clinicamente coerentes
- As decisões devem ter feedback educativo detalhado
- Os efeitos nos sinais vitais devem ser realistas
- Cada nó deve ter exatamente 3-4 opções, sendo apenas 1 correta
- O cenário deve ter 4-6 nós de decisão
- Pesos: decisões críticas peso 3, importantes peso 2, rotineiras peso 1`;

    const userPrompt = `Gere um cenário de simulação realística com o tema: "${title}"
Especialidade: ${specialty}
Dificuldade: ${difficulty}

O cenário deve incluir um paciente completo com dados demográficos, sinais vitais, medicações, exames laboratoriais e uma árvore de decisões clínicas ramificadas.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_scenario",
          description: "Create a complete clinical simulation scenario with branching decisions",
          parameters: {
            type: "object",
            properties: {
              patient: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "number" },
                  sex: { type: "string" },
                  weight: { type: "number" },
                  height: { type: "number" },
                  chiefComplaint: { type: "string" },
                  history: { type: "string" },
                  medications: { type: "array", items: { type: "string" } },
                  allergies: { type: "array", items: { type: "string" } },
                  vitals: {
                    type: "object",
                    properties: {
                      fc: { type: "number" },
                      pas: { type: "number" },
                      pad: { type: "number" },
                      fr: { type: "number" },
                      temp: { type: "number" },
                      spo2: { type: "number" },
                      glasgow: { type: "number" },
                    },
                    required: ["fc", "pas", "pad", "fr", "temp", "spo2", "glasgow"],
                  },
                  labs: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
                required: ["name", "age", "sex", "weight", "height", "chiefComplaint", "history", "medications", "allergies", "vitals", "labs"],
              },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    stage: { type: "number" },
                    title: { type: "string" },
                    context: { type: "string" },
                    weight: { type: "number" },
                    options: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          label: { type: "string" },
                          description: { type: "string" },
                          isCorrect: { type: "boolean" },
                          feedback: { type: "string" },
                          vitalEffects: {
                            type: "object",
                            additionalProperties: { type: "number" },
                          },
                        },
                        required: ["id", "label", "description", "isCorrect", "feedback"],
                      },
                    },
                  },
                  required: ["id", "stage", "title", "context", "weight", "options"],
                },
              },
              outcome: {
                type: "object",
                properties: {
                  good: { type: "string" },
                  bad: { type: "string" },
                },
                required: ["good", "bad"],
              },
            },
            required: ["patient", "nodes", "outcome"],
          },
        },
      },
    ];

    const { data: result, provider } = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "create_scenario" } },
      promptType: "simulation-scenario",
    });

    console.log(`[generate-simulation-scenario] Generated via ${provider}`);

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const scenarioData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(scenarioData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-simulation-scenario error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("Limite") ? 429 : msg.includes("Créditos") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
