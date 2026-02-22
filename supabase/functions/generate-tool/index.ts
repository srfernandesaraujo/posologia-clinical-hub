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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isEdit = mode === "edit" && existingTool;
    const isSimulator = type === "simulador";
    const categories = ["Cardiologia", "Emergência", "Endocrinologia", "Nefrologia", "Neurologia", "Pneumologia", "Infectologia", "Pediatria", "Psiquiatria", "Reumatologia"];

    let systemPrompt: string;
    let toolName: string;
    let toolParams: any;

    if (isSimulator) {
      // ─── SIMULATOR PROMPT ───
      systemPrompt = `Você é um especialista em farmácia clínica e criação de simuladores clínicos de alta fidelidade.
${isEdit
  ? `O usuário quer CORRIGIR/EDITAR um simulador existente. Dados atuais:
Nome: ${existingTool.name}
Descrição: ${existingTool.description || "Sem descrição"}
Campos: ${JSON.stringify(existingTool.fields)}
Fórmula (dados do caso): ${JSON.stringify(existingTool.formula)}

PROBLEMA RELATADO: "${prompt}"

Corrija o simulador mantendo a MESMA ESTRUTURA de caso clínico interativo.`
  : `O usuário quer criar um simulador clínico interativo.`}

VOCÊ DEVE GERAR UM CASO CLÍNICO COMPLETO no estilo PRM (Problemas Relacionados a Medicamentos).

ESTRUTURA OBRIGATÓRIA DO SIMULADOR:
O simulador deve ter um caso clínico com:
1. Um PACIENTE com dados demográficos realistas (nome brasileiro, idade, peso, altura, sexo)
2. Um HISTÓRICO clínico (doenças, queixa principal, alergias, sinais vitais, clearance de creatinina se relevante)
3. Uma PRESCRIÇÃO MÉDICA com 3-5 medicamentos (droga, dose, via, frequência)
4. RESPOSTAS CORRETAS para cada medicamento: se tem PRM, tipo do PRM (Seguranca, Efetividade, Indicacao, Adesao), e justificativa clínica detalhada

REGRAS CRÍTICAS:
- Pelo menos 1-2 medicamentos DEVEM ter PRMs (problemas reais e clinicamente relevantes)
- Os PRMs devem ser clinicamente precisos e educativos
- A justificativa deve explicar o problema E sugerir a conduta correta
- Doses devem ser realistas para o perfil do paciente
- Se paciente pediátrico, calcule doses por kg
- Se paciente idoso ou com DRC, considere ajustes renais
- Sinais vitais devem ser coerentes com o quadro clínico
- A dificuldade deve refletir a complexidade real do caso

O slug deve ser em português, sem acentos, separado por hífens.
short_description: máximo 100 caracteres.
description: NO MÁXIMO 2 frases.
category_name: UMA das categorias: ${categories.join(", ")}.`;

      toolName = "create_clinical_simulator";
      toolParams = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const, description: "Nome do simulador em português" },
          slug: { type: "string" as const, description: "Slug URL-friendly sem acentos" },
          short_description: { type: "string" as const, description: "Descrição curta até 100 chars" },
          description: { type: "string" as const, description: "2 frases: propósito e usos" },
          category_name: { type: "string" as const, enum: categories },
          difficulty: { type: "string" as const, enum: ["Fácil", "Médio", "Difícil"] },
          patient: {
            type: "object" as const,
            properties: {
              name: { type: "string" as const },
              age: { type: "number" as const },
              weight: { type: "number" as const },
              height: { type: "number" as const },
              sex: { type: "string" as const, enum: ["Masculino", "Feminino"] },
            },
            required: ["name", "age", "weight", "height", "sex"] as const,
            additionalProperties: false as const,
          },
          history: {
            type: "object" as const,
            properties: {
              diseases: { type: "array" as const, items: { type: "string" as const } },
              mainComplaint: { type: "string" as const },
              allergies: { type: "array" as const, items: { type: "string" as const } },
              creatinineClearance: { type: "number" as const, description: "ClCr em mL/min, null se não relevante" },
              vitalSigns: {
                type: "object" as const,
                properties: {
                  bp: { type: "string" as const, description: "Pressão arterial ex: 140/85 mmHg" },
                  hr: { type: "string" as const, description: "Frequência cardíaca ex: 76 bpm" },
                  temp: { type: "string" as const, description: "Temperatura ex: 36.2°C" },
                  spo2: { type: "string" as const, description: "Saturação ex: 96%" },
                },
                additionalProperties: false as const,
              },
            },
            required: ["diseases", "mainComplaint", "allergies"] as const,
            additionalProperties: false as const,
          },
          prescription: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                drug: { type: "string" as const },
                dose: { type: "string" as const },
                route: { type: "string" as const, description: "Via: VO, IV, IM, SC, etc." },
                frequency: { type: "string" as const },
              },
              required: ["drug", "dose", "route", "frequency"] as const,
              additionalProperties: false as const,
            },
          },
          answers: {
            type: "array" as const,
            description: "Uma resposta para cada medicamento da prescrição, na mesma ordem",
            items: {
              type: "object" as const,
              properties: {
                drugIndex: { type: "number" as const },
                hasPRM: { type: "boolean" as const },
                type: { type: "string" as const, enum: ["Seguranca", "Efetividade", "Indicacao", "Adesao"], description: "Tipo do PRM, null se não tem PRM" },
                justification: { type: "string" as const, description: "Justificativa clínica detalhada. Vazio se não tem PRM." },
              },
              required: ["drugIndex", "hasPRM", "justification"] as const,
              additionalProperties: false as const,
            },
          },
        },
        required: ["name", "slug", "short_description", "description", "category_name", "difficulty", "patient", "history", "prescription", "answers"] as const,
        additionalProperties: false as const,
      };
    } else {
      // ─── CALCULATOR PROMPT (existing) ───
      systemPrompt = `Você é um especialista em medicina clínica e criação de ferramentas médicas.
${isEdit
  ? `O usuário quer CORRIGIR/EDITAR uma ferramenta existente que NÃO ESTÁ FUNCIONANDO CORRETAMENTE. Aqui estão os dados atuais:
Nome: ${existingTool.name}
Descrição: ${existingTool.description || "Sem descrição"}
Campos atuais: ${JSON.stringify(existingTool.fields)}
Fórmula atual: ${JSON.stringify(existingTool.formula)}

O PROBLEMA RELATADO PELO USUÁRIO É: "${prompt}"

INSTRUÇÕES CRÍTICAS PARA CORREÇÃO:
- Analise cuidadosamente o problema descrito
- Corrija a fórmula (expression) para que o cálculo funcione corretamente com JavaScript eval
- A expression DEVE ser uma expressão JavaScript válida usando os nomes dos campos (name) como variáveis
- Para scores baseados em soma de critérios booleanos (switches), use: campo1 + campo2 + campo3
- Para cálculos com fórmulas matemáticas, use Math.round, Math.pow, etc.
- Verifique que os ranges na interpretation correspondam aos resultados possíveis da fórmula
- Para campos select, o value de cada option DEVE ser numérico (ex: "0", "1", "2") para funcionar no cálculo
- Retorne a ferramenta COMPLETA atualizada (não só as mudanças)`
  : `O usuário vai pedir para criar uma calculadora clínica.`}

Você DEVE retornar APENAS o resultado da tool call, sem texto adicional.

REGRAS IMPORTANTES PARA ESTRUTURA DOS CAMPOS:
- Organize os campos em SEÇÕES (sections). Cada seção tem um "title" e um array de "fields".
- Campos booleanos (sim/não) DEVEM usar type "switch" (NÃO checkbox).
- Campos numéricos usam type "number" com unit.
- Campos de seleção usam type "select" com options.
- Cada field tem: name (snake_case), label (português), type, unit (opcional), options (para select), required (boolean), defaultValue (opcional).

REGRAS PARA FÓRMULA E RESULTADOS:
- expression: fórmula JavaScript avaliável usando os nomes dos campos
- interpretation: array de faixas com range, label, description, color (hex ou hsl), e recommendations

REGRAS GERAIS:
- O slug deve ser em português, sem acentos, separado por hífens
- short_description: máximo 100 caracteres
- description: NO MÁXIMO 2 frases
- category_name: UMA das categorias: ${categories.join(", ")}
- author: sempre "Sérgio Araújo"`;

      toolName = "create_clinical_tool";
      toolParams = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          slug: { type: "string" as const },
          short_description: { type: "string" as const },
          description: { type: "string" as const },
          category_name: { type: "string" as const, enum: categories },
          author: { type: "string" as const },
          sections: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                title: { type: "string" as const },
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
              expression: { type: "string" as const },
              interpretation: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    range: { type: "string" as const },
                    label: { type: "string" as const },
                    description: { type: "string" as const },
                    color: { type: "string" as const },
                    recommendations: {
                      type: "array" as const,
                      items: { type: "string" as const },
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
    }

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
              name: toolName,
              description: isSimulator
                ? "Cria ou edita um simulador clínico interativo com caso clínico completo"
                : "Cria ou edita uma calculadora clínica completa",
              parameters: toolParams,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: toolName } },
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

    if (isSimulator) {
      // For simulators, store the case data in formula and leave fields empty
      const result = {
        name: toolData.name,
        slug: toolData.slug,
        short_description: toolData.short_description,
        description: toolData.description,
        category_name: toolData.category_name,
        difficulty: toolData.difficulty || "Médio",
        fields: [], // Simulators don't use calculator fields
        formula: {
          type: "simulator",
          patient: toolData.patient,
          history: toolData.history,
          prescription: toolData.prescription,
          answers: toolData.answers,
        },
      };
      return new Response(JSON.stringify({ tool: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Calculator: flatten sections into fields
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
    }
  } catch (e) {
    console.error("generate-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
