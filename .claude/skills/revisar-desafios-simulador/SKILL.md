---
name: revisar-desafios-simulador
description: Revisa e reescreve os desafios (Modo Desafio) de um simulador da Posologia Clinical Hub no padrão "mexe no simulador → interpreta → decide em grupo", caso a caso. Use quando o usuário pedir para revisar/analisar/reescrever os desafios, casos ou alternativas de um simulador, quando um professor reclamar que as perguntas são de memorização, que a alternativa correta é a maior ou fica sempre na mesma letra, que o enunciado não diz onde estão os controles, ou que o gráfico não reage. Funciona em qualquer categoria de simulador.
argument-hint: "<simulador ou categoria> [caso N]"
---

# Revisar desafios de simulador

Fluxo usado para reescrever os 5 casos de Hepatopatias, generalizado. O usuário costuma **revisar cada caso enquanto você
trabalha no próximo**: entregue caso a caso, com o typecheck limpo e a auditoria verde, e **só faça commit/push quando ele
disser** ("pode dar push"). Cada push dispara o deploy automático.

Leia antes de começar:
- `references/padrao-de-desafios.md`: o padrão pedagógico e as regras das alternativas (é o critério de "pronto").
- `references/arquitetura.md`: onde tudo fica, idiomas de motor e armadilhas de ferramenta.

## Etapa 0: escopo

1. Identifique o simulador e o caso: `$ARGUMENTS`. Se for uma categoria inteira, trabalhe **um simulador por vez, um caso
   por vez**, sem esperar aprovação entre casos, mas parando antes do commit.
2. Localize: a página (`src/pages/simuladores/<categoria>/Simulador*.tsx`), a função `getXChallenges` em
   `src/data/simulatorChallenges.ts` e o estado que a página passa ao `SimulatorChallengeMode`.
3. Leia o feedback do usuário (imagens e texto) e liste os defeitos **literais** que ele apontou; eles são requisitos.

## Etapa 1: diagnóstico (sem editar ainda)

```bash
node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs getXChallenges 8
```
Mostra tipos, posição da correta, tamanhos das alternativas e alertas (correta mais longa/curta, mesma letra, poucos
ajustes, sem `context`, validator ausente, absolutos nos distratores). Depois leia o simulador de verdade:

- Dados de cada caso: `BUILT_IN_CASES`, texto do cenário, `expectedDrugs`/`clinicalTip`/referências.
- **Motor**: o que cada controle produz, com que escala, em que janela de tempo, o que **não** é modelado.
- **UI**: nomes exatos dos cards, medidores, eixos. Onde o usuário achou "termos que não estão claros"?
- Verifique cada afirmação do desafio antigo contra o motor e contra a literatura. Liste as falhas por classe:
  memorização; alternativas entregando a resposta; afirmação que o motor não sustenta; desfecho não modelado; efeito fora
  da janela; inconsistência clínica ou do texto do caso; UI que não explica.

## Etapa 2: corrija o motor primeiro, se preciso

Se o simulador **não consegue mostrar** o que a pergunta exige, evolua o motor (padrões em `arquitetura.md`): variável
opcional, conduta sem dose, efeito por gravidade, dose segura, estado clínico inicial, eixos do gráfico, card que explica
um escore. Regras: só campos **opcionais**; não altere o comportamento dos outros casos; passe campos novos pela Sala
Virtual; documente no cabeçalho do bloco o que foi adicionado. Diga ao usuário, no resumo, **cada mudança de motor e por quê**.

## Etapa 3: calcule antes de escrever (regra de ouro)

Escreva um script (com a ferramenta **Write**, não heredoc) que faz `eval` dos arrays do motor e replica o cálculo. Modelo:
`scripts/exemplo-regressao-hepatopatias.cjs`. Tire os números de **cada** fármaco/dose/conduta que o enunciado pedir para
testar, inclusive limiares de escores. Nada de "≈ 71" sem ter calculado.

## Etapa 4: escreva os desafios

Por caso: 6 desafios, ≥ 3 de ajuste (`adjust` + `options`), no mix de `padrao-de-desafios.md`. Para cada um:
1. `context` com "Onde fica cada coisa".
2. Enunciado: caso + o que testar (um por vez, doses exatas) + o que comparar + "Discutam em grupo…" + pergunta.
3. `validator`: confere a conduta pedida **e** a premissa numérica; um feedback por falha.
4. Quatro alternativas conforme as regras (comprimento, posição, mesmo fato, sem absolutos, um erro por distrator).
5. `explanation` com os números do simulador e `reference` real.

Trabalhe num arquivo temporário por caso (Write) e emende em `simulatorChallenges.ts` entre os marcadores `// Caso N:`
(script pequeno com `s.index(marcador, inicio)`). Mantenha o comentário-cabeçalho do bloco com os números verificados e
mantenha `caseNames` sincronizado.

Ajuste os dados do caso quando necessário (texto do cenário com os valores que o motor usa, `expectedDrugs`, `clinicalTip`),
sem spoilers de diagnóstico. **Não mude em silêncio** inconsistências fisiológicas do cenário: avise o usuário.

## Etapa 5: verificação (todas obrigatórias)

```bash
npx tsc -p tsconfig.app.json --noEmit                      # sem saída = ok
node .claude/skills/revisar-desafios-simulador/scripts/auditar-desafios.cjs getXChallenges 8   # deve terminar sem alertas
node <sua-regressao>.cjs   # validators: passam com a conduta pedida e bloqueiam a errada, em TODOS os casos
```
Regressão deve incluir casos **negativos** e os casos que você não editou (o motor é compartilhado). Não consegue abrir o
navegador? Diga isso claramente no resumo; não afirme que "testei" a interface.

## Etapa 6: complete o ecossistema do simulador

- `supabase/functions/generate-case/index.ts`: `SIMULATOR_PROMPTS[slug]` existe e produz o formato exato do caso
  (incluindo campos opcionais e o preset clínico)? Se não, crie. (Os 8 simuladores de Farmacoterapia Laboratorial não tinham.)
- `src/data/nativeSystemPrompts.ts`: entrada `sim-<slug>` descrevendo o simulador e o padrão de desafios.
- `src/data/nativeCaseCatalog.ts`: títulos/dificuldade na mesma ordem de `BUILT_IN_CASES`.
- Regra do `CLAUDE.md`: `doc-sync` só se o catálogo visível mudou (novo simulador, categoria, função de borda, feature de
  primeiro nível). Revisão de desafios e ajuste de motor **não** exigem.

## Etapa 7: entregue

Resumo curto por caso, em português, com: o que estava errado (com o número/fato), o que mudou no simulador, os desafios em
uma linha cada, o que **não** foi feito, e a pergunta "posso commitar e dar push?". Commit em português, no estilo do
histórico, terminando com a linha `Co-Authored-By` indicada pela sessão. Depois do push, lembre o usuário de fazer refresh
forçado (Ctrl+Shift+R) e testar um caso completo no navegador.

Atualize a memória do projeto ao concluir um simulador (o que foi feito, aprendizados novos), sem duplicar o que já está no repositório.

## Adaptando a outras categorias

Mesmos passos, motor diferente. Localize o estado enviado ao `SimulatorChallengeMode`, replique a função de cálculo, e
converta desafios antigos com `targetParams` (faixas) em `validator` + `options`. Se o simulador não tem motor (só
perguntas), o "ajuste" precisa de algo para ajustar: avalie com o usuário se vale criar o motor mínimo ou manter MCQ de
aplicação com dados do caso (nunca memorização). Ao rodar a auditoria em simuladores ainda no padrão antigo, espere
dezenas de alertas de comprimento, poucos ajustes e ausência de `context`: é o retrato do que falta.

## Definição de pronto

- [ ] Auditoria sem alertas; correta em ≥ 3 letras diferentes, sem "sempre B".
- [ ] Todo enunciado de ajuste diz onde ficam os controles e o que deixar selecionado.
- [ ] Todo número citado foi calculado no motor; todo validator testado (positivo e negativo).
- [ ] Nenhuma afirmação clínica sem checagem; referências reais.
- [ ] Motor: mudanças só opcionais, outros casos intactos, Sala Virtual repassa os campos novos.
- [ ] `generate-case` e `nativeSystemPrompts` cobrem o simulador.
- [ ] Typecheck limpo; resumo honesto sobre o que não foi testado no navegador; push só com autorização.
