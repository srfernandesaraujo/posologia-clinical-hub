# Onde as coisas ficam (e como evoluir o motor)

## Arquitetura dos desafios

- **Componente do modo desafio:** `src/components/simulators/SimulatorChallengeMode.tsx`. Tipos `MCQChallenge`,
  `AdjustChallenge` (`options` + `correctIndex` opcionais = **modo híbrido**: passa só se o `validator` E a alternativa
  estiverem certos), `ChallengeSet`. `context` aparece como nota com lâmpada acima do enunciado. `onResetForChallenge` não é
  passado pelos simuladores de Farmacoterapia Laboratorial: **o estado do simulador persiste entre desafios**.
- **Conteúdo dos desafios nativos:** `src/data/simulatorChallenges.ts`, uma função `getXChallenges(caseIndex?)` por
  simulador, com `caseSets: Challenge[][]` (um array por caso, na ordem de `BUILT_IN_CASES`) e um array `caseNames`
  (sincronize os dois; já quebrou antes). Novo simulador: registre também em `getChallengesBySlug` se o slug for usado ali.
- **O que o `validator` recebe:** o objeto `simulatorState` que a página passa para `<SimulatorChallengeMode>`. Cada
  simulador define suas chaves; **leia a página**. Em Hepatopatias: `drug, dose, labGauges, sideEffects[{name,risco}],
  trend, lastLab, baseLab, childPugh{class,score,parts}, encefalopatia, ascite`.
- **Casos nativos:** `BUILT_IN_CASES` na página do simulador. `src/data/nativeCaseCatalog.ts` precisa de uma entrada por
  slug com títulos e dificuldade **na mesma ordem** (a Sala Virtual resolve o caso por índice em `useVirtualRoomCase`).
- **Salas Virtuais:** `useVirtualRoomCase` devolve o caso nativo por índice; a página remonta o caso **campo a campo** num
  `useEffect`. Campo novo no caso ⇒ repassar lá (`clinical`, `flags` já foram; `baseLab` vai inteiro).
- **Casos gerados por IA** (`generate-case` → tabela `simulator_cases`): não trazem campos opcionais novos e **hoje caem
  no conjunto de desafios do caso 0** (`idx < 0 → undefined → caseSets[0]`). Achado aberto: desafio de outro paciente.
- **Desafios personalizados do professor:** `ChallengeEditor` (MCQ e ajuste com `validationRules`, sem função). Não usa
  o padrão de `validator`.
- **Simuladores criados por usuários (Premium):** função `generate-tool` gera `formula.type = "simulator"` (steps e
  painéis) renderizado em `src/pages/ToolDetail.tsx`. Sem motor: o "ajuste" é o painel `explorer`.
- **Prompts nativos** (`src/data/nativeSystemPrompts.ts`, chave `sim-<slug>`) alimentam o `AdminPromptViewer`;
  `supabase/functions/generate-case/index.ts` (`SIMULATOR_PROMPTS[slug]`) define o formato JSON do caso gerado por IA.
  **Todo simulador revisado deve ter os dois.**

## Simuladores com motor em `src/lib` e uma bancada por etapa (padrão da Cadeia de Suprimentos)

Quando o simulador tem várias "mesas" de trabalho (uma por etapa), o motor vira funções puras em `src/lib/<nome>/`, com testes
que fixam cada número citado nos desafios; a página só escolhe a bancada do caso e repassa o estado dela ao `SimulatorChallengeMode`
(cada bancada envia `{ etapa, ...estado, resultado }` por `onState`). `simulatorChallenges.ts` não pode importar o motor (o
`auditar-desafios.cjs` carrega só esse arquivo), então os números ficam nos textos e a regressão fica no teste do motor.
Casos por IA: só dados de entrada + validação de que o caso é resolvível (edge function) + `desafiosAutomaticos` (desafio único
verificado pelos critérios do motor), porque o conjunto escrito à mão é por caso nativo.

## Idiomas de motor que já existem em `SimuladorHepatopatia.tsx` (copie o padrão)

| Necessidade | Solução usada |
|---|---|
| Efeito depende da gravidade do caso | `indicationCheck(lab) → multiplicador` (pode passar de 1) |
| Dose segura no caso (ex.: paracetamol ≤ 2 g na cirrose) | `safeDose(lab) → número \| null` |
| Conduta sem dose ("suspender o suspeito", "manter esquema atual") | pseudo-fármaco com `noDose: true` (slider oculto) |
| Conduta que só faz sentido em um caso | `caseFlag` no fármaco + `flags` no caso; a lista filtra |
| Desfecho que o motor não modelava (amônia, CPK) | campo opcional em `baseLab` + `effects`; medidor **só aparece** se o caso define |
| Estado clínico inicial (encefalopatia, ascite) | `clinical` no caso; `useEffect` na troca de caso; repassar na Sala Virtual |
| Efeito fora da janela simulada | conferir `daysToEffect` × dias simulados (isoniazida 14 d num sim de 7 d nunca agia) |
| Variáveis em escalas muito diferentes num gráfico | eixos separados; eixo do enzimático sem partir do zero; linha de basal |
| Texto ilegível em tooltip no tema escuro | `contentStyle/labelStyle/itemStyle` com `hsl(var(--foreground))` |
| Estado preso entre casos | resetar fármaco/dose ao trocar de caso |

Regras: campos novos **opcionais** (casos por IA e do marketplace não os têm); preserve o comportamento dos demais casos e
rode a regressão de todos os casos, não só do que você está mexendo.

## Outras categorias

Os simuladores de Fisiologia, Farmacologia, Bioquímica, Genética, Química Farmacêutica e Farmacotécnica têm motores
diferentes (fórmulas com sliders, `targetParams` com faixas). O padrão pedagógico é o mesmo; muda **onde** você lê os
números: leia a página, ache o estado que ela envia ao `SimulatorChallengeMode`, replique a função de cálculo e use a mesma
técnica de auditoria. Quando o desafio antigo usa `targetParams` (faixas), converta para `validator` que confere o estado
**e** a premissa numérica, mantendo o `options` para a interpretação.

## Armadilhas de ferramenta (Windows / Git Bash)

- Regex com `\` em heredoc do shell é corrompido: grave scripts com a ferramenta **Write** e rode com `node`/`python3`.
- Python no Windows imprime em cp1252: evite `→`, `≈` no `print` (ou use `PYTHONIOENCODING=utf-8`).
- Typecheck: `npx tsc -p tsconfig.app.json --noEmit` (o `tsc -p .` não checa nada neste repositório).
- Aviso "LF will be replaced by CRLF" do git é só formatação de linha.
- Edite o bloco de um caso por marcadores `// Caso N:` em arquivo temporário e emende; conferir que os comentários de
  marcação continuam presentes.
