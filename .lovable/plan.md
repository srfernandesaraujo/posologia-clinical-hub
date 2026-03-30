

## Plano: Nova Categoria de Simuladores — Genética

### Visão Geral
Criar uma nova categoria **"Genética"** com 8 simuladores interativos, seguindo os mesmos padrões visuais e funcionais das categorias existentes (Bioquímica, Fisiologia, etc.): casos nativos, integração com Salas Virtuais, gráficos Recharts e suporte a modo exame.

### Simuladores Propostos

| # | Slug | Nome | Descrição |
|---|------|------|-----------|
| 1 | `sequenciamento-dna` | **Sequenciamento de DNA (Sanger e NGS)** | Compare métodos Sanger vs NGS. Visualize eletroferogramas, quality scores (Phred) e cobertura de leitura. Identifique variantes em reads simulados. |
| 2 | `snp-farmacogenetica` | **SNPs e Farmacogenética** | Analise polimorfismos de nucleotídeo único em genes CYP450, VKORC1 e DPYD. Correlacione genótipos com fenótipos metabólicos e ajuste de dose. |
| 3 | `cariotipo` | **Cariótipo e Anomalias Cromossômicas** | Monte cariótipos virtuais arrastando cromossomos. Identifique trissomias, monossomias, translocações e inversões com correlação clínica. |
| 4 | `heranca-mendeliana` | **Herança Mendeliana e Heredogramas** | Construa heredogramas interativos. Determine padrões de herança (AD, AR, ligada ao X) e calcule probabilidades com quadro de Punnett. |
| 5 | `pcr-eletroforese` | **PCR e Eletroforese em Gel** | Simule reações de PCR com design de primers, ciclos térmicos e visualização de bandas em gel de agarose com marcador de peso molecular. |
| 6 | `epigenetica` | **Epigenética e Regulação Gênica** | Manipule metilação de DNA e acetilação de histonas. Observe efeitos na expressão gênica com gráficos de atividade transcricional. |
| 7 | `mutacoes-reparo` | **Mutações e Reparo de DNA** | Simule mutações (substituição, deleção, inserção, frameshift) e mecanismos de reparo (MMR, BER, NER). Visualize impacto na proteína final. |
| 8 | `genetica-populacoes` | **Genética de Populações (Hardy-Weinberg)** | Calcule frequências alélicas e genotípicas. Simule desvios por seleção, deriva genética, migração e endogamia ao longo de gerações. |

### Arquitetura Técnica

**Arquivos a criar** (pasta `src/pages/simuladores/genetica/`):
- `SimuladorSequenciamentoDNA.tsx`
- `SimuladorSNPFarmacogenetica.tsx`
- `SimuladorCariotipo.tsx`
- `SimuladorHerancaMendeliana.tsx`
- `SimuladorPCREletroforese.tsx`
- `SimuladorEpigenetica.tsx`
- `SimuladorMutacoesReparo.tsx`
- `SimuladorGeneticaPopulacoes.tsx`

**Arquivos a editar**:
- `src/pages/Simuladores.tsx` — Adicionar os 8 simuladores ao array `NATIVE_SIMULATORS` com `category: "Genética"`, e adicionar entrada em `CATEGORY_ICONS` (ícone `Dna`) e `CATEGORY_COLORS`
- `src/App.tsx` — Importar os 8 componentes e adicionar rotas `/simuladores/{slug}`
- `src/data/nativeSystemPrompts.ts` — Adicionar system prompts para geração de casos IA
- `src/data/simulatorChallenges.ts` — Adicionar desafios para modo challenge

**Padrão de cada simulador**:
- Casos nativos embutidos (3 por simulador, Fácil/Médio/Difícil)
- Gráficos interativos com Recharts (sliders para manipular parâmetros)
- Integração com `useSimulatorCases` e `useVirtualRoomCase` para Salas Virtuais
- Botão "Mostrar Resultados" com redirecionamento de 15s para home
- Componentes `ExamBanner`, `ExamFeedbackOverlay`, `SimulatorChallengeMode`
- Suporte a light/dark mode

### Detalhes por Simulador

1. **Sequenciamento de DNA**: Eletroferograma SVG animado, barra de quality score por base, comparação Sanger (reads longos) vs NGS (reads curtos + cobertura), slider de profundidade de cobertura
2. **SNPs e Farmacogenética**: Mapa de gene com posições de SNPs, quadro de genótipo→fenótipo, gráfico Recharts de curva Cp×t por fenótipo metabolizador
3. **Cariótipo**: Grid visual de 23 pares cromossômicos, drag-and-drop para classificação, identificação de anomalias com feedback clínico
4. **Herança Mendeliana**: Editor de heredograma SVG com símbolos padrão (círculo/quadrado/preenchido), quadro de Punnett interativo, cálculo de risco
5. **PCR e Eletroforese**: Painel de ciclos térmicos com gráfico de temperatura, visualização de gel com bandas fluorescentes, design de primers com Tm
6. **Epigenética**: Diagrama de cromatina (condensada/aberta), sliders de metilação CpG e acetilação H3/H4, gráfico de expressão gênica resultante
7. **Mutações e Reparo**: Sequência de DNA editável, visualização de tradução (códon→aminoácido), comparação proteína normal vs mutada, seleção de via de reparo
8. **Genética de Populações**: Sliders para p/q, tamanho da população, coeficiente de seleção; gráficos de frequência alélica ao longo de gerações; teste de equilíbrio HW

### Ordem de Implementação
Dado o volume (8 simuladores), a implementação será dividida em 2-3 etapas:
1. **Etapa 1**: Infraestrutura (categoria + rotas) + Sequenciamento DNA + SNP + Cariótipo
2. **Etapa 2**: Herança Mendeliana + PCR + Epigenética
3. **Etapa 3**: Mutações e Reparo + Genética de Populações

