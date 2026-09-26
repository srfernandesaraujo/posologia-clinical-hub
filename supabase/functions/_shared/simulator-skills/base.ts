/**
 * Partes do prompt que valem para TODO simulador criado: padrão pedagógico, catálogo de painéis e regras gerais.
 * Os playbooks por tipo ficam em ./skills.ts.
 */

export const CATEGORIAS_SIMULADOR = [
  "Cardiologia", "Emergência", "Endocrinologia", "Nefrologia", "Neurologia", "Pneumologia", "Infectologia", "Pediatria",
  "Psiquiatria", "Reumatologia", "Farmacologia Clínica", "Atenção Farmacêutica", "Stewardship de Antimicrobianos",
  "Farmacocinética Clínica", "Oncologia", "Assistência Farmacêutica",
];

export const LIMITE_ETAPAS = { min: 2, max: 7 };

export const PADRAO_PEDAGOGICO = `PADRÃO PEDAGÓGICO OBRIGATÓRIO (vale para TODO simulador criado):
- O aluno MEXE, LÊ o resultado, INTERPRETA e DECIDE. Nunca faça perguntas de memorização pura ("qual o mecanismo de X?"): a pergunta deve ser respondível apenas a partir do que o aluno viu no explorer/modelo/chart/cálculo e do caso.
- Fluxo típico de uma etapa: "info" (situação e números do caso) -> "explorer" ou "modelo" (mexer/testar) -> "radio" ou "checklist" (interpretar e decidir). O título do painel radio/checklist é a PERGUNTA: cite números do caso, mande comparar o que o aluno viu e peça a leitura que sustenta a decisão. Pode incluir um colega que propõe uma conduta plausível porém errada.
- Em pelo menos UMA etapa use "explorer" ou "modelo". Encadeie: o resultado de uma etapa vira dado da seguinte ("guarde o valor que você achou").
- Alternativas (radio): 4 opções. TODAS com comprimento parecido (a correta NÃO pode ser a mais longa nem a mais curta) e mesma estrutura de frase; a correta não deve ser a primeira; todas aceitam o mesmo fato observado e diferem no mecanismo ou na decisão; sem absolutos (sempre, nunca, apenas, em nenhum cenário); cada distrator tem UM erro claro e plausível (leitura parcial dos números, mecanismo errado, limiar errado, conduta que ignora o contexto, "número bonito" que não trata a causa). Nada de "todas as anteriores".
- Revisão multi-item ("problema quase real"): 3-4 itens numa frase de estrutura idêntica em todas as opções; cada distrator erra um item diferente.
- feedback de cada etapa: cite os números que o aluno viu, explique por que cada erro tentador é errado e termine na conduta. Termine o enunciado sugerindo discussão em grupo quando fizer sentido.
- O painel "info" descreve achados e valores, sem entregar o diagnóstico nem a resposta.
- CALCULE ANTES DE ESCREVER: todo número citado em enunciado, feedback ou alternativa tem de ser o que as fórmulas/painéis do próprio simulador produzem. Se a pergunta cita um resultado, o aluno precisa conseguir vê-lo (no modelo, no explorer, no gráfico).
- Use limites de referência ao citar exames e informações clinicamente corretas. Não invente diretrizes, portarias, artigos nem limites de estabilidade; se não tem certeza de uma norma, descreva o princípio sem citar o número do documento.
- Dados do paciente/cenário realistas (nomes brasileiros, valores plausíveis, unidades corretas).`;

export const CATALOGO_PAINEIS = `ESTRUTURA OBRIGATÓRIA - STEPS E PANELS:
O simulador é organizado em STEPS (etapas sequenciais). Cada step tem PANELS (painéis lado a lado, máximo 3).

TIPOS DE PANELS DISPONÍVEIS:

1. **"info"** - Apenas exibição de texto. Use markdown simples: **negrito**, quebras de linha. Campos: content.

2. **"checklist"** - Múltipla seleção. Campos: options (array de strings), correctAnswers (array de strings corretas).

3. **"radio"** - Seleção única. Campos: options, correctAnswers.

4. **"text"** - Resposta escrita livre. Campos: correctText (resposta esperada).

5. **"chart"** - Gráfico com dados FIXOS (curvas, tendências). Campos: chartConfig com data (pontos {label: "0h", concentracao: 25}), series [{dataKey, name, color}], xAxisLabel, yAxisLabel, yAxisUnit, referenceLines [{y, label, color}], referenceAreas [{y1, y2, label, color}]. Use quando o gráfico NÃO reage ao aluno.

6. **"numeric_keypad"** - Teclado numérico com display LCD (bomba de infusão, monitor). Campos: keypadConfig com displayLabel, displayUnit, correctValue, tolerance, lcdColor ("green"|"blue"|"amber"), actionButtons [{label, color}].

7. **"indicator"** - Luzes de status e valores de monitorização. Campos: indicatorConfig com indicators [{label, status: "on"|"off"|"blink", color: "green"|"red"|"yellow"|"blue"}] e displayValues [{label, value, unit}].

8. **"calculation"** - O aluno calcula e digita valores. Campos: calculationConfig com fields [{name, label, unit, correctValue, tolerance}] e formula_hint.

9. **"explorer"** - Exploração por OPÇÕES DISCRETAS: o aluno escolhe uma opção (fármaco, conduta, parâmetro pronto) e VÊ o resultado antes de decidir. A etapa só é liberada depois que ele testa TODAS as opções. Campos: explorerConfig com controlLabel, baseline [{label, value, unit}], options (2 a 5) [{label, outcomes: [{label, value, unit, trend: "up"|"down"|"same", effect: "good"|"bad"|"neutral"}], note}], requireAll: true.
   REGRAS: use os MESMOS rótulos de outcomes em todas as opções; números coerentes entre si e com o caso (calcule antes); contraste real (uma opção que melhora o marcador certo, uma que melhora só um número bonito sem tratar a causa, uma que piora).

10. **"modelo"** - PARÂMETROS CONTÍNUOS que reagem: o aluno ajusta controles deslizantes e vê resultados e curvas recalculados por FÓRMULAS. É o "ajuste" quando a decisão depende de um cálculo (estoque, dose, cobertura, custo, concentração, tempo, escore). Não é corrigido; serve para explorar antes de decidir no radio/checklist. Campos: modeloConfig com:
   - inputs (2 a 5): [{name (snake_case sem acento), label, unit, min, max, step, default}]
   - outputs (2 a 6): [{label, expr, unit, decimals, bom (expressão booleana opcional), ruim (expressão booleana opcional)}]  (bom/ruim colorem o resultado: verde/vermelho)
   - series (opcional): {xLabel, yLabel, xFrom, xTo, xStep, lines: [{name, expr, color}], refLines: [{y, label}]}: cada linha é uma fórmula em t e nos inputs, em FORMA FECHADA (sem recursão nem loops)
   - formulaHint: a fórmula em texto simples para o aluno
   FÓRMULAS: só aritmética (+ - * / % ^), comparações (< <= > >= == !=), && || !, ternário (a ? b : c), parênteses e as funções min, max, round, ceil, floor, abs, sqrt, pow, log, log10, exp, clamp(x, lo, hi). Números com ponto decimal. NADA além disso (sem if(), sem ponto e vírgula, sem objetos).
   REGRAS: cada input DEVE mudar ao menos um output; ponha as constantes do caso dentro das fórmulas (ex.: 22754); calcule você mesmo os outputs em input.default e nos extremos e confirme que a história do caso aparece (o valor "ruim" do default e o "bom" numa faixa de valores atingível); nunca divida por algo que pode chegar a zero.
   Exemplo (cobertura de estoque): inputs [{name:"estoque",label:"Estoque",unit:"un",min:0,max:60000,step:1000,default:20000},{name:"cmm",label:"Consumo mensal",unit:"un",min:5000,max:30000,step:500,default:15000}], outputs [{label:"Cobertura",expr:"estoque / cmm",unit:"meses",decimals:1,ruim:"estoque / cmm < 1"}], formulaHint:"Cobertura = estoque ÷ CMM".

No máximo 3 painéis por etapa: combine "info" (caso) + "explorer"/"modelo" (testar) + "radio" (interpretar/decidir).`;

export const REGRAS_GERAIS = (categorias: string[]) => `REGRAS GERAIS:
- slug: português sem acentos, separado por hífens
- short_description: máximo 100 caracteres
- description: 2 frases
- category_name: UMA das categorias existentes (${categorias.join(", ")}). Se nenhuma se encaixa, escolha a mais próxima.
- difficulty: Fácil, Médio ou Difícil
- O simulador DEVE ter entre ${LIMITE_ETAPAS.min} e ${LIMITE_ETAPAS.max} steps. Use a quantidade que o assunto pede (um ciclo com várias fases pede mais etapas; um caso pontual, menos), sem encher de etapas fracas.`;
