import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

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

    const { action, prompt, plan } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 1: Generate implementation plan ──
    if (action === "plan") {
      const { data } = await callAI({
        messages: [
          {
            role: "system",
            content: `Você é um arquiteto de jogos clínicos premium para uma plataforma de educação farmacêutica. Você cria planos de implementação DETALHADOS e PROFISSIONAIS para jogos educacionais clínicos interativos.

CONTEXTO DA PLATAFORMA:
- Jogos são componentes React + TypeScript renderizados dentro de um Card
- Usam componentes compartilhados: GameNarrative (briefing), GameDifficultySelector (fácil/médio/difícil), GameStarsResult (resultado com estrelas), GameFeedbackOverlay (feedback formativo)
- Integrados com sistema de gamificação (pontos, ranking)
- Suportam "Atualizar com IA" para gerar novos conteúdos via aiPrompt
- Usam Tailwind CSS, Lucide icons, shadcn/ui, recharts para gráficos, canvas-confetti

GÊNEROS DISPONÍVEIS (pode combinar):
- RPG por turnos (combate, skills, árvore de habilidades)
- Quiz progressivo (dificuldade crescente, ajudas/lifelines)
- Simulador de gestão (recursos, investimentos, portfólio)
- Escape Room (pistas, inventário, timer de urgência)
- Puzzle/Estratégia (tabuleiro, resta 1, dominó)
- Plataformer 2D (canvas ou divs, coleta, obstáculos)
- Investigação/Detetive (Naranjo, árvore de decisão)
- Jogo de cartas (deck building, combos)
- Tower Defense (ondas, torres, upgrades)
- Simulação de Equipamentos (bombas, monitores, LCD)
- Match-3 / Candy Crush (combinação, cascata)
- Rhythm Game (timing, sequências)
- Survival / Roguelike (runs, upgrades permanentes)

PADRÃO DE QUALIDADE PREMIUM OBRIGATÓRIO:
1. **Narrativa Clínica Imersiva**: Briefing cinematográfico com contexto clínico real, paciente com nome e história
2. **Profundidade Farmacológica**: Mecanismos de ação, farmacocinética, interações CYP, RAM documentadas
3. **Múltiplos Cenários**: Mínimo 3 cenários/fases com variação clínica real
4. **Sistema de Dificuldade**: 3 níveis que alteram mecânicas (timer, vidas, complexidade)
5. **Feedback Formativo**: Cada decisão gera feedback com referência bibliográfica
6. **Visualizações Dinâmicas**: Gráficos recharts, animações, indicadores visuais
7. **Replay Value**: Conteúdo randomizado, modos extras, desafios
8. **Diferencial de Mercado**: Mecânicas únicas que não existem em outros apps educacionais

REGRAS DO PLANO:
- Retorne em Markdown bem formatado
- Inclua seções: Visão Geral, Impacto Educacional, Mecânicas de Jogo, Narrativa, Fases/Cenários, Sistema de Pontuação, Diferencial de Mercado, Estrutura de Dados (aiPrompt), Componentes Visuais
- Seja EXTREMAMENTE detalhado — cada mecânica deve ser descrita com precisão
- Proponha métricas de aprendizado (o que o aluno aprende em cada fase)
- O plano deve ser tão bom que um desenvolvedor sênior consiga implementar sem ambiguidades`,
          },
          {
            role: "user",
            content: `Crie um plano de implementação PREMIUM e DETALHADO para o seguinte jogo clínico:

"${prompt}"

IMPORTANTE: O plano deve ser inovador, com grande diferencial de mercado, alta complexidade técnica e profundidade farmacológica real. Não seja genérico — seja específico e criativo.`,
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

    // ── STEP 2: Generate game code from plan ──
    if (action === "generate") {
      if (!plan) {
        return new Response(JSON.stringify({ error: "Plano é obrigatório para gerar" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data } = await callAI({
        messages: [
          {
            role: "system",
            content: `Você é um engenheiro de software sênior especializado em jogos React/TypeScript para educação farmacêutica. Você gera componentes React COMPLETOS e FUNCIONAIS.

TECNOLOGIAS DISPONÍVEIS:
- React 18 + TypeScript
- Tailwind CSS com tokens semânticos (bg-primary, text-foreground, bg-muted, border-border, etc.)
- shadcn/ui: Button, Card, Badge, Dialog, Progress, Tabs, etc.
- Lucide React icons
- recharts para gráficos (AreaChart, LineChart, BarChart, etc.)
- canvas-confetti para celebrações
- framer-motion NÃO disponível
- toast via: import { toast } from "sonner"

COMPONENTES COMPARTILHADOS OBRIGATÓRIOS:
\`\`\`tsx
import GameNarrative from "@/components/games/GameNarrative";
// Props: { title, narrative, onStart } — tela de briefing inicial

import GameDifficultySelector from "@/components/games/GameDifficultySelector";
// Props: { onSelect: (d: "easy"|"medium"|"hard") => void } — seletor de dificuldade

import GameStarsResult from "@/components/games/GameStarsResult";
// Named export: calculateStars(score, maxScore, errors?) → 0-3
// Props: { score, maxScore, timeSeconds?, errors?, title, subtitle?, onRestart, onBack?, details? }

import GameFeedbackOverlay from "@/components/games/GameFeedbackOverlay";
// Props: { isCorrect, title, message, details?, onContinue }
\`\`\`

ESTRUTURA OBRIGATÓRIA DO COMPONENTE:
\`\`\`tsx
interface Props { customData?: any; }

export default function NomeDoJogo({ customData }: Props) {
  // Use customData para sobrescrever dados padrão (permite "Atualizar com IA")
  // Implemente: narrativa → dificuldade → gameplay → resultado com estrelas
}
\`\`\`

REGRAS CRÍTICAS:
1. O componente DEVE ser auto-contido num único arquivo .tsx
2. DEVE usar os componentes compartilhados (GameNarrative, GameDifficultySelector, GameStarsResult, GameFeedbackOverlay)
3. DEVE ter dados padrão hardcoded que podem ser sobrescritos via customData
4. DEVE ter fluxo: Narrativa → Dificuldade → Jogo → Resultado
5. Use APENAS tokens semânticos Tailwind (bg-primary, text-foreground, etc.) — não hardcode cores exceto para indicadores clínicos específicos
6. Animações com CSS transitions/keyframes, NÃO framer-motion
7. Toast para feedback rápido: import { toast } from "sonner"
8. O código deve compilar sem erros e ser jogável imediatamente
9. MÍNIMO 300 linhas de código — jogos devem ser COMPLETOS e RICOS

RETORNE UM JSON com esta estrutura exata (use tool calling):`,
          },
          {
            role: "user",
            content: `Baseado neste plano de implementação, gere o jogo COMPLETO:

PEDIDO ORIGINAL: "${prompt}"

PLANO APROVADO:
${plan}

Gere o componente React COMPLETO e todos os metadados necessários.`,
          },
        ],
        temperature: 0.5,
        model: "google/gemini-3-flash-preview",
        tools: [
          {
            type: "function",
            function: {
              name: "create_clinical_game",
              description: "Cria um jogo clínico completo com código React/TypeScript",
              parameters: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "ID slug do jogo (ex: 'farmaco-tower', 'quiz-antibioticos')",
                  },
                  title: { type: "string", description: "Título do jogo em português" },
                  description: {
                    type: "string",
                    description: "Descrição curta (1 frase) para o card",
                  },
                  badge: { type: "string", description: "Badge do card (ex: '5 fases', 'Puzzle')" },
                  icon: {
                    type: "string",
                    description: "Nome do ícone Lucide (ex: 'Shield', 'Zap', 'Flame')",
                  },
                  iconBg: {
                    type: "string",
                    description: "Classe Tailwind de fundo do ícone (ex: 'bg-purple-100')",
                  },
                  iconColor: {
                    type: "string",
                    description: "Classe Tailwind de cor do ícone (ex: 'text-purple-600')",
                  },
                  howToPlay: {
                    type: "string",
                    description: "Texto completo de instruções 'Como Jogar' com emojis e formatação",
                  },
                  aiPrompt: {
                    type: "string",
                    description:
                      "Prompt para o sistema 'Atualizar com IA' — descreve a estrutura JSON que a IA deve gerar para atualizar o conteúdo do jogo",
                  },
                  componentCode: {
                    type: "string",
                    description:
                      "Código TypeScript/React COMPLETO do componente do jogo. Deve ser um componente funcional com export default. MÍNIMO 300 linhas.",
                  },
                },
                required: [
                  "id",
                  "title",
                  "description",
                  "badge",
                  "icon",
                  "iconBg",
                  "iconColor",
                  "howToPlay",
                  "aiPrompt",
                  "componentCode",
                ],
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

      return new Response(JSON.stringify({ game: gameData }), {
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
    const status = msg.includes("RATE_LIMIT") ? 429 : msg.includes("PAYMENT_REQUIRED") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
