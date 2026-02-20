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
    const { prompt, type, mode, existingTool } = await req.json();
    // mode: "create" (default) or "edit"
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isEdit = mode === "edit" && existingTool;

    const categories = ["Cardiologia", "Emergência", "Endocrinologia", "Nefrologia", "Neurologia", "Pneumologia"];

    const systemPrompt = `Você é um especialista em medicina clínica e criação de ferramentas médicas.
${isEdit
  ? `O usuário quer EDITAR uma ferramenta existente. Aqui estão os dados atuais:
Nome: ${existingTool.name}
Campos atuais: ${JSON.stringify(existingTool.fields)}
Fórmula atual: ${JSON.stringify(existingTool.formula)}

Aplique as alterações solicitadas pelo usuário, mantendo o que não foi mencionado. Retorne a ferramenta COMPLETA atualizada (não só as mudanças).`
  : `O usuário vai pedir para criar uma ${type === "simulador" ? "simulador clínico" : "calculadora clínica"}.`}

Você DEVE retornar APENAS o resultado da tool call, sem texto adicional.

REGRAS IMPORTANTES PARA ESTRUTURA DOS CAMPOS:
- Organize os campos em SEÇÕES (sections). Cada seção tem um "title" e um array de "fields".
- Seções típicas: "Identificação (opcional)", "Dados Demográficos", "Dados Clínicos", "Antropometria", "Fatores de Risco", etc.
- Campos booleanos (sim/não) DEVEM usar type "switch" (NÃO checkbox). Ex: tabagismo, diabetes.
- Campos numéricos usam type "number" com unit.
- Campos de seleção usam type "select" com options.
- Campos de texto usam type "text".
- Cada field tem: name (snake_case), label (português), type (number, select, switch, text), unit (opcional), options (para select), required (boolean), defaultValue (opcional).

REGRAS PARA FÓRMULA E RESULTADOS:
- expression: descrição textual do cálculo ou fórmula JavaScript avaliável
- interpretation: array de faixas com range, label, description, color (hex ou hsl), e recommendations (array de strings com condutas clínicas)
- Cada interpretation DEVE ter recommendations com pelo menos 2 sugestões de conduta

REGRAS GERAIS:
- O slug deve ser em português, sem acentos, separado por hífens
- short_description deve ter no máximo 100 caracteres
- description deve ter NO MÁXIMO 2 frases: para que serve e possíveis usos clínicos
- category_name deve ser UMA das categorias existentes: ${categories.join(", ")}. Escolha a mais adequada.
- author deve ser sempre "Sérgio Araújo"`;

    const toolParams = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, description: "Nome da ferramenta em português" },
        slug: { type: "string" as const, description: "Slug URL-friendly sem acentos" },
        short_description: { type: "string" as const, description: "Descrição curta até 100 chars" },
        description: { type: "string" as const, description: "2 frases: propósito e usos clínicos" },
        category_name: { type: "string" as const, enum: categories, description: "Categoria clínica mais adequada" },
        author: { type: "string" as const, description: "Autor da ferramenta" },
        sections: {
          type: "array" as const,
          description: "Seções organizadas de campos da ferramenta",
          items: {
            type: "object" as const,
            properties: {
              title: { type: "string" as const, description: "Título da seção (ex: Dados Clínicos)" },
              fields: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                    label: { type: "string" as const },
                    type: { type: "string" as const, enum: ["number", "select", "switch", "text"] },
                    unit: { type: "string" as const },
                    options: {
                      type: "array" as const,
                      items: {
                        type: "object" as const,
                        properties: {
                          value: { type: "string" as const },
                          label: { type: "string" as const },
                        },
                        required: ["value", "label"] as const,
                        additionalProperties: false as const,
                      },
                    },
                    required: { type: "boolean" as const },
                    defaultValue: { type: "string" as const },
                  },
                  required: ["name", "label", "type"] as const,
                  additionalProperties: false as const,
                },
              },
            },
            required: ["title", "fields"] as const,
            additionalProperties: false as const,
          },
        },
        formula: {
          type: "object" as const,
          properties: {
            expression: { type: "string" as const, description: "Descrição ou fórmula do cálculo" },
            interpretation: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  range: { type: "string" as const },
                  label: { type: "string" as const },
                  description: { type: "string" as const },
                  color: { type: "string" as const, description: "Cor para essa faixa (ex: hsl(142 71% 45%) para verde)" },
                  recommendations: {
                    type: "array" as const,
                    items: { type: "string" as const },
                    description: "Condutas/recomendações clínicas para esta faixa",
                  },
                },
                required: ["range", "label", "description", "color", "recommendations"] as const,
                additionalProperties: false as const,
              },
            },
          },
          required: ["expression", "interpretation"] as const,
          additionalProperties: false as const,
        },
      },
      required: ["name", "slug", "short_description", "description", "category_name", "author", "sections", "formula"] as const,
      additionalProperties: false as const,
    };

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
              description: "Cria ou edita uma calculadora/simulador clínico completo",
              parameters: toolParams,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_clinical_tool" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "A IA não retornou dados estruturados" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolData = JSON.parse(toolCall.function.arguments);

    // Flatten sections into fields array for backward compatibility + keep sections in formula
    const flatFields: any[] = [];
    if (toolData.sections) {
      for (const section of toolData.sections) {
        for (const field of section.fields) {
          flatFields.push({ ...field, section: section.title });
        }
      }
    }

    const result = {
      ...toolData,
      fields: flatFields,
      formula: {
        ...toolData.formula,
        sections: toolData.sections,
      },
    };

    return new Response(JSON.stringify({ tool: result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
