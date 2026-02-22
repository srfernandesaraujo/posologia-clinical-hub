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
    const categories = ["Cardiologia", "Emergência", "Endocrinologia", "Nefrologia", "Neurologia", "Pneumologia", "Infectologia", "Pediatria", "Psiquiatria", "Reumatologia", "Farmacologia Clínica", "Atenção Farmacêutica", "Stewardship de Antimicrobianos", "Farmacocinética Clínica", "Oncologia"];

    let systemPrompt: string;
    let toolName: string;
    let toolParams: any;

    if (isSimulator) {
      systemPrompt = `Você é um especialista em farmácia clínica e criação de simuladores clínicos interativos de alta fidelidade.
${isEdit
  ? `O usuário quer CORRIGIR/EDITAR um simulador existente. Dados atuais:
Nome: ${existingTool.name}
Descrição: ${existingTool.description || ""}
Dados: ${JSON.stringify(existingTool.formula)}

PROBLEMA RELATADO: "${prompt}"

Corrija o simulador mantendo a mesma estrutura de steps e panels.
Retorne o simulador COMPLETO corrigido.`
  : `O usuário quer criar um simulador clínico interativo.`}

TIPOS DE SIMULADORES QUE VOCÊ PODE CRIAR (exemplos):
1. **PRM (Problemas Relacionados a Medicamentos)**: Paciente + prescrição médica → aluno avalia cada medicamento buscando PRMs.
2. **Stewardship de Antimicrobianos**: Caso infeccioso com timeline. Aluno escolhe antibióticos, solicita culturas, ajusta terapia.
3. **TDM (Monitorização Terapêutica)**: Paciente com dados farmacocinéticos, curvas de concentração vs tempo.
4. **Acompanhamento Farmacoterapêutico**: Follow-up longitudinal com exames laboratoriais e tendências.
5. **Bomba de Infusão**: Interface com LCD, teclado numérico, indicadores visuais, botões de ação.
6. **Qualquer outro tipo** que faça sentido clínicamente baseado na solicitação do usuário.

Escolha o tipo mais adequado baseado na solicitação do usuário e crie o simulador.

ESTRUTURA OBRIGATÓRIA - STEPS E PANELS:
O simulador é organizado em STEPS (etapas sequenciais). Cada step tem PANELS (painéis lado a lado, máximo 3).

TIPOS DE PANELS DISPONÍVEIS:

1. **"info"** - Apenas exibição de texto. Use markdown simples: **negrito**, quebras de linha.
   Campos: content (texto)

2. **"checklist"** - Múltipla seleção com opções.
   Campos: options (array de strings), correctAnswers (array de strings corretas)

3. **"radio"** - Seleção única.
   Campos: options, correctAnswers

4. **"text"** - Resposta escrita livre.
   Campos: correctText (resposta esperada)

5. **"chart"** - Gráfico interativo (curvas farmacocinéticas, tendências laboratoriais, etc.)
   Campos: chartConfig com:
   - data: array de pontos {label: "0h", concentracao: 25}
   - series: [{dataKey: "concentracao", name: "Concentração", color: "#ef4444"}]
   - xAxisLabel, yAxisLabel, yAxisUnit
   - referenceLines: [{y: 20, label: "Cmax", color: "#22c55e"}]
   - referenceAreas: [{y1: 15, y2: 20, label: "Janela Terapêutica", color: "rgba(34,197,94,0.15)"}]
   USE ESTE TIPO para curvas de concentração vs tempo, tendências de exames, gráficos PK/PD.

6. **"numeric_keypad"** - Teclado numérico com display LCD (estilo bomba de infusão, monitor).
   Campos: keypadConfig com:
   - displayLabel: "Taxa de Infusão"
   - displayUnit: "mL/h"
   - correctValue: 12.5 (valor correto numérico)
   - tolerance: 0.5 (tolerância para aceitar como correto)
   - lcdColor: "green" | "blue" | "amber"
   - actionButtons: [{label: "Start", color: "green"}, {label: "Stop", color: "red"}]
   USE ESTE TIPO para simulações de equipamentos (bombas de infusão, monitores, etc.)

7. **"indicator"** - Indicadores visuais de status (luzes, valores de monitorização).
   Campos: indicatorConfig com:
   - indicators: [{label: "Infundindo", status: "blink", color: "green"}, {label: "Alarme", status: "off", color: "red"}]
   - displayValues: [{label: "PAM", value: "72", unit: "mmHg"}, {label: "FC", value: "88", unit: "bpm"}]
   USE ESTE TIPO para monitorização de sinais vitais, status de equipamentos.

8. **"calculation"** - Campos de cálculo onde o aluno calcula e insere valores.
   Campos: calculationConfig com:
   - fields: [{name: "dose", label: "Dose", unit: "mg", correctValue: 500, tolerance: 10}]
   - formula_hint: "Dose = Concentração × Volume"
   USE ESTE TIPO quando o aluno precisa calcular doses, taxas de infusão, clearances, etc.

REGRAS IMPORTANTES PARA INTERFACES RICAS:
- Quando o usuário pedir simulação de equipamentos (bombas, monitores), USE os tipos "numeric_keypad", "indicator" e "chart"
- Quando o usuário pedir curvas ou gráficos, USE o tipo "chart" com dados realistas
- Combine painéis: ex: um "info" com dados do paciente + um "numeric_keypad" para entrada + um "indicator" para status
- Os painéis devem criar uma interface visual imersiva e profissional
- Dados do paciente devem ser realistas (nomes brasileiros, valores laboratoriais plausíveis)

REGRAS CLÍNICAS:
- Inclua sinais vitais quando relevante (PA, FC, Temp, SpO2)
- Para PRM: pelo menos 1-2 medicamentos com problemas reais
- Para Stewardship: inclua diagnóstico infeccioso, antibióticos empíricos E resultados de cultura/antibiograma
- Para TDM: inclua parâmetros farmacocinéticos com gráfico de curva usando panel type "chart"
- Para Acompanhamento: inclua exames com valores e tendências usando type "chart"
- Para Bombas de Infusão: use "numeric_keypad" com LCD, "indicator" para status, "calculation" para dose

REGRAS GERAIS:
- slug: português sem acentos, separado por hífens
- short_description: máximo 100 caracteres
- description: 2 frases
- category_name: UMA das categorias existentes (${categories.join(", ")}). Se nenhuma se encaixa, escolha a mais próxima.
- difficulty: Fácil, Médio ou Difícil
- O simulador DEVE ter no mínimo 2 steps e no máximo 5 steps`;

      toolName = "create_clinical_simulator";
      toolParams = {
        type: "object" as const,
        properties: {
          name: { type: "string" as const },
          slug: { type: "string" as const },
          short_description: { type: "string" as const },
          description: { type: "string" as const },
          category_name: { type: "string" as const, enum: categories },
          difficulty: { type: "string" as const, enum: ["Fácil", "Médio", "Difícil"] },
          patient_summary: { type: "string" as const, description: "Resumo do paciente (ex: 'Maria, 72 anos, DM2 + HAS')" },
          steps: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                title: { type: "string" as const },
                feedback: { type: "string" as const, description: "Feedback educativo detalhado mostrado após completar a etapa" },
                panels: {
                  type: "array" as const,
                  items: {
                    type: "object" as const,
                    properties: {
                      title: { type: "string" as const },
                      type: { type: "string" as const, enum: ["info", "checklist", "radio", "text", "chart", "numeric_keypad", "indicator", "calculation"] },
                      content: { type: "string" as const, description: "Conteúdo textual para type info. Use **negrito** e \\n para quebras de linha." },
                      options: { type: "array" as const, items: { type: "string" as const }, description: "Opções para checklist/radio" },
                      correctAnswers: { type: "array" as const, items: { type: "string" as const }, description: "Respostas corretas para checklist/radio" },
                      correctText: { type: "string" as const, description: "Resposta esperada para type text" },
                      chartConfig: {
                        type: "object" as const,
                        description: "Configuração de gráfico para type chart",
                        properties: {
                          xAxisLabel: { type: "string" as const },
                          yAxisLabel: { type: "string" as const },
                          yAxisUnit: { type: "string" as const },
                          data: { type: "array" as const, items: { type: "object" as const, additionalProperties: true } },
                          series: { type: "array" as const, items: { type: "object" as const, properties: { dataKey: { type: "string" as const }, name: { type: "string" as const }, color: { type: "string" as const } }, required: ["dataKey", "name"] as const } },
                          referenceLines: { type: "array" as const, items: { type: "object" as const, properties: { y: { type: "number" as const }, label: { type: "string" as const }, color: { type: "string" as const } }, required: ["y", "label"] as const } },
                          referenceAreas: { type: "array" as const, items: { type: "object" as const, properties: { y1: { type: "number" as const }, y2: { type: "number" as const }, label: { type: "string" as const }, color: { type: "string" as const } }, required: ["y1", "y2"] as const } },
                        },
                        required: ["data", "series"] as const,
                      },
                      keypadConfig: {
                        type: "object" as const,
                        description: "Configuração do teclado numérico + LCD para type numeric_keypad",
                        properties: {
                          displayLabel: { type: "string" as const },
                          displayUnit: { type: "string" as const },
                          correctValue: { type: "number" as const },
                          tolerance: { type: "number" as const },
                          lcdColor: { type: "string" as const, enum: ["green", "blue", "amber"] },
                          actionButtons: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, color: { type: "string" as const } }, required: ["label"] as const } },
                        },
                      },
                      indicatorConfig: {
                        type: "object" as const,
                        description: "Configuração de indicadores visuais para type indicator",
                        properties: {
                          indicators: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, status: { type: "string" as const, enum: ["on", "off", "blink"] }, color: { type: "string" as const, enum: ["green", "red", "yellow", "blue"] } }, required: ["label", "status", "color"] as const } },
                          displayValues: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, value: { type: "string" as const }, unit: { type: "string" as const } }, required: ["label", "value"] as const } },
                        },
                        required: ["indicators"] as const,
                      },
                      calculationConfig: {
                        type: "object" as const,
                        description: "Configuração de campos de cálculo para type calculation",
                        properties: {
                          fields: { type: "array" as const, items: { type: "object" as const, properties: { name: { type: "string" as const }, label: { type: "string" as const }, unit: { type: "string" as const }, correctValue: { type: "number" as const }, tolerance: { type: "number" as const } }, required: ["name", "label"] as const } },
                          formula_hint: { type: "string" as const },
                        },
                        required: ["fields"] as const,
                      },
                    },
                    required: ["title", "type"] as const,
                  },
                },
              },
              required: ["title", "feedback", "panels"] as const,
            },
          },
        },
        required: ["name", "slug", "short_description", "description", "category_name", "difficulty", "patient_summary", "steps"] as const,
        additionalProperties: false as const,
      };
    } else {
      // ─── CALCULATOR PROMPT ───
      systemPrompt = `Você é um especialista em medicina clínica e criação de ferramentas médicas.
${isEdit
  ? `O usuário quer CORRIGIR/EDITAR uma ferramenta existente que NÃO ESTÁ FUNCIONANDO CORRETAMENTE. Aqui estão os dados atuais:
Nome: ${existingTool.name}
Descrição: ${existingTool.description || "Sem descrição"}
Campos atuais: ${JSON.stringify(existingTool.fields)}
Fórmula atual: ${JSON.stringify(existingTool.formula)}

O PROBLEMA RELATADO PELO USUÁRIO É: "${prompt}"

INSTRUÇÕES CRÍTICAS PARA CORREÇÃO:
- Corrija a fórmula (expression) para que o cálculo funcione com JavaScript eval
- A expression DEVE ser uma expressão JavaScript válida usando os nomes dos campos (name) como variáveis
- Para scores baseados em soma de critérios booleanos (switches), use: campo1 + campo2 + campo3
- Para cálculos com fórmulas matemáticas, use Math.round, Math.pow, etc.
- Verifique que os ranges na interpretation correspondam aos resultados possíveis
- Para campos select, o value DEVE ser numérico (ex: "0", "1", "2")
- Retorne a ferramenta COMPLETA atualizada`
  : `O usuário vai pedir para criar uma calculadora clínica.`}

REGRAS PARA ESTRUTURA DOS CAMPOS:
- Organize em SEÇÕES (sections). Cada seção tem "title" e "fields".
- Campos booleanos: type "switch". Numéricos: "number" com unit. Seleção: "select" com options.
- Cada field tem: name (snake_case), label (português), type, unit, options, required, defaultValue.

REGRAS PARA FÓRMULA:
- expression: fórmula JavaScript avaliável
- interpretation: array de faixas com range, label, description, color, recommendations

REGRAS GERAIS:
- slug: português sem acentos, hífens
- short_description: máximo 100 chars
- description: 2 frases
- category_name: UMA das categorias: ${categories.join(", ")}
- author: "Sérgio Araújo"`;

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
                    recommendations: { type: "array" as const, items: { type: "string" as const } },
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
                ? "Cria ou edita um simulador clínico interativo com steps e panels"
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
      const result = {
        name: toolData.name,
        slug: toolData.slug,
        short_description: toolData.short_description,
        description: toolData.description,
        category_name: toolData.category_name,
        difficulty: toolData.difficulty || "Médio",
        fields: [],
        formula: {
          type: "simulator",
          patient_summary: toolData.patient_summary,
          steps: toolData.steps,
        },
      };
      return new Response(JSON.stringify({ tool: result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
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
        formula: { ...toolData.formula, sections: toolData.sections },
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
