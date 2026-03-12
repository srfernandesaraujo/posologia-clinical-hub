import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, specialty, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
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
        ],
        tool_choice: { type: "function", function: { name: "create_scenario" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const scenarioData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(scenarioData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-simulation-scenario error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
