

## Reformulação do Laboratório de Perícia Forense — Investigação CSI

### Problema Atual
1. **Respostas óbvias**: O Lab Químico mostra percentuais de similaridade (97% Estricnina) — basta escolher o maior. O Lab Toxicológico indica exatamente o tempo de retenção do pico e lista as substâncias com seus tempos — basta fazer match direto.
2. **Feedback imediato**: Cada lab mostra "Correto/Incorreto" ao confirmar, eliminando a necessidade de raciocínio investigativo acumulado.
3. **Falta de desafio**: Não exige conhecimento real de química forense, toxicologia ou genética.

### Solução Proposta

#### 1. Lab Químico — Reformulação Investigativa
- **Remover** a tabela de similaridade com percentuais (o "Comparação com Banco de Dados" com barras de progresso)
- **Substituir por**: O aluno vê APENAS o espectro de massa bruto. Abaixo, uma tabela de referência mostra os **picos moleculares característicos** de cada substância (sem percentuais), ex: "Estricnina: pico base m/z 334, fragmentos 264, 282" / "Brucina: pico base m/z 394, fragmentos 264, 324"
- O aluno deve **analisar os picos do espectro**, identificar o pico base e os fragmentos, e **comparar manualmente** com a tabela de referência
- Adicionar **perguntas intermediárias**: "Qual é o pico base (m/z) do espectro?" (input numérico) + "Qual substância corresponde a este padrão de fragmentação?" (seleção)
- Adicionar mais **amostras-distração** com espectros diferentes para que o aluno precise escolher qual amostra analisar primeiro

#### 2. Lab Toxicológico — Reformulação Investigativa
- **Remover** a indicação do pico principal e seu tempo de retenção exato
- **Remover** os tempos de retenção da biblioteca de padrões no dropdown
- O aluno vê o cromatograma bruto e deve **identificar visualmente o pico principal** e **estimar o tempo de retenção** lendo o eixo X do gráfico
- Depois, consulta uma **tabela de referência separada** (sem dropdown direto) que lista faixas de tempo de retenção por substância (ex: "Alcaloides: 3.8-4.5 min", "Opioides: 5.0-6.0 min")
- Perguntas: "Qual o tempo de retenção estimado do pico principal?" (input numérico) + "Com base na faixa, qual classe de substância?" + "Qual substância específica?"
- A escolha de **matriz e reagente** afeta a qualidade do cromatograma (picos mais ou menos definidos, ruído de fundo)

#### 3. Lab DNA — Reformulação Investigativa
- Tornar a comparação **menos visualmente óbvia**: adicionar **loci parcialmente coincidentes** entre suspeitos (alguns alelos iguais, outros diferentes), forçando análise locus-por-locus
- Adicionar um **formulário de comparação manual**: para cada locus, o aluno marca se há match ou não entre a cena e cada suspeito
- Adicionar conceitos como **mistura de DNA** (perfil da cena com mais de 2 alelos em alguns loci) e **degradação parcial** (alguns loci sem resultado)

#### 4. Feedback Diferido — Apenas no Final
- **Remover** os badges "Correto/Incorreto" e mensagens de feedback de todos os 3 labs
- Cada lab apenas registra a resposta do aluno e exibe "Resposta registrada ✓" com ícone neutro
- No **Painel de Conclusão**, após o aluno acusar o suspeito:
  - Revelar **todas as respostas** lado a lado: "Sua resposta" vs "Resposta correta" para cada lab
  - Mostrar explicação detalhada de cada etapa (por que era aquela substância, por que aquela matriz, qual o DNA correto)
  - Score final ponderado

### Arquivos a Editar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/lab-virtual/ChemicalLabPanel.tsx` | Remover similaridade%, adicionar tabela de referência de picos, perguntas de pico base, feedback neutro |
| `src/components/lab-virtual/ToxicologyLabPanel.tsx` | Remover indicação de pico/tR, adicionar input de estimativa, tabela de faixas, feedback neutro |
| `src/components/lab-virtual/DNALabPanel.tsx` | Adicionar comparação locus-por-locus manual, perfis mais ambíguos, feedback neutro |
| `src/components/lab-virtual/ForensicConclusionPanel.tsx` | Revelar todas as respostas corretas vs escolhidas com explicações detalhadas |
| `src/data/forensicScenarios.ts` | Reformular dados: espectros com picos mais ambíguos, perfis DNA com sobreposições parciais, adicionar campos de explicação por etapa, tabelas de referência |

### Detalhes Técnicos

- Interfaces de `ForensicScenario` ganham novos campos: `chemicalExplanation`, `toxExplanation`, `dnaExplanation`, `referenceTable` (picos de referência por substância), `retentionRanges` (faixas de tempo por classe)
- Os callbacks `onComplete` dos labs passam apenas as respostas do aluno (sem calcular `correct` — isso será calculado no `ForensicConclusionPanel`)
- Os espectros serão redesenhados com picos mais ambíguos: substâncias com fragmentos sobrepostos, picos secundários relevantes
- Os perfis de DNA terão loci com alelos parcialmente coincidentes entre 2 suspeitos, exigindo análise de todos os 5 loci

