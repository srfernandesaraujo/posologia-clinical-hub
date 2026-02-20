import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em medicina clínica e criação de ferramentas médicas.
O usuário vai pedir para criar uma ${type === "simulador" ? "simulador clínico" : "calculadora clínica"}.

Você DEVE retornar APENAS o resultado da tool call, sem texto adicional.

Regras:
- O slug deve ser em português, sem acentos, separado por hífens
- short_description deve ter no máximo 100 caracteres
- description deve ter NO MÁXIMO 2 frases curtas: a primeira explica para que serve a ferramenta e a segunda menciona possíveis usos clínicos. NÃO inclua referências, modelos, interpretações ou instruções de uso. Seja extremamente conciso.
- fields é um array de objetos com: name (snake_case), label (português), type (number, select, checkbox), unit (opcional), options (para select: array de {value, label}), required (boolean)
- formula é um objeto com: expression (string descrevendo o cálculo), interpretation (array de {range, label, description} explicando os resultados)`;

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
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_clinical_tool",
              description: "Cria uma calculadora ou simulador clínico com todos os dados necessários",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome da ferramenta em português" },
                  slug: { type: "string", description: "Slug URL-friendly sem acentos" },
                  short_description: { type: "string", description: "Descrição curta até 100 chars" },
                  description: { type: "string", description: "Descrição completa com explicação de uso e referências" },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        label: { type: "string" },
                        type: { type: "string", enum: ["number", "select", "checkbox"] },
                        unit: { type: "string" },
                        options: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              value: { type: "string" },
                              label: { type: "string" },
                            },
                            required: ["value", "label"],
                            additionalProperties: false,
                          },
                        },
                        required: { type: "boolean" },
                      },
                      required: ["name", "label", "type"],
                      additionalProperties: false,
                    },
                  },
                  formula: {
                    type: "object",
                    properties: {
                      expression: { type: "string" },
                      interpretation: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            range: { type: "string" },
                            label: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["range", "label", "description"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["expression", "interpretation"],
                    additionalProperties: false,
                  },
                },
                required: ["name", "slug", "short_description", "description", "fields", "formula"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_clinical_tool" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "A IA não retornou dados estruturados" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ tool: toolData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
