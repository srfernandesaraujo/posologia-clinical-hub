

# Refatoração das 7 Bancadas — Fluxo Modular + Mini-Relatório

## Problema

As bancadas 2-8 seguem o padrão "configure tudo → clique executar → veja tudo". Na bancada de Fármacos, cada módulo é um componente independente cujo estado alimenta o próximo, e o usuário interage com cada módulo separadamente. Isso cria uma experiência de pesquisa real onde escolhas em cada etapa impactam visivelmente as etapas seguintes.

## Padrão-alvo (Fármacos)

```text
Módulo 1: Escolha/configuração inicial → gera dados parciais
Módulo 2: Ajuste de parâmetros (influenciados por M1) → execução parcial
Módulo 3: Análise (usa dados de M1+M2) → execução independente
Módulo 4: Validação/Ensaio final (usa dados de M1+M2+M3)
Módulo 5: Mini-Relatório (novo, comum a todas as bancadas)
```

Cada módulo tem seu próprio botão de execução. Módulos posteriores ficam desabilitados ou mostram "aguardando módulo anterior" até que o módulo precedente tenha sido executado.

## Redesign por Bancada

### Microbiologia (4 módulos + relatório)
- **M1 — Seleção do Microrganismo**: Escolher bactéria, ver ficha (Gram, mecanismos de resistência conhecidos, habitat). Botão "Confirmar Cepa".
- **M2 — Painel de Antibióticos**: Desbloqueado após M1. Selecionar antibióticos e concentração do teste. O painel mostra dicas sobre quais classes são naturalmente ineficazes contra o Gram selecionado. Botão "Iniciar Incubação".
- **M3 — Placa de Petri + Tabela S/I/R**: Gerado após M2. Visualização SVG dos halos e tabela com MIC/classificação. Botão "Gerar Curva de Crescimento" para a curva OD600.
- **M4 — Curva de Crescimento**: Gerada a partir do primeiro antibiótico sensível (ou o selecionado) de M3. Usuário pode trocar o antibiótico plotado e ajustar a concentração para ver impacto em tempo real.
- **M5 — Mini-Relatório**: Textarea para o usuário escrever conclusões.

### Toxicologia (4 módulos + relatório)
- **M1 — Seleção da Substância**: Escolher composto, ver ficha técnica (estrutura, uso clínico, mecanismo de toxicidade). Botão "Confirmar Substância".
- **M2 — Desenho do Ensaio**: Desbloqueado após M1. Configurar número de doses, modelo animal, faixa de doses. Informações adaptadas à substância selecionada. Botão "Administrar Doses".
- **M3 — Curvas Dose-Resposta**: Gráfico sigmoidal com linhas de efeito e mortalidade. Linhas de referência ED50/LD50. Botão "Calcular Parâmetros".
- **M4 — Parâmetros Toxicológicos**: LD50, ED50, IT, classificação Hodge & Sterner. Exibe análise de segurança baseada nas curvas de M3.
- **M5 — Mini-Relatório**.

### Farmacogenômica (4 módulos + relatório)
- **M1 — Seleção do Fármaco**: Escolher fármaco, ver enzima metabolizadora, tipo (pró-fármaco vs ativo), parâmetros PK base. Botão "Confirmar Fármaco".
- **M2 — Configuração da População**: Desbloqueado após M1. Definir dose e distribuição de fenótipos na população (sliders para % PM/IM/EM/UM). Botão "Genotipar População".
- **M3 — Curvas PK por Genótipo**: Gráficos de concentração x tempo por fenótipo. Usuário pode ativar/desativar fenótipos.
- **M4 — Comparação de AUC**: Bar chart + tabela comparativa com Cmax, AUC, clearance. Veredito clínico.
- **M5 — Mini-Relatório**.

### Estabilidade (4 módulos + relatório)
- **M1 — Seleção da Formulação**: Escolher formulação, ver ordem cinética, energia de ativação, concentração inicial. Botão "Confirmar Formulação".
- **M2 — Condições de Armazenamento**: Desbloqueado após M1. Selecionar condições ICH e duração do estudo. Botão "Iniciar Estudo".
- **M3 — Curvas de Degradação**: Gráfico teor vs tempo para cada condição. Usuário pode clicar em uma condição para ver detalhes (k, R², t90).
- **M4 — Extrapolação Arrhenius**: Gráfico ln(k) vs 1/T e cálculo do prazo de validade a 25°C. Comparação entre condições.
- **M5 — Mini-Relatório**.

### Controle de Qualidade (4 módulos + relatório)
- **M1 — Seleção do Método e Analito**: Escolher método analítico e analito. Ver ficha com λ, especificação farmacopeica. Botão "Confirmar Análise".
- **M2 — Curva de Calibração**: Desbloqueado após M1. Definir número de pontos, executar. Gráfico scatter com linha de regressão. Exibe slope, intercept, R². Botão "Preparar Amostras".
- **M3 — Quantificação das Amostras**: Definir número de réplicas, executar leituras. Tabela com respostas, concentrações back-calculadas e recuperação.
- **M4 — Validação Analítica**: LOD/LOQ, RSD, recuperação média, laudo APROVADO/REPROVADO conforme ICH Q2.
- **M5 — Mini-Relatório**.

### Epidemiologia (4 módulos + relatório)
- **M1 — Desenho do Estudo**: Escolher tipo (coorte, caso-controle, transversal). Ver características metodológicas. Botão "Confirmar Desenho".
- **M2 — Variáveis e Amostra**: Desbloqueado após M1. Selecionar exposição, desfecho, tamanho amostral. Parâmetros adaptativos ao tipo de estudo (ex: caso-controle não mostra RR). Botão "Coletar Dados".
- **M3 — Tabela 2x2 e Medidas**: Tabela de contingência, OR/RR, IC 95%, p-valor. Botão "Análise Ajustada".
- **M4 — Forest Plot Ajustado**: Análise multivariada com ajuste por confundidores. Visualização forest plot.
- **M5 — Mini-Relatório**.

### Biotecnologia (4 módulos + relatório)
- **M1 — Desenho do Constructo**: Escolher gene, vetor, cepa. Ver mapa do plasmídeo (SVG atualizado em tempo real). Botão "Confirmar Constructo".
- **M2 — Condições de Indução**: Desbloqueado após M1. Ajustar temperatura e IPTG. Sliders com dicas baseadas no gene selecionado (ex: "Temp ≤25°C melhora solubilidade para proteínas grandes"). Botão "Induzir Expressão".
- **M3 — Rendimento e SDS-PAGE**: Métricas de rendimento, solubilidade, gel SDS-PAGE simulado. Botão "Analisar Curva de Expressão".
- **M4 — Curva de Expressão**: Gráfico OD600 + expressão proteica vs tempo. Veredito com recomendações.
- **M5 — Mini-Relatório**.

## Módulo 5 — Mini-Relatório (componente compartilhado)

Um componente reutilizável `LabReportPanel` com:
- **Título do experimento** (preenchido automaticamente com nome da bancada)
- **Hipótese** (textarea — o que o usuário esperava encontrar)
- **Principais resultados** (textarea — resumo dos achados)
- **Conclusão** (textarea — interpretação e significância)
- **Botão "Exportar PDF"** usando jsPDF — gera documento com cabeçalho, seções, e dados dos módulos anteriores inseridos automaticamente (parâmetros selecionados, métricas calculadas)

O painel fica desabilitado até que pelo menos M3 tenha sido executado. Ocupa a largura total do grid (col-span-2).

## Implementação Técnica

- Cada bancada mantém estado de progresso: `completedModules: Set<number>` que controla quais módulos foram executados
- O estado flui entre módulos via props no componente pai (como já funciona em `BancadaFarmacos`)
- Módulos bloqueados mostram overlay com ícone de cadeado e texto "Complete o módulo X para desbloquear"
- Os 7 arquivos de bancada serão reescritos mantendo os mesmos modelos matemáticos e dados, mas reestruturando o fluxo
- O componente `LabReportPanel` será criado em `src/components/lab-virtual/LabReportPanel.tsx`

## Arquivos afetados

- **Novo**: `src/components/lab-virtual/LabReportPanel.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaMicrobiologia.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaToxicologia.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaFarmacogenomica.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaEstabilidade.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaControleQualidade.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaEpidemiologia.tsx`
- **Reescrita**: `src/pages/lab-virtual/BancadaBiotecnologia.tsx`
- **Edição**: `src/pages/lab-virtual/BancadaFarmacos.tsx` (adicionar M5 relatório)

