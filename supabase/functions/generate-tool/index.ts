import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";
import { getFullAccess } from "../_shared/subscription.ts";
import { sanitizeAndLintSteps } from "../_shared/simulator-quality.ts";
import {
  CATEGORIAS_SIMULADOR, LIMITE_ETAPAS, FERRAMENTA_ROTEADOR, PROMPT_ROTEADOR, escolherSkillsPorPalavras, exigenciasNaoCumpridas,
  montarPedidoDeRevisao, montarPromptDoGerador, normalizarEscolha, type EscolhaDeSkills,
} from "../_shared/simulator-skills/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    if (!(await getFullAccess(userId))) {
      return new Response(JSON.stringify({ error: "Recurso exclusivo do plano Premium" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, type, mode, existingTool } = await req.json();

    const isEdit = mode === "edit" && existingTool;
    const isSimulator = type === "simulador";
    const categories = CATEGORIAS_SIMULADOR;
    let escolha: EscolhaDeSkills | null = null;

    let systemPrompt: string;
    let toolName: string;
    let toolParams: any;

    if (isSimulator) {
      // 1) Roteador de skills: escolhe 1 a 3 playbooks para o tipo de simulador pedido. Na edição, usa só palavras-chave
      //    (o simulador já existe); se a chamada de IA do roteador falhar, cai nas palavras-chave, sem quebrar a criação.
      const pedidoCompleto = isEdit ? `${existingTool.name} ${existingTool.description || ""} ${prompt}` : prompt;
      if (isEdit) {
        escolha = normalizarEscolha({ skills: escolherSkillsPorPalavras(pedidoCompleto).map((x) => x.id) }, pedidoCompleto);
      } else {
        try {
          const { data: roteamento } = await callAI({ userId, promptType: "tool-route",
            messages: [{ role: "system", content: PROMPT_ROTEADOR }, { role: "user", content: prompt }],
            tools: [FERRAMENTA_ROTEADOR],
            tool_choice: { type: "function", function: { name: FERRAMENTA_ROTEADOR.function.name } },
            model: "google/gemini-3-flash-preview",
          });
          const chamada = roteamento.choices?.[0]?.message?.tool_calls?.[0];
          escolha = normalizarEscolha(chamada ? JSON.parse(chamada.function.arguments) : null, prompt);
        } catch (routerErr) {
          console.warn("generate-tool: roteador de skills falhou, usando palavras-chave:", routerErr);
          escolha = normalizarEscolha(null, prompt);
        }
      }
      console.log("generate-tool skills:", escolha.skills.map((x) => x.id).join(", "), "| origem:", escolha.origem);

      const contextoEdicao = isEdit
        ? `O usuário quer CORRIGIR/EDITAR um simulador existente. Dados atuais:
Nome: ${existingTool.name}
Descrição: ${existingTool.description || ""}
Dados: ${JSON.stringify(existingTool.formula)}

PROBLEMA RELATADO: "${prompt}"

Corrija o simulador mantendo a mesma estrutura de steps e panels (pode acrescentar ou trocar painéis se o problema exigir).
Retorne o simulador COMPLETO corrigido.`
        : undefined;
      systemPrompt = montarPromptDoGerador(escolha, contextoEdicao);

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
                      type: { type: "string" as const, enum: ["info", "checklist", "radio", "text", "chart", "numeric_keypad", "indicator", "calculation", "explorer", "modelo"] },
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
                      explorerConfig: {
                        type: "object" as const,
                        description: "Configuração do painel de exploração (aluno testa opções e vê o resultado) para type explorer",
                        properties: {
                          controlLabel: { type: "string" as const },
                          baseline: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, value: { type: "string" as const }, unit: { type: "string" as const } }, required: ["label", "value"] as const } },
                          options: {
                            type: "array" as const,
                            items: {
                              type: "object" as const,
                              properties: {
                                label: { type: "string" as const },
                                outcomes: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, value: { type: "string" as const }, unit: { type: "string" as const }, trend: { type: "string" as const, enum: ["up", "down", "same"] }, effect: { type: "string" as const, enum: ["good", "bad", "neutral"] } }, required: ["label", "value"] as const } },
                                note: { type: "string" as const },
                              },
                              required: ["label", "outcomes"] as const,
                            },
                          },
                          requireAll: { type: "boolean" as const },
                        },
                        required: ["options"] as const,
                      },
                      modeloConfig: {
                        type: "object" as const,
                        description: "Configuração do painel de modelo (parâmetros ajustáveis + fórmulas) para type modelo",
                        properties: {
                          inputs: { type: "array" as const, items: { type: "object" as const, properties: { name: { type: "string" as const }, label: { type: "string" as const }, unit: { type: "string" as const }, min: { type: "number" as const }, max: { type: "number" as const }, step: { type: "number" as const }, default: { type: "number" as const } }, required: ["name", "label", "min", "max", "default"] as const } },
                          outputs: { type: "array" as const, items: { type: "object" as const, properties: { label: { type: "string" as const }, expr: { type: "string" as const }, unit: { type: "string" as const }, decimals: { type: "number" as const }, bom: { type: "string" as const }, ruim: { type: "string" as const } }, required: ["label", "expr"] as const } },
                          series: {
                            type: "object" as const,
                            properties: {
                              xLabel: { type: "string" as const }, yLabel: { type: "string" as const }, xFrom: { type: "number" as const }, xTo: { type: "number" as const }, xStep: { type: "number" as const },
                              lines: { type: "array" as const, items: { type: "object" as const, properties: { name: { type: "string" as const }, expr: { type: "string" as const }, color: { type: "string" as const } }, required: ["name", "expr"] as const } },
                              refLines: { type: "array" as const, items: { type: "object" as const, properties: { y: { type: "number" as const }, label: { type: "string" as const }, color: { type: "string" as const } }, required: ["y"] as const } },
                            },
                            required: ["xFrom", "xTo", "lines"] as const,
                          },
                          formulaHint: { type: "string" as const },
                        },
                        required: ["inputs", "outputs"] as const,
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

    const ferramenta = {
      type: "function" as const,
      function: {
        name: toolName,
        description: isSimulator
          ? "Cria ou edita um simulador clínico interativo com steps e panels"
          : "Cria ou edita uma calculadora clínica completa",
        parameters: toolParams,
      },
    };
    const gerar = async (messages: any[]) => {
      const { data } = await callAI({ userId, promptType: isEdit ? "tool-edit" : "tool-generate",
        messages,
        tools: [ferramenta],
        tool_choice: { type: "function", function: { name: toolName } },
        model: "google/gemini-3-flash-preview",
      });
      const chamada = data.choices?.[0]?.message?.tool_calls?.[0];
      return chamada ? JSON.parse(chamada.function.arguments) : null;
    };

    const mensagens = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ];
    let toolData = await gerar(mensagens);

    if (!toolData) {
      return new Response(JSON.stringify({ error: "A IA não retornou dados estruturados" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isSimulator && escolha) {
      // 3) Revisão automática: valida painéis, aplica o lint de qualidade e as exigências das skills; se houver problemas,
      //    devolve o simulador à IA com a lista e fica com a versão que tiver menos problemas.
      const avaliar = (td: any) => {
        const q = sanitizeAndLintSteps(td.steps);
        const faltas = exigenciasNaoCumpridas(escolha!, q.steps);
        const etapasFora = q.steps.length < LIMITE_ETAPAS.min || q.steps.length > LIMITE_ETAPAS.max ? [`o simulador deve ter de ${LIMITE_ETAPAS.min} a ${LIMITE_ETAPAS.max} etapas (tem ${q.steps.length})`] : [];
        return { steps: q.steps, warnings: q.warnings, problemas: [...q.warnings, ...faltas, ...etapasFora] };
      };
      let melhor = avaliar(toolData);
      let revisoes = 0;
      while (melhor.problemas.length > 0 && revisoes < 1) {
        revisoes++;
        try {
          const revisado = await gerar([
            ...mensagens,
            { role: "assistant", content: JSON.stringify(toolData) },
            { role: "user", content: montarPedidoDeRevisao(melhor.problemas) },
          ]);
          if (revisado) {
            const avaliada = avaliar(revisado);
            if (avaliada.problemas.length <= melhor.problemas.length) { melhor = avaliada; toolData = revisado; }
          }
        } catch (revErr) {
          console.warn("generate-tool: revisão falhou, mantendo a primeira versão:", revErr);
          break;
        }
      }
      if (melhor.problemas.length) console.warn("generate-tool problemas restantes:", melhor.problemas);
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
          steps: melhor.steps,
        },
      };
      return new Response(JSON.stringify({
        tool: result,
        quality_warnings: melhor.problemas,
        skills_used: escolha.skills.map((x) => ({ id: x.id, nome: x.nome })),
        skills_source: escolha.origem,
        revisions: revisoes,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // ─── Calculadora: fluxo inalterado ───
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
  } catch (e) {
    console.error("generate-tool error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
