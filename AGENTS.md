# Posologia Clinical Hub

SPA React 18 + TypeScript + Vite, backend em Supabase (Postgres + Auth + Edge Functions). Plataforma de calculadoras clínicas, simuladores, laboratório virtual, jogos e salas virtuais para ensino/prática em saúde. Domínio de produção: `simulador.posologia.app`.

## Manter a documentação e o Oráculo sincronizados com o código

Este repositório tem três lugares que descrevem o catálogo de funcionalidades (calculadoras, simuladores, categorias, edge functions, stack técnico) de forma independente e hardcoded — eles **não** derivam automaticamente do código, então divergem com o tempo se ninguém os atualizar:

1. `src/pages/Documentacao.tsx` — documentação interna (funcionalidades + infraestrutura técnica)
2. `src/pages/DocumentacaoPublica.tsx` — FAQ pública (`/docs`)
3. `supabase/functions/oracle-agent/index.ts` — base de conhecimento estática (`SYSTEM_PROMPT`) do assistente de chat "Oráculo"

**Regra:** sempre que você implementar uma mudança que altera o catálogo — nova calculadora, novo simulador ou categoria de simulador, nova edge function, nova página/feature de primeiro nível, ou upgrade de versão de uma peça central do stack (React Router, Vite, Tailwind, etc.) — invoque o subagente `doc-sync` (via Task/Agent tool, `subagent_type: doc-sync`) antes de considerar a tarefa concluída. Não é opcional nem "se sobrar tempo": faz parte da definição de pronto da tarefa.

Para mudanças puramente de correção de bug ou refatoração interna que não afetam o catálogo visível ao usuário, não é necessário acionar o `doc-sync`.

### Como o Oráculo aprende sobre atualizações automaticamente

Além do `SYSTEM_PROMPT` estático, `oracle-agent/index.ts` consulta em tempo de requisição as 20 entradas mais recentes com `status='done'` da tabela `system_updates` (a mesma tabela por trás da página admin "Pipeline de Atualizações", `/admin/pipeline`) e injeta esse changelog no contexto do assistente. Isso significa que registrar uma entrada em `system_updates` faz o Oráculo "aprender" sobre a novidade imediatamente, sem precisar editar o prompt nem fazer redeploy da function.

O subagente `doc-sync` já sabe adicionar essa entrada (via migration SQL) como parte do seu fluxo — veja `.Codex/agents/doc-sync.md` para os detalhes completos do que ele audita e como.


## Desafios dos simuladores (Modo Desafio)

Todo simulador novo ou revisado segue o mesmo padrão: o aluno **mexe no simulador → lê o resultado → interpreta → decide em grupo**. Nunca perguntas de memorização, e nunca alternativas que entregam a resposta (correta mais longa/curta ou sempre na mesma posição, distratores com "sempre/nunca", afirmações que o motor não sustenta).

- **Revisar os desafios de um simulador existente:** use a skill `/revisar-desafios-simulador` (`.claude/skills/revisar-desafios-simulador/`). O padrão completo está em `references/padrao-de-desafios.md` e a auditoria automática em `scripts/auditar-desafios.cjs` (`node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs getXChallenges 8`). Os 5 casos de Hepatopatias são o modelo de referência (`getHeppatopatiaChallenges`, `SimuladorHepatopatia.tsx`).
- **Simuladores nativos** (motor em TypeScript): desafios em `src/data/simulatorChallenges.ts`; todo número citado num enunciado deve ser calculado no motor, e se o motor não consegue mostrar o desfecho perguntado, evolua o motor (campos opcionais, sem quebrar os outros casos, repassando os novos campos na Sala Virtual e em `loadAICase`).
- **Construtores por IA** seguem o mesmo padrão: `generate-tool` (simuladores personalizados; painel `explorer` = o "ajuste" sem motor), `generate-case` (casos; `SIMULATOR_PROMPTS[slug]` precisa existir para cada simulador), `supabase/functions/_shared/simulator-quality.ts` (embaralha alternativas e valida painéis em código) e `src/data/nativeSystemPrompts.ts` (entrada `sim-<slug>` com a seção "MODO DESAFIO"). Ao criar um simulador nativo, crie também o prompt em `generate-case` e a entrada em `nativeSystemPrompts`.
- Commit/push de revisões de desafios só quando o usuário autorizar ("pode dar push"); cada push dispara o deploy.
