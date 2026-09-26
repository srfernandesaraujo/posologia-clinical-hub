# Padrão de desafios do Modo Desafio

Padrão validado com a professora/o professor nos 5 casos do simulador de Hepatopatias (commits 18e86ed … a5f4c92).
Vale para qualquer simulador, de qualquer categoria. Exemplos vêm de `getHeppatopatiaChallenges` em `src/data/simulatorChallenges.ts`.

## 1. Objetivo pedagógico

O aluno **mexe no simulador → lê o resultado → interpreta → decide (em grupo)**. Um desafio que se resolve só de memória
("qual o mecanismo da NAC?") está errado para este produto. A pergunta certa é "o que os números que você acabou de gerar
sustentam para a conduta deste paciente?".

## 2. Anatomia de um desafio de ajuste (`type: "adjust"` + `options`)

| Campo | O que deve ter |
|---|---|
| `context` | "Onde fica cada coisa: …" com os **nomes exatos** dos cards, controles, medidores e eixos, lidos da UI real. Resolve o problema "termos que não estão claros onde estão". |
| `question` | (1) situação clínica com **os números do caso**; (2) comando explícito do que testar, **um por vez**, com nomes e doses exatos; (3) o que comparar (medidor, linha do gráfico, barra); (4) "Discutam em grupo…" e o que **deixar selecionado**; (5) a pergunta interpretativa. Um "colega/residente" pode propor uma conduta plausível porém errada. |
| `validator(state)` | Confere o **estado final** deixado na tela: a conduta pedida está selecionada e a premissa numérica vale (ex.: "INR praticamente inalterado com a vitamina K"). Feedback específico para cada falha. |
| `options` (4) | Ver seção 4. |
| `explanation` | Cita os **números do simulador**, explica por que cada erro tentador é errado, liga a outros casos e termina na conduta. |
| `reference` | Fonte real (diretriz, artigo). Só cite o que você tem certeza que existe. |

Desafios de memorização puros (`type: "mcq"`) só entram quando são aplicação com dados do caso: cálculo (fator R, gramas de
proteína, AST/ALT), interpretação de marcador, plano de alta/retomada.

## 3. Mix por caso (6 desafios, pelo menos 3 de ajuste)

- **Comparação de condutas**: qual muda o marcador que importa? (NAC × vitamina K × albumina).
- **Revisão de prescrição multi-item** ("problema quase real"): 3–4 itens; itens testáveis no simulador + itens de
  raciocínio clínico; cada distrator erra **um** item; os outros ficam idênticos entre as opções.
- **Contraste entre casos**: mesmos números, contexto diferente, conduta diferente (lactulose no Caso 3 × Caso 5).
- **Lesão × função**: transaminases altas com função normal (Caso 4, músculo) × transaminases baixas com função falida (Caso 3).
- **Cálculo com os dados do caso** (MCQ): o resultado decide a interpretação e a conduta.
- **Seguimento**: o que o 7º dia mostra, quando retomar, plano de alta.
- **Armadilha do número bonito**: o simulador mostra algo que "parece bom" (albumina sobe, INR cai) mas não trata a causa.

Encadeie os desafios: o resultado de um vira dado do seguinte ("guarde o resultado da suspensão do desafio anterior").

## 4. Regras das alternativas (exigência explícita do usuário)

1. **Comprimento parecido.** Alvo: dentro de ±10% da média; a correta nunca é a mais longa nem a mais curta com folga.
   Meça com `scripts/auditar-desafios.cjs`. Ajuste os **distratores** para cima, não só a correta para baixo.
2. **Posição da correta variada.** Nunca ≥ 50% dos desafios do caso na mesma letra; nunca "sempre B". Use ≥ 3 posições.
3. **Mesmo fato observado em todas.** Se o enunciado diz que o K⁺ caiu, as 4 alternativas afirmam que caiu e diferem no
   mecanismo/decisão. Senão o aluno elimina por coerência, sem raciocinar.
4. **Sem absolutos nos distratores** (sempre, nunca, apenas, somente, em nenhum cenário, toda…).
5. **Distratores plausíveis, cada um com um erro definido**: leitura parcial dos números; mecanismo errado; limiar/critério
   errado; conduta que ignora o contexto; armadilha do número bonito; efeito atribuído ao órgão errado.
6. **Sem marca própria da correta**: só ela citando números, só ela com ressalva, só ela com termo do enunciado, ou dois
   distratores repetindo o mesmo número.
7. **Estrutura idêntica** nas revisões de prescrição (mesma ordem de itens, mesmas frases), mudando só o item errado.
8. Nada de "todas as anteriores" / "nenhuma das anteriores".
9. Um distrator pode ser refutado **testando outra dose ou outro fármaco no simulador** — isso é ótimo (força o uso do sim).

## 5. Regra de ouro: verifique no motor antes de escrever

Nunca afirme o que um gráfico ou medidor vai mostrar sem **calcular**. Erros reais já pegos assim: INR invisível por
dividir o eixo com ALT (milhares); isoniazida com efeito só após 14 dias num simulador de 7; paracetamol piorando exames
em 500 mg na cirrose; "esquema atual" inexistente; desfecho (amônia, CPK) que o simulador nem modelava.

- Replique `computeSimulation` num script Node (ver `scripts/exemplo-regressao-hepatopatias.cjs`).
- Anote no **cabeçalho do bloco de cada caso** os números verificados (comentário).
- Se o motor não consegue mostrar o desfecho que a pergunta exige, **evolua o motor** (ver `arquitetura.md`).

## 6. Coerência clínica e do caso

- Confira cada afirmação clínica contra diretriz. Pegos: esquema RIPE em tuberculose latente; "Child-Pugh alta gravidade"
  com 9 pontos (classe B); lactulose como 1ª linha na encefalopatia da falência hepática aguda; AST/ALT ">2" com razão 1,4;
  fluconazol como inibidor "potente" da CYP3A4 (é moderado).
- Texto do caso, dados estruturados, `expectedDrugs` e `clinicalTip` precisam concordar com os desafios.
- Texto do caso **não pode entregar o diagnóstico** (commit 82e049b): só achados e valores.
- Inconsistência fisiológica no cenário (ex.: ALT 3500 com ingestão há 10 h): **sinalize ao usuário**, não mude em silêncio.

## 7. Erros já cometidos (não repita)

- Correta mais longa / mais curta que as outras. Correta sempre na mesma posição.
- Distratores com "nunca/sempre/em nenhum cenário".
- Enunciado citando "badge", "seletores", "painel" sem dizer onde ficam.
- Validator que só checa o fármaco e aceita qualquer coisa; validator impossível de satisfazer (isoniazida no Caso 2).
- Confundir marcador de lesão (transaminases, CPK) com função (bilirrubina, INR, albumina).
- Reaproveitar texto de um caso em outro sem reler os dados do caso.
