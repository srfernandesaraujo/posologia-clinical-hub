

# Laboratório Virtual de Pesquisa — Potenciais Bancadas

## Conceito Central

O Laboratório Virtual deixa de ser apenas "Desenvolvimento de Fármacos" e se torna um **hub de pesquisa** com múltiplas bancadas temáticas. A diferença fundamental em relação aos simuladores: aqui o aluno conduz um **projeto de pesquisa completo** — formula hipótese, desenha experimento, coleta dados, analisa resultados, valida estatisticamente e gera um relatório publicável.

## Estrutura da Página Inicial

A página `/laboratorio-virtual` se torna um painel de seleção com cards de bancadas. A bancada atual (Desenvolvimento de Fármacos) vira uma das opções. Cada bancada segue o mesmo fluxo metodológico:

```text
Hipótese → Desenho Experimental → Execução → Análise → Validação → Publicação
```

---

## Bancadas Propostas

### 1. Desenvolvimento de Fármacos (já implementada)
Pipeline atual: alvo molecular → protótipo → docking → ensaio clínico.

### 2. Bancada de Microbiologia — Antibiograma e Resistência
- **Hipótese**: "Este antibiótico é eficaz contra esta cepa?"
- **Experimento**: Selecionar bactéria (E. coli, S. aureus MRSA, K. pneumoniae KPC...), escolher antibióticos, definir concentrações (MIC)
- **Execução**: Visualização de placa de Petri com halos de inibição gerados algoritmicamente. Curvas de crescimento bacteriano (OD600 vs tempo) com Recharts
- **Análise**: Classificação S/I/R segundo breakpoints CLSI/EUCAST. Comparação entre monoterapia e combinações (checkerboard assay simplificado, índice FIC)
- **Validação**: Teste estatístico de significância entre grupos. Cálculo de poder amostral
- **Publicação**: Relatório formatado com tabelas de MIC, gráficos de curva de morte bacteriana e conclusão sobre perfil de sensibilidade

### 3. Bancada de Toxicologia — Dose-Resposta e LD50
- **Hipótese**: "Qual a dose letal mediana desta substância?"
- **Experimento**: Selecionar substância (biblioteca de compostos), modelo animal (in silico), definir doses crescentes
- **Execução**: Curvas dose-resposta sigmoidais (modelo de Hill) com parâmetros ajustáveis. Visualização de mortalidade por dose
- **Análise**: Cálculo de LD50, ED50, índice terapêutico (LD50/ED50). Classificação de toxicidade (Hodge & Sterner)
- **Validação**: Análise probit. Intervalos de confiança 95%. Comparação com dados de referência
- **Publicação**: Relatório com curvas dose-resposta, tabela de parâmetros toxicológicos, classificação de risco

### 4. Bancada de Farmacogenômica — Variabilidade Genética e Resposta
- **Hipótese**: "Polimorfismos de CYP2D6 afetam a resposta a este fármaco?"
- **Experimento**: Selecionar fármaco metabolizado por CYP450, definir população com distribuição de fenótipos (PM, IM, EM, UM), configurar doses
- **Execução**: Simulação de curvas farmacocinéticas individualizadas por genótipo. Distribuição de AUC na população
- **Análise**: Comparação de AUC, Cmax, clearance entre fenótipos. Box plots por grupo genético
- **Validação**: ANOVA entre grupos, teste post-hoc. Cálculo de tamanho de efeito
- **Publicação**: Relatório com recomendações de ajuste de dose por genótipo, tabelas de parâmetros PK por fenótipo

### 5. Bancada de Estabilidade — Degradação e Shelf Life
- **Hipótese**: "Este medicamento mantém potência após X meses em condição Y?"
- **Experimento**: Selecionar formulação, definir condições de armazenamento (temperatura, umidade, luz — zonas climáticas ICH), definir tempos de coleta
- **Execução**: Curvas de degradação (ordem zero, primeira ordem, segunda ordem) com fitting automático. Teor residual vs tempo
- **Análise**: Determinação de prazo de validade (t90). Energia de ativação (Arrhenius) para estudos acelerados → extrapolação para longa duração
- **Validação**: Coeficiente de determinação (R²) do modelo. Análise de resíduos
- **Publicação**: Relatório com cinética de degradação, prazo de validade estimado, recomendação de condições de armazenamento

### 6. Bancada de Controle de Qualidade — Análise Quantitativa
- **Hipótese**: "Este lote está dentro da especificação farmacopeica?"
- **Experimento**: Selecionar método analítico (UV-Vis, HPLC simulado, titulação), preparar curva de calibração com padrões, analisar amostras
- **Execução**: Gráfico de curva de calibração (absorbância/área vs concentração). Leitura de amostras com variação analítica simulada
- **Análise**: Regressão linear (R², slope, intercept). Cálculo de LOD/LOQ. Teor da amostra. Teste de uniformidade de conteúdo (RSD)
- **Validação**: Validação de método: linearidade, precisão (intra/inter-dia), exatidão (recuperação), robustez
- **Publicação**: Relatório de validação analítica completo, conforme ICH Q2

### 7. Bancada de Epidemiologia — Estudo Observacional
- **Hipótese**: "Existe associação entre exposição X e desfecho Y?"
- **Experimento**: Definir tipo de estudo (coorte, caso-controle, transversal), selecionar variáveis de exposição e desfecho, definir tamanho amostral e confundidores
- **Execução**: Geração de dataset sintético respeitando prevalências e odds ratios configurados. Tabelas 2x2
- **Análise**: Cálculo de OR, RR, NNT/NNH. Regressão logística multivariada para ajuste de confundidores
- **Validação**: Intervalos de confiança. Teste de Hosmer-Lemeshow. Análise de sensibilidade
- **Publicação**: Relatório no formato STROBE com tabelas de características basais, medidas de associação e forest plot

### 8. Bancada de Biotecnologia — Clonagem e Expressão de Proteínas
- **Hipótese**: "Este vetor é capaz de expressar a proteína-alvo em E. coli com rendimento adequado?"
- **Experimento**: Selecionar gene-alvo, vetor de expressão (pET, pGEX), cepa hospedeira, condições de indução (IPTG, temperatura)
- **Execução**: Mapa do plasmídeo (visualização circular SVG). Simulação de gel SDS-PAGE com bandas de proteína. Curva de expressão vs tempo/concentração de indutor
- **Análise**: Rendimento estimado (mg/L). Solubilidade (fração solúvel vs corpos de inclusão). Western blot simulado
- **Validação**: Comparação com rendimentos de referência. Otimização de condições (DoE simplificado)
- **Publicação**: Relatório com mapa do constructo, gel de expressão, condições otimizadas e rendimento final

---

## Elemento Transversal: Motor de Publicação

Todas as bancadas convergem para um **gerador de relatório científico** padronizado com seções:
- Introdução e Hipótese
- Materiais e Métodos (gerado automaticamente a partir das escolhas do aluno)
- Resultados (gráficos e tabelas exportados do experimento)
- Discussão (template com campos editáveis)
- Conclusão

O aluno pode exportar como PDF (jsPDF já instalado) com formatação acadêmica.

---

## Viabilidade Técnica

Todas as bancadas usam exclusivamente cálculos no frontend (modelos matemáticos, distribuições estatísticas, geração de dados sintéticos) com Recharts para visualização. Nenhuma requer backend adicional ou APIs externas. O padrão de componentes já estabelecido na bancada de Fármacos (painéis em grid, sliders, botões de simulação com loading) se replica para cada nova bancada.

