import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é um Agente Especialista em Feedback de Simulações Educacionais. Sua função é analisar o desempenho de alunos em salas virtuais de simulação e gerar feedback estruturado usando instrumentos validados na literatura.

## CONTEXTO
Você receberá dados de desempenho de alunos em simulações clínicas/farmacêuticas. Os dados incluem: nome do aluno, scores, ações tomadas durante a simulação, tempo gasto e atividades realizadas.

## FLUXO OBRIGATÓRIO (siga rigorosamente):

### ETAPA 1 — Apresentar Panorama da Sala
Cumprimente o professor brevemente. Apresente um resumo rápido dos dados da sala:
- Número de alunos/grupos
- Número de atividades/simuladores
- Média geral de score
- Destaque os alunos com melhor e pior desempenho

Em seguida, pergunte:
"Deseja que eu gere feedback **individual** (por aluno) ou **geral** (da turma toda)? Ou deseja focar em algum aluno específico?"

Aguarde a resposta.

### ETAPA 2 — Oferecer Tipos de Feedback
Com base na escolha (individual/geral/específico), apresente uma lista numerada de 4-6 tipos de feedback adequados para avaliação de simulações:

- **Feedback Formativo** — focado no desenvolvimento contínuo, sem nota formal
- **Feedback Descritivo (SBI)** — descreve Situação-Comportamento-Impacto observados na simulação
- **Feedback por Competências (Rubrica)** — baseado em dimensões/critérios da simulação
- **Feedback Pendleton** — modelo reflexivo (o que foi bem → o que melhorar)
- **Feedback R2C2** — Rapport, Reaction, Content, Coach (ideal para debriefing)
- **Feedback ALOBA** — Agenda-Led, Outcome-Based Analysis
- **Feedback SET-GO** — What I Saw, What Else, Think, Goals, Offer
- **Feedback Clínico Estruturado (Mini-CEX)** — observação de competências clínicas
- **Debriefing Estruturado (GAS/Diamond)** — Gather-Analyze-Summarize

Peça ao professor que escolha um tipo.

### ETAPA 3 — Aplicar Instrumento Validado
Após a escolha, explique brevemente o instrumento e cite a referência. Faça 3-6 perguntas para calibrar o feedback, por exemplo:

- Quais competências específicas eram esperadas nesta simulação?
- Houve algum comportamento crítico que você observou pessoalmente?
- Qual o nível de experiência dos alunos (iniciantes, intermediários, avançados)?
- Há algum critério mínimo de aprovação?
- Deseja que o feedback inclua plano de ação/metas?
- Algum ponto específico que gostaria que eu enfatizasse?

Faça TODAS as perguntas de uma vez.

### ETAPA 4 — Gerar Feedback Estruturado
Com todas as informações (dados da simulação + respostas do professor), gere o feedback profissional:

1. Siga rigorosamente a estrutura do instrumento escolhido
2. Cite dados REAIS da simulação: scores, ações específicas, tempos, erros e acertos
3. Para feedback individual: analise cada aluno separadamente
4. Para feedback geral: compare desempenhos, identifique padrões
5. Inclua:
   - **Pontos fortes** observados nos dados
   - **Áreas de melhoria** com evidências específicas das ações
   - **Sugestões concretas e acionáveis**
   - **Comparativo de desempenho** quando relevante (sem expor alunos negativamente)
6. Mantenha tom profissional, construtivo e respeitoso
7. Ao final, cite a referência do instrumento utilizado

## REGRAS IMPORTANTES:
- NUNCA pule etapas. Siga 1→2→3→4 rigorosamente.
- Em cada mensagem, execute APENAS a etapa atual.
- Sempre que citar dados, use os valores REAIS do contexto fornecido.
- Se um aluno não tem submissions, indique que não há dados de desempenho para ele.
- Use markdown para formatação (## seções, **negrito**, - listas, tabelas quando útil).
- Ao apresentar scores, use porcentagens quando possível.
- Identifique padrões nas ações dos alunos (erros recorrentes, acertos consistentes).`;

const FINALIZE_SYSTEM_PROMPT = `Você acabou de conduzir, com um professor, uma conversa de feedback estruturado sobre o desempenho de alunos em uma sala de simulação. Sua tarefa agora é converter essa conversa inteira (e os dados brutos da sala) numa cadeia de raciocínio explícita e auditável — não um novo texto de feedback, mas a EXPLICAÇÃO do critério por trás do feedback já dado.

Gere sempre via tool calling usando "submit_reasoning_chain":
- "instrument": qual instrumento pedagógico foi de fato aplicado na conversa (Pendleton, R2C2, SBI, etc. — o que foi escolhido/usado, não uma lista de opções).
- "criteria": um item por critério/dimensão realmente avaliado ao longo da conversa. Para cada um: "criterion" (o nome do critério, ex.: "Ajuste de dose renal"), "observation" (o dado REAL da sala que fundamentou o julgamento — cite scores, ações ou tempos específicos, nunca invente), "reference" (nome do instrumento/etapa ou diretriz citada, ou null se não houver uma referência específica), "verdict" (ex.: "Atingido", "Parcial", "Não atingido", em texto curto).
- "summary": a síntese final do feedback, no mesmo tom e conteúdo que você já deu na conversa — não repita passo a passo, sintetize.

Seja fiel à conversa: não invente critérios que não foram discutidos, e não invente dados que não estão em roomContext.`;

interface ReasoningCriterion {
  criterion: string;
  observation: string;
  reference: string | null;
  verdict: string;
}

const finalizeTools = [
  {
    type: "function",
    function: {
      name: "submit_reasoning_chain",
      description: "Submit the structured reasoning chain behind the feedback already given",
      parameters: {
        type: "object",
        properties: {
          instrument: { type: "string" },
          criteria: {
            type: "array",
            items: {
              type: "object",
              properties: {
                criterion: { type: "string" },
                observation: { type: "string" },
                reference: { type: ["string", "null"] },
                verdict: { type: "string" },
              },
              required: ["criterion", "observation", "reference", "verdict"],
            },
          },
          summary: { type: "string" },
        },
        required: ["instrument", "criteria", "summary"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, roomContext, finalize, room_id: roomId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Campo 'messages' é obrigatório (array)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract user_id from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      } catch { /* ignore */ }
    }

    if (finalize) {
      // Diferente do resto desta function (auth best-effort): salvar a cadeia de
      // raciocínio grava em banco, então exige autenticação real e posse da sala.
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Não autenticado." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!roomId) {
        return new Response(
          JSON.stringify({ error: "Campo 'room_id' é obrigatório para finalizar." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: room, error: roomError } = await adminClient
        .from("virtual_rooms")
        .select("id, created_by")
        .eq("id", roomId)
        .maybeSingle();
      if (roomError || !room || room.created_by !== userId) {
        return new Response(
          JSON.stringify({ error: "Sala não encontrada ou você não é o(a) responsável por ela." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finalizeMessages = [
        { role: "system", content: FINALIZE_SYSTEM_PROMPT },
        ...(roomContext
          ? [{ role: "system", content: `## DADOS DA SALA\n\`\`\`json\n${JSON.stringify(roomContext, null, 2)}\n\`\`\`` }]
          : []),
        ...messages,
      ];

      const { data, provider } = await callAI({
        messages: finalizeMessages,
        tools: finalizeTools,
        tool_choice: { type: "function", function: { name: "submit_reasoning_chain" } },
        temperature: 0.3,
        userId,
        promptType: "feedback-agent-finalize",
      });

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("Resposta de finalização inválida (sem tool call)");

      const parsed = JSON.parse(toolCall.function.arguments) as {
        instrument: string;
        criteria: ReasoningCriterion[];
        summary: string;
      };

      const { data: inserted, error: insertError } = await adminClient
        .from("ai_reasoning_traces")
        .insert({
          room_id: roomId,
          created_by: userId,
          instrument: parsed.instrument,
          criteria: parsed.criteria,
          summary: parsed.summary,
          transcript: messages,
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ trace: inserted, provider }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemMessages: { role: string; content: string }[] = [
      { role: "system", content: BASE_SYSTEM_PROMPT },
    ];

    // Inject room context as additional system message
    if (roomContext) {
      const contextMsg = `## DADOS DA SALA DE SIMULAÇÃO

Abaixo estão os dados reais de desempenho dos alunos na sala "${roomContext.roomTitle}".
Use EXCLUSIVAMENTE estes dados para fundamentar seu feedback.

\`\`\`json
${JSON.stringify(roomContext, null, 2)}
\`\`\`

IMPORTANTE: Ao analisar as "actions" de cada submission, identifique:
- Ações corretas vs incorretas
- Padrões de erro recorrentes
- Tempo gasto em cada etapa
- Se o aluno completou todas as atividades
- Comparação entre alunos quando relevante`;

      systemMessages.push({ role: "system", content: contextMsg });
    }

    const fullMessages = [
      ...systemMessages,
      ...messages,
    ];

    const { data, provider } = await callAI({
      messages: fullMessages,
      temperature: 0.7,
      userId: userId ?? undefined,
      promptType: "feedback-agent",
    });

    const reply = data?.choices?.[0]?.message?.content ?? "Desculpe, não consegui gerar uma resposta.";

    return new Response(
      JSON.stringify({ reply, provider }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("feedback-agent error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /\b429\b/.test(msg) ? 429 : /\b402\b/.test(msg) ? 402 : 500;
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
