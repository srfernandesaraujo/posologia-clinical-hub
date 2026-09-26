# Skills do criador de simuladores

`generate-tool` (simuladores personalizados, plano Premium) não usa mais um prompt único para todos os tipos. O fluxo é:

1. **Roteador** (`index.ts`): uma chamada de IA curta escolhe 1 a 3 skills para o pedido, o número de etapas, a categoria e as
   3 a 5 decisões centrais que o aluno vai treinar. Se a IA falhar ou devolver lixo, cai no fallback por palavras-chave
   (`escolherSkillsPorPalavras`); na edição de um simulador existente usa só as palavras-chave.
2. **Gerador**: o prompt é montado por `montarPromptDoGerador` = base pedagógica + catálogo de painéis + **só os playbooks
   escolhidos** + regras gerais. A ferramenta (JSON schema) aceita o painel `modelo`.
3. **Revisão automática**: `sanitizeAndLintSteps` (`../simulator-quality.ts`) embaralha alternativas, valida `explorer` e
   `modelo` (toda fórmula é avaliada nos valores padrão e nos extremos de cada controle) e aponta alternativa correta mais
   longa/curta, absolutos, etapa sem decisão. `exigenciasNaoCumpridas` confere os painéis que as skills exigem. Se há
   problemas, o simulador volta à IA **uma vez** com a lista; fica a versão com menos problemas. A resposta traz
   `skills_used`, `quality_warnings` e `revisions`, e a interface mostra isso ao usuário.

## Painel `modelo`

Parâmetros ajustáveis (controles deslizantes) + resultados e curvas calculados por fórmulas, sem motor escrito à mão. Renderizado por
`src/components/simulators/ModeloPanel.tsx` (usado em `src/pages/ToolDetail.tsx`). As fórmulas rodam em
`src/lib/safeExpr.ts` (sem `eval`); **`_shared/safe-expr.ts` é uma cópia idêntica** (a edge function não importa de `src/`),
e `src/lib/safeExpr.test.ts` falha se as duas divergirem.

## Como criar uma skill nova

1. Acrescente um objeto `SimulatorSkill` em `skills.ts` (`id`, `quandoUsar` numa frase, `palavrasChave`, `categoriaSugerida`
   entre `CATEGORIAS_SIMULADOR`, faixa de `etapas`, `exige` só para o que é essencial ao tipo) e inclua-o em `TODAS_AS_SKILLS`.
2. O `playbook` começa com `SKILL: NOME` e traz: estrutura de etapas sugerida, regras do domínio, números a calcular antes
   de escrever, distratores plausíveis e o que não fazer. Só cite normas, limites e doses de que se tenha certeza.
3. `npx vitest run src/lib/simulatorSkills.test.ts` valida o registro (categoria, etapas, tamanho do playbook, ids do roteador).
   Acrescente um pedido de exemplo ao teste de fallback por palavras-chave.
4. Faça o deploy da função (o CI já publica as edge functions no push).

Padrão pedagógico que todas as skills herdam: `.claude/skills/revisar-desafios-simulador/references/padrao-de-desafios.md`.
