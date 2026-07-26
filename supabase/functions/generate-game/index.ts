import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";
import { getFullAccess } from "../_shared/subscription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    if (!(await getFullAccess(userId))) {
      return new Response(JSON.stringify({ error: "Recurso exclusivo do plano Premium" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, prompt, plan } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: Generate implementation plan ──
    if (action === "plan") {
      const { data } = await callAI({ userId, promptType: "game-plan",
        messages: [
          {
            role: "system",
            content: `Você é um arquiteto de jogos clínicos premium para uma plataforma de educação farmacêutica. Você cria planos de implementação DETALHADOS e PROFISSIONAIS para jogos educacionais clínicos interativos.

CONTEXTO DA PLATAFORMA:
- Jogos são renderizados como quizzes interativos com múltiplas rodadas
- Cada rodada tem: cenário clínico contextual, pergunta, opções de resposta, feedback formativo com referência bibliográfica
- Suportam 3 níveis de dificuldade (Acadêmico, Clínico, Especialista) que afetam timer e vidas
- Integrados com sistema de gamificação (pontos, ranking, estrelas)
- Lifeline "Consulta Rápida" elimina uma opção incorreta
- Incluem narrativa imersiva com contexto clínico e paciente

O JOGO SERÁ GERADO COMO DADOS ESTRUTURADOS (rodadas de quiz), NÃO como código React. Portanto, o plano deve focar em:
1. Narrativa e contexto clínico (cenário hospitalar, paciente)
2. Estrutura das rodadas (cenários, perguntas, opções corretas/incorretas)
3. Progressão de dificuldade entre rodadas
4. Feedback formativo e referências bibliográficas
5. Diferencial de mercado e impacto educacional

PADRÃO DE QUALIDADE PREMIUM OBRIGATÓRIO:
1. **Narrativa Clínica Imersiva**: Briefing cinematográfico com contexto clínico real, paciente com nome e história
2. **Profundidade Farmacológica**: Mecanismos de ação, farmacocinética, interações CYP, RAM documentadas
3. **Múltiplas Rodadas**: Mínimo 8-12 rodadas com variação clínica real e progressão de dificuldade
4. **Feedback Formativo**: Cada decisão gera feedback com explicação detalhada e referência
5. **Diferencial de Mercado**: Mecânicas e conteúdo que não existem em outros apps educacionais

IMPORTANTE PARA JOGOS ESTILO "ADEDONHA"/PREENCHIMENTO:
- Adapte o conceito para rodadas de quiz: ex. "Letra A sorteada → Qual fármaco começa com A?" com opções
- Cada coluna (Fármaco, Mecanismo, Indicação, etc.) vira uma rodada separada com a mesma letra
- O jogador seleciona a resposta correta entre 4 opções, com feedback farmacológico após cada resposta

REGRAS DO PLANO:
- Retorne em Markdown bem formatado
- Inclua seções: Visão Geral, Impacto Educacional, Estrutura das Rodadas, Narrativa, Sistema de Pontuação, Diferencial de Mercado
- Seja EXTREMAMENTE detalhado — cada rodada/mecânica deve ser descrita com precisão`,
          },
          {
            role: "user",
            content: `Crie um plano de implementação PREMIUM e DETALHADO para o seguinte jogo clínico:

"${prompt}"

IMPORTANTE: O plano deve ser inovador, com grande diferencial de mercado e profundidade farmacológica real. Não seja genérico — seja específico e criativo. Lembre-se que o jogo final será um quiz interativo com rodadas, cenários, perguntas e feedback.`,
          },
        ],
        temperature: 0.7,
        model: "google/gemini-3-flash-preview",
      });

      const planContent = data.choices?.[0]?.message?.content;
      if (!planContent) throw new Error("IA não retornou conteúdo do plano");

      return new Response(JSON.stringify({ plan: planContent }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 2: Generate structured game data from plan ──
    if (action === "generate") {
      if (!plan) {
        return new Response(JSON.stringify({ error: "Plano é obrigatório para gerar" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await callAI({ userId, promptType: "game-generate",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em criação de jogos clínicos educacionais. Você gera DADOS ESTRUTURADOS para um motor de quiz interativo.

O MOTOR DE JOGO renderiza automaticamente:
- Tela de narrativa (briefing cinematográfico com paciente)
- Seletor de dificuldade (Acadêmico/Clínico/Especialista)
- Rodadas de quiz com: cenário contextual → pergunta → 4 opções → feedback formativo
- Timer por rodada (ajustado pela dificuldade)
- Sistema de vidas (hearts)
- Lifeline "Consulta Rápida" (elimina 1 opção errada)
- Tela de resultado com estrelas e confetes

VOCÊ DEVE GERAR:
1. **Metadados do jogo** (título, descrição, badge, ícone)
2. **Narrativa** (título, cenário/local, briefing, opcionalmente paciente)
3. **Configurações** (pontos por acerto/erro, timer por rodada)
4. **Rodadas** (mínimo 8, máximo 15) — cada uma com:
   - phase: fase/categoria da rodada (ex: "Letra A - Fármaco", "Caso 1 - Diagnóstico")
   - scenario: texto descritivo do cenário clínico (2-3 frases)
   - question: a pergunta específica
   - options: 4 opções com { text, isCorrect } — EXATAMENTE UMA correta
   - explanation: explicação detalhada com fundamento farmacológico (3-5 frases)
   - reference: referência bibliográfica (Goodman & Gilman, Rang & Dale, UpToDate, etc.)
   - tip: dica educativa adicional

REGRAS CRÍTICAS:
- Cada rodada deve ter EXATAMENTE 4 opções
- EXATAMENTE 1 opção deve ser isCorrect: true
- As opções incorretas devem ser plausíveis (não absurdas)
- Explicações devem ter profundidade farmacológica real
- Cenários devem ser clínicos e imersivos
- A progressão entre rodadas deve ter dificuldade crescente
- Para jogos estilo "Adedonha": use uma letra aleatória e crie rodadas por categoria (Fármaco, Mecanismo, Indicação, Efeito Colateral, Interação)

QUALIDADE DO CONTEÚDO:
- Use dados farmacológicos REAIS e CORRETOS
- Cite mecanismos de ação com alvos moleculares
- Inclua interações via CYP450 quando relevante
- Referencie guidelines e livros-texto reconhecidos`,
          },
          {
            role: "user",
            content: `Baseado neste plano de implementação, gere os dados estruturados COMPLETOS do jogo:

PEDIDO ORIGINAL: "${prompt}"

PLANO APROVADO:
${plan}

Gere o jogo com o máximo de qualidade farmacológica e educacional possível.`,
          },
        ],
        temperature: 0.5,
        model: "google/gemini-3-flash-preview",
        tools: [
          {
            type: "function",
            function: {
              name: "create_clinical_game",
              description: "Cria um jogo clínico completo com dados estruturados para o motor de quiz",
              parameters: {
                type: "object",
                properties: {
                  id: { type: "string", description: "ID slug do jogo (ex: 'adedonha-farma', 'quiz-antibioticos')" },
                  title: { type: "string", description: "Título do jogo em português" },
                  description: { type: "string", description: "Descrição curta (1 frase) para o card" },
                  badge: { type: "string", description: "Badge do card (ex: '10 rodadas', 'Quiz Clínico')" },
                  icon: { type: "string", description: "Nome do ícone Lucide (ex: 'BookOpen', 'Zap', 'Flame')" },
                  iconBg: { type: "string", description: "Classe Tailwind de fundo do ícone (ex: 'bg-purple-100')" },
                  iconColor: { type: "string", description: "Classe Tailwind de cor do ícone (ex: 'text-purple-600')" },
                  howToPlay: { type: "string", description: "Texto completo de instruções 'Como Jogar' com emojis e formatação" },
                  aiPrompt: { type: "string", description: "Prompt para 'Atualizar com IA' — descreve a estrutura JSON de rodadas que a IA deve gerar" },
                  gameConfigJson: {
                    type: "string",
                    description: `JSON stringified object with this exact structure:
{
  "narrative": {
    "title": "string - título narrativo do jogo",
    "setting": "string - local/cenário (ex: 'Hospital Universitário', 'Farmácia Clínica')",
    "patientName": "string optional - nome do paciente",
    "patientAge": "string optional - idade do paciente",
    "patientHistory": "string optional - histórico clínico resumido",
    "briefing": "string - texto de briefing narrativo imersivo (3-5 frases)"
  },
  "settings": {
    "pointsPerCorrect": number (ex: 100),
    "pointsPerError": number negative (ex: -20),
    "timerPerRound": number optional in seconds (ex: 30)
  },
  "rounds": [
    {
      "phase": "string optional - fase/categoria (ex: 'Letra A - Fármaco')",
      "scenario": "string - contexto clínico (2-3 frases)",
      "question": "string - a pergunta",
      "options": [
        { "text": "string", "isCorrect": boolean },
        { "text": "string", "isCorrect": boolean },
        { "text": "string", "isCorrect": boolean },
        { "text": "string", "isCorrect": boolean }
      ],
      "explanation": "string - explicação farmacológica detalhada (3-5 frases)",
      "reference": "string - referência bibliográfica",
      "tip": "string - dica educativa"
    }
  ]
}
Minimum 8 rounds, maximum 15. Exactly 4 options per round, exactly 1 correct.`,
                  },
                },
                required: ["id", "title", "description", "badge", "icon", "iconBg", "iconColor", "howToPlay", "aiPrompt", "gameConfigJson"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_clinical_game" } },
      });

      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("IA não retornou dados do jogo");

      const gameData = JSON.parse(toolCall.function.arguments);

      // Parse the gameConfig - may come as string or object depending on AI provider
      let gameConfig;
      try {
        if (typeof gameData.gameConfigJson === "string") {
          gameConfig = JSON.parse(gameData.gameConfigJson);
        } else if (typeof gameData.gameConfigJson === "object" && gameData.gameConfigJson !== null) {
          gameConfig = gameData.gameConfigJson;
        } else if (typeof gameData.gameConfig === "object" && gameData.gameConfig !== null) {
          // Some models return it without "Json" suffix
          gameConfig = gameData.gameConfig;
        } else {
          // Try to extract from the whole gameData
          const { id, title, description, badge, icon, iconBg, iconColor, howToPlay, aiPrompt, ...rest } = gameData;
          if (rest.narrative && rest.rounds) {
            gameConfig = rest;
          } else if (rest.gameConfigJson) {
            gameConfig = typeof rest.gameConfigJson === "string" ? JSON.parse(rest.gameConfigJson) : rest.gameConfigJson;
          } else {
            throw new Error("Nenhum gameConfig encontrado");
          }
        }
      } catch (parseErr) {
        console.error("gameConfig parse error:", parseErr, "raw gameData keys:", Object.keys(gameData));
        throw new Error("IA retornou gameConfig inválido: " + (parseErr instanceof Error ? parseErr.message : String(parseErr)));
      }

      // Validate minimum rounds
      if (!gameConfig.rounds || gameConfig.rounds.length < 3) {
        throw new Error("Jogo gerado com poucas rodadas");
      }

      // Build final game object
      const game = {
        id: gameData.id,
        title: gameData.title,
        description: gameData.description,
        badge: gameData.badge,
        icon: gameData.icon,
        iconBg: gameData.iconBg,
        iconColor: gameData.iconColor,
        howToPlay: gameData.howToPlay,
        aiPrompt: gameData.aiPrompt,
        gameConfig,
      };

      return new Response(JSON.stringify({ game }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: 'action deve ser "plan" ou "generate"' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-game error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = /\b429\b/.test(msg) ? 429 : /\b402\b/.test(msg) ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
