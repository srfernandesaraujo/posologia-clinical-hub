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
1. **PRM (Problemas Relacionados a Medicamentos)**: Paciente + prescrição médica → aluno avalia cada medicamento buscando PRMs de segurança, efetividade, indicação ou adesão.
2. **Stewardship de Antimicrobianos**: Caso infeccioso com timeline (Dia 1 admissão → Dia 3 resultados de cultura → Relatório). Aluno escolhe antibióticos empíricos, solicita culturas, depois ajusta terapia definitiva.
3. **TDM (Monitorização Terapêutica)**: Paciente com dados farmacocinéticos (nível de vale, creatinina, ClCr). Aluno analisa se o nível está na janela terapêutica e propõe ajuste de dose/intervalo.
4. **Acompanhamento Farmacoterapêutico**: Follow-up longitudinal (Mês 0 → Mês 3 → Mês 6). Exames laboratoriais com tendências, avaliação clínica, modificação de prescrição.
5. **Qualquer outro tipo** que faça sentido clínicamente baseado na solicitação do usuário.

Escolha o tipo mais adequado baseado na solicitação do usuário e crie o simulador.

ESTRUTURA OBRIGATÓRIA - STEPS E PANELS:
O simulador é organizado em STEPS (etapas sequenciais). Cada step tem PANELS (painéis lado a lado, máximo 3).

Cada PANEL tem:
- title: Título do painel
- type: "info" (apenas exibição), "checklist" (múltipla seleção), "radio" (seleção única), "text" (resposta escrita)
- content: Texto do painel (para type "info"). Use markdown simples: **negrito**, quebras de linha.
- options: Array de strings com as opções (para checklist/radio)
- correctAnswers: Array com as respostas corretas (para checklist/radio)
- correctText: Texto da resposta correta (para type "text", usado na comparação)

Cada STEP tem:
- title: Nome da etapa (ex: "Dia 1: Admissão", "Mês 3", "Análise da Prescrição")
- feedback: Texto detalhado de feedback mostrado APÓS o aluno completar a etapa. Deve ser educativo, explicando o raciocínio clínico correto.
- panels: Array de 2-3 painéis

REGRAS CLÍNICAS:
- Dados do paciente devem ser realistas (nomes brasileiros, valores laboratoriais plausíveis)
- Inclua sinais vitais quando relevante (PA, FC, Temp, SpO2)
- Para PRM: pelo menos 1-2 medicamentos com problemas reais
- Para Stewardship: inclua diagnóstico infeccioso, antibióticos empíricos E resultados de cultura/antibiograma
- Para TDM: inclua parâmetros farmacocinéticos (nível sérico, Vd, meia-vida, ClCr)
- Para Acompanhamento: inclua exames com valores e tendências, e condutas farmacêuticas

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
                      type: { type: "string" as const, enum: ["info", "checklist", "radio", "text"] },
                      content: { type: "string" as const, description: "Conteúdo textual. Use **negrito** e \\n para quebras de linha." },
                      options: { type: "array" as const, items: { type: "string" as const }, description: "Opções para checklist/radio" },
                      correctAnswers: { type: "array" as const, items: { type: "string" as const }, description: "Respostas corretas para checklist/radio" },
                      correctText: { type: "string" as const, description: "Resposta esperada para type text" },
                    },
                    required: ["title", "type"] as const,
                    additionalProperties: false as const,
                  },
                },
              },
              required: ["title", "feedback", "panels"] as const,
              additionalProperties: false as const,
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
