/**
 * Descrição arquitetural completa de cada bancada do Laboratório Virtual.
 * Exibido para admins via AdminPromptViewer — detalha módulos, componentes, fluxo de dados,
 * lógica científica, APIs e Edge Functions envolvidas.
 */
export const LAB_SYSTEM_PROMPTS: Record<string, { name: string; slug: string; prompt: string }> = {
  farmacos: {
    name: "Desenvolvimento de Fármacos",
    slug: "lab-farmacos",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: DESENVOLVIMENTO DE FÁRMACOS
Arquivo principal: src/pages/lab-virtual/BancadaFarmacos.tsx
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Pipeline completo de drug design: desde a validação do alvo terapêutico até o ensaio clínico virtual.

▸ COMPONENTES UTILIZADOS
- TargetValidationPanel: Seleção e validação do alvo molecular (proteína). Exibe ID UniProt, categoria terapêutica e fármacos relacionados.
- DrugDesignPanel: Editor de propriedades do protótipo farmacêutico com dois modos:
  • Sliders — ajuste visual de MW (peso molecular, 150-600), LogP (-1 a 5), HBD (0-5), HBA (0-10) com validação automática da Regra de Lipinski (Rule of Five).
  • SMILES — entrada direta de notação molecular SMILES.
- DockingADMEPanel: Simulação de docking molecular e predição ADME (absorção, distribuição, metabolismo, excreção). Inclui visualização de scoring de afinidade.
- ClinicalTrialPanel: Desenho e simulação de ensaio clínico virtual. Define braços do estudo, randomização e desfechos.
- LabReportPanel: Exportação de relatório final em PDF com hipótese, métodos, resultados e conclusão.

▸ FLUXO DE DADOS (5 MÓDULOS SEQUENCIAIS)
M1 (Hipótese) → Seleção do alvo molecular → estado: selectedTarget { id, name }
M2 (Desenho) → Configuração do protótipo → estado: drugProperties { mw, logP, hbd, hba }
M3 (Execução) → Docking e predição ADME → scoring de afinidade e perfil farmacocinético
M4 (Análise) → Ensaio clínico virtual → análise estatística de eficácia
M5 (Publicação) → LabReportPanel → exportação PDF

▸ GERAÇÃO DE CONTEXTO POR IA (ADMIN)
Edge Function: generate-lab-context (labType: "farmacos")
System prompt: "Pesquisador farmacêutico expert em drug design"
Tool schema: generate_context({ target: { id, name, category, relatedDrugs }, drugProperties: { mw, logP, hbd, hba } })
Regras: ID UniProt fictício (PXXXXX), MW 150-600, LogP -1 a 5, HBD 0-5, HBA 0-10 (Lipinski)

▸ ESTADO E INTEGRAÇÃO
- drugProperties e selectedTarget são injetados via AIContextGenerator quando admin gera contexto IA.
- designMode alterna entre "sliders" e "smiles" no DrugDesignPanel.
- Módulos desbloqueiam sequencialmente (M2 requer M1 concluído, etc.).`,
  },

  microbiologia: {
    name: "Microbiologia",
    slug: "lab-microbiologia",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: MICROBIOLOGIA
Arquivo principal: src/pages/lab-virtual/BancadaMicrobiologia.tsx (386 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Simulação completa de antibiograma clínico com dados de MIC, breakpoints CLSI e curvas de crescimento bacteriano.

▸ DADOS NATIVOS
- BACTERIA (6 espécies): E. coli, S. aureus (MSSA), MRSA, K. pneumoniae, KPC, P. aeruginosa
  Campos: id, name, gram (+/-), habitat, resistance (mecanismos)
- ANTIBIOTICS (6): Amoxicilina, Ciprofloxacino, Vancomicina, Meropenem, Gentamicina, Sulfametoxazol-TMP
  Campos: id, name, class, gramTip
- Tabela de resistência cruzada (6×6): MIC, breakpointS, breakpointR para cada par bactéria/antibiótico

▸ LÓGICA CIENTÍFICA
- getMICData(bacteriaId, antibioticId): Retorna MIC e breakpoints. Prioriza dados customizados (_customResistance) sobre os nativos.
- classify(mic, breakpointS, breakpointR): Classificação S/I/R conforme CLSI:
  • S (sensível): MIC ≤ breakpointS
  • I (intermediário): breakpointS < MIC < breakpointR
  • R (resistente): MIC ≥ breakpointR
- getHaloSize(classification): Simula diâmetro de halo de inibição em disco-difusão (S: 22-32mm, I: 12-18mm, R: 0-6mm).
- generateGrowthCurve(bacteriaId, antibioticId, concentration): Curva de crescimento bacteriano (OD600 vs tempo, 0-24h).
  Modelo logístico com 3 regimes baseados na razão concentração/MIC:
  • ratio ≥ 4: morte bacteriana (decaimento exponencial)
  • 1 ≤ ratio < 4: inibição parcial (taxa reduzida)
  • ratio < 1: crescimento com redução moderada

▸ MÓDULOS (5 ETAPAS)
M1 — Seleção da bactéria (Select com 6 opções + customizada via IA)
M2 — Plaqueamento: seleção do antibiótico + ajuste de concentração via Slider
M3 — Execução: visualização do antibiograma (halos + Recharts LineChart com curva de crescimento controle vs tratado)
M4 — Análise: tabela de classificação S/I/R para todos os 6 antibióticos + interpretação clínica
M5 — Relatório via LabReportPanel (PDF)

▸ VISUALIZAÇÕES (Recharts)
- LineChart: curva de crescimento (eixo X: hora, eixo Y: OD600, duas linhas: controle/tratado)
- Disco-difusão simulado: componente visual com halos proporcionais à classificação

▸ GERAÇÃO DE CONTEXTO POR IA
Edge Function: generate-lab-context (labType: "microbiologia")
Schema: { bacteria: { id, name, gram, habitat, resistance }, resistanceData: [{ antibioticId, mic, breakpointS, breakpointR }] }
Dados injetados em _customResistance e mesclados via useMemo com bactérias nativas.`,
  },

  toxicologia: {
    name: "Toxicologia",
    slug: "lab-toxicologia",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: TOXICOLOGIA
Arquivo principal: src/pages/lab-virtual/BancadaToxicologia.tsx (250 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Ensaio toxicológico in silico: curva dose-resposta, cálculo de LD50/ED50, índice terapêutico e classificação GHS.

▸ DADOS NATIVOS
- SUBSTANCES (6): Paracetamol, Digoxina, Warfarina, Lítio, Cafeína, Etanol
  Campos: id, name, hillN (1.5-3.5), ld50, ed50 (mg/kg), mechanism, clinical
- ANIMAL_MODELS (3): Rato Wistar (fator 1.0), Camundongo Swiss (0.85), Coelho NZ (1.2)

▸ LÓGICA CIENTÍFICA
- hillEquation(dose, ec50, n): Equação de Hill → E = (Dⁿ / (EC50ⁿ + Dⁿ)) × 100
- classifyToxicity(ld50): Classificação GHS de toxicidade aguda:
  Classe 1 (≤5), 2 (≤50), 3 (≤500), 4 (≤5000), 5 (>5000 mg/kg)
- Índice Terapêutico: TI = LD50 / ED50 (calculado com fator do modelo animal)
- Curva dose-resposta gerada com n pontos configuráveis, efeito e toxicidade em paralelo

▸ MÓDULOS
M1 — Seleção da substância + modelo animal
M2 — Desenho experimental: número de pontos (Slider), fator de ajuste animal
M3 — Execução: curva dose-resposta (Recharts LineChart com duas séries: efeito + toxicidade) + ReferenceLine para LD50/ED50
M4 — Análise: LD50, ED50, TI, classificação GHS com cores semafóricas
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { substance: { id, name, hillN, ld50, ed50, unit, mechanism, clinical } }
Regras: HillN 1.2-4.0, LD50 realista, ED50 < LD50`,
  },

  farmacogenomica: {
    name: "Farmacogenômica",
    slug: "lab-farmacogenomica",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: FARMACOGENÔMICA
Arquivo principal: src/pages/lab-virtual/BancadaFarmacogenomica.tsx (274 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Estudo farmacogenômico: impacto de polimorfismos genéticos (CYP450) na farmacocinética de medicamentos.

▸ DADOS NATIVOS
- DRUGS (5): Codeína (CYP2D6, prodrug), Tamoxifeno (CYP2D6, prodrug), Omeprazol (CYP2C19, drug), Clopidogrel (CYP2C19, prodrug), Warfarina (CYP2C9, drug)
  Campos: id, name, enzyme, type (prodrug|drug), baseParams { ka, ke, vd, f }
- PHENOTYPES (4): PM (fator 0.2), IM (0.6), EM (1.0), UM (1.8) — com cores distintas

▸ LÓGICA CIENTÍFICA
- generatePKCurve(params, dose, metabolismFactor, isProdrug): Modelo monocompartimental
  Para prodrug: ke reduzido (1/fator), dose efetiva multiplicada pelo fator
  Para drug: ke aumentado pelo fator, dose efetiva normal
  Equação: Cp = (F·D·ka / Vd·(ka−ke)) × (e^(-ke·t) − e^(-ka·t))
- calcAUC(points): Cálculo de AUC pelo método trapezoidal
- 4 curvas PK sobrepostas (uma por fenótipo) com toggle de visibilidade
- Cálculo de Cmax, Clearance (Dose/AUC) por fenótipo

▸ MÓDULOS
M1 — Seleção do fármaco
M2 — Configuração: dose (Slider), distribuição fenotípica da população (PM/IM/EM/UM)
M3 — Genotipagem: gera 4 curvas PK sobrepostas (Recharts LineChart, cores por fenótipo)
M4 — Análise: BarChart comparativo de AUC, Cmax e Clearance por fenótipo + interpretação
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { drug: { id, name, enzyme, type, baseParams: { ka, ke, vd, f } } }
Regras: enzima CYP real, ka 0.3-2.0, ke 0.01-0.5, Vd 5-1000, F 0.1-1.0`,
  },

  estabilidade: {
    name: "Estabilidade",
    slug: "lab-estabilidade",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: ESTABILIDADE
Arquivo principal: src/pages/lab-virtual/BancadaEstabilidade.tsx (263 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Estudo de estabilidade farmacêutica: cinética de degradação, gráfico de Arrhenius e estimativa de prazo de validade.

▸ DADOS NATIVOS
- FORMULATIONS (5): AAS (comprimido), Vitamina C (solução), Insulina (injetável), Amoxicilina (suspensão), Nitroglicerina (sublingual)
  Campos: id, name, k25 (constante a 25°C), order (0 ou 1), ea (kJ/mol), initialConc (%)
- CONDITIONS (4): 25°C/60%UR, 30°C/65%UR, 40°C/75%UR, 50°C estresse

▸ LÓGICA CIENTÍFICA
- calcK(k25, ea, temp): Equação de Arrhenius → k = k25 · exp((Ea/R) · (1/298.15 − 1/T))
- degradation(c0, k, order, t):
  Ordem 0: C = C₀ − k·t
  Ordem 1: C = C₀ · e^(−k·t)
- calcT90(c0, k, order): Tempo para 10% de degradação (prazo de validade)
  Ordem 0: t90 = 0.1·C₀/k
  Ordem 1: t90 = ln(100/90)/k
- R² calculado por regressão linear dos dados de degradação
- Gráfico de Arrhenius: ln(k) vs 1/T para extrapolação a 25°C

▸ MÓDULOS
M1 — Seleção da formulação
M2 — Desenho: condições de armazenamento (multi-select), duração em meses (Slider)
M3 — Execução: curvas de degradação sobrepostas por condição (Recharts LineChart) + seleção individual
M4 — Análise: gráfico de Arrhenius (ScatterChart ln(k) vs 1/T) + shelf life estimado + R²
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { formulation: { id, name, k25, order, ea, initialConc } }
Regras: k25 0.0005-0.03, Ea 50-120 kJ/mol, concentração inicial ~100%`,
  },

  "controle-qualidade": {
    name: "Controle de Qualidade",
    slug: "lab-controle-qualidade",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: CONTROLE DE QUALIDADE
Arquivo principal: src/pages/lab-virtual/BancadaControleQualidade.tsx (306 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Validação analítica farmacêutica: curva de calibração, regressão linear, LOD/LOQ, precisão e recuperação.

▸ DADOS NATIVOS
- METHODS (3): UV-Vis (254 nm), HPLC-UV (220 nm), Titulação Potenciométrica
- ANALYTES (4): Paracetamol (500 mg), Ibuprofeno (400 mg), Metformina (850 mg), Losartana (50 mg)
  Campos: id, name, trueConc, unit, spec (especificação farmacopeica: ex. "95-105%")

▸ LÓGICA CIENTÍFICA
- generateCalibration(nPoints): Gera padrões de calibração com ruído gaussiano
  Resposta = 0.0125 × [C] + 0.015 + ruído
- linearRegression(data): Regressão por mínimos quadrados
  Retorna: slope, intercept, R², LOD (3.3·Sy/slope), LOQ (10·Sy/slope)
- generateSampleReadings(trueConc, slope, intercept, nReplicas): Leituras da amostra com ruído
  Back-calculation da concentração + % de recuperação por réplica

▸ MÓDULOS
M1 — Seleção do método analítico + analito
M2 — Calibração: número de padrões (Slider), geração da curva + regressão (ScatterChart com linha de tendência)
M3 — Execução: leituras da amostra (n réplicas), cálculo de concentração por back-calculation
M4 — Análise: média ± DP, CV%, recuperação%, LOD, LOQ, verificação contra especificação farmacopeica (aprovado/reprovado)
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { analyte: { id, name, trueConc, unit, spec } }`,
  },

  epidemiologia: {
    name: "Epidemiologia",
    slug: "lab-epidemiologia",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: EPIDEMIOLOGIA
Arquivo principal: src/pages/lab-virtual/BancadaEpidemiologia.tsx (284 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Estudo farmacoepidemiológico: desenho de estudo, geração de tabela 2×2, cálculo de medidas de associação e análise de confundimento.

▸ DADOS NATIVOS
- STUDY_TYPES (3): Coorte Prospectiva (RR), Caso-Controle (OR), Transversal (RP)
- EXPOSURES (5): Tabagismo (OR 2.5), Sedentarismo (1.8), Obesidade (3.2), Hiperuricemia (1.6), Polifarmácia (2.1)
- OUTCOMES (5): IAM (prev 0.05), AVC (0.03), DM2 (0.08), DPOC (0.04), RAM (0.12)

▸ LÓGICA CIENTÍFICA
- generateDataset(sampleSize, exposureOR, outcomePrevalence): Simulação Monte Carlo
  Cada indivíduo: exposição binomial (p=0.3), risco ajustado pelo OR para expostos
  Retorna tabela 2×2: { a, b, c, d }
- calcMeasures(a, b, c, d):
  OR = (a·d)/(b·c)
  RR = [a/(a+b)] / [c/(c+d)]
  RD = risco_expostos − risco_não_expostos
  NNT = 1/RD
  IC95% do OR via ln(OR) ± 1.96·SE (SE = √(1/a+1/b+1/c+1/d))
  p-valor estimado pela inclusão de 1 no IC
- Análise de confundimento: execução de análise estratificada por confundidor com sub-tabelas 2×2

▸ MÓDULOS
M1 — Seleção do desenho de estudo
M2 — Configuração: exposição, desfecho, tamanho amostral (Slider 100-2000)
M3 — Execução: geração da tabela 2×2 + cálculo de OR, RR, RD, NNT, IC95%, p-valor
M4 — Análise: análise estratificada por confundidor + floresta plot (Forest Plot)
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { exposure: { id, name, baseOR }, outcome: { id, name, prevalence } }
Regras: OR base 1.2-5.0, prevalência 0.01-0.20, associação plausível`,
  },

  biotecnologia: {
    name: "Biotecnologia",
    slug: "lab-biotecnologia",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: BIOTECNOLOGIA
Arquivo principal: src/pages/lab-virtual/BancadaBiotecnologia.tsx (305 linhas)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Expressão de proteínas recombinantes em E. coli: seleção de gene, vetor, cepa, otimização de indução e curva de expressão.

▸ DADOS NATIVOS
- GENES (5): GFP (27 kDa), Insulina (5.8 kDa), tPA (68 kDa), Lisozima (14.3 kDa), Interferon-α (19 kDa)
  Campos: id, name, mw (kDa), optimalTemp (°C), optimalIPTG (mM)
- VECTORS (3): pET-28a (His-tag, T7), pGEX-4T-1 (GST-tag, tac), pMAL-c5X (MBP-tag, tac)
  Campos: id, name, size (bp), promoter, tag, efficiency
- STRAINS (3): BL21(DE3) (1.0), Rosetta(DE3) (1.15), SHuffle (0.8)
  Campos: id, name, efficiency

▸ LÓGICA CIENTÍFICA
- calcExpression(gene, vector, strain, temp, iptg):
  tempFactor = 1 − ((T − T_ótima)/20)²
  iptgFactor = [IPTG] / ([IPTG] + 0.5·IPTG_ótimo)
  rendimento = 50 × eficiência_vetor × eficiência_cepa × tempFactor × iptgFactor
  solubilidade: T ≤ 25°C → 70-90%, T ≤ 30°C → 40-60%, T > 30°C → 15-30%
- generateExpressionCurve: Curva OD600 (logística) + expressão (1 − e^(−0.8·(t−1))) ao longo de 8h
- Tamanho do inserto calculado: MW × 30 × 3 (bases = aminoácidos × 3)

▸ MÓDULOS
M1 — Seleção: gene + vetor + cepa (3 Selects) + cálculo do inserto (gene_bp / tamanho_vetor)
M2 — Otimização: temperatura (Slider 16-42°C) + concentração de IPTG (Slider 0.05-2.0 mM)
M3 — Execução: curva de expressão (Recharts LineChart: OD600 + expressão vs tempo)
M4 — Análise: rendimento total, solubilidade, rendimento solúvel, SDS-PAGE virtual
M5 — Relatório PDF

▸ GERAÇÃO POR IA
Schema: { gene: { id, name, mw, optimalTemp, optimalIPTG }, vector: { id, name, size, promoter, tag, efficiency }, strain: { id, name, efficiency } }`,
  },

  "modelagem-molecular": {
    name: "Modelagem Molecular",
    slug: "lab-modelagem-molecular",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: MODELAGEM MOLECULAR
Arquivo principal: src/pages/lab-virtual/BancadaModelagemMolecular.tsx (140 linhas)
Subcomponentes: src/components/lab-virtual/molmod/ (4 painéis)
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Busca, modificação e análise de moléculas com dados reais de APIs científicas (PubChem, ChEMBL, Open Targets).

▸ COMPONENTES (MODULARES)
1. CompoundSearchPanel (M1): Busca por nome na API PubChem REST
   - GET https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/JSON
   - Extrai: CID, SMILES, MW, XLogP, HBD, HBA, TPSA, fórmula molecular
   - Renderiza estrutura 2D via PubChem (https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/PNG)

2. MoleculeEditorPanel (M2): Editor de estrutura molecular
   - Visualização 3D via 3Dmol.js (CDN: $3Dmol)
   - Fallback chain para renderização: 3D SDF → 2D SDF → SMILES direto
   - Modificações estruturais: adição de grupos funcionais (OH, NH2, Cl, F, CH3, COOH, NO2, CF3)
   - Cada modificação concatena ao SMILES: ex. "CCO" + "(O)" → "CCO(O)"

3. InSilicoPredictionPanel (M3): Predições in silico
   - Regra de Lipinski (frontend): MW ≤ 500, LogP ≤ 5, HBD ≤ 5, HBA ≤ 10
   - Predição ADMET via Edge Function "predict-admet": envia SMILES, retorna absorção, distribuição, metabolismo, excreção, toxicidade

4. BioactivityPanel (M4): Dados de bioatividade
   - API ChEMBL: GET https://www.ebi.ac.uk/chembl/api/data/molecule?pref_name={name}&format=json
   - API Open Targets: associações de doenças do composto
   - Exibe IC50, Ki, EC50 e targets associados

▸ ESTADO GLOBAL
- compound: CompoundData (do PubChem)
- currentSmiles: string (SMILES em edição, modificado por grupos funcionais)
- completedModules: Set<number> (desbloqueio sequencial 1→2→3→4)

▸ GERAÇÃO POR IA
Schema: { compound: { name, smiles, cid, mw, xLogP, hbd, hba, tpsa, formula, suggestions } }
Gera composto farmacêutico REAL com SMILES válido e CID PubChem`,
  },

  "pericia-forense": {
    name: "Perícia Forense",
    slug: "lab-pericia-forense",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: PERÍCIA FORENSE
Arquivo principal: src/pages/lab-virtual/BancadaPericiaForense.tsx (216 linhas)
Subcomponentes: ForensicCasePanel, ChemicalLabPanel, ToxicologyLabPanel, DNALabPanel, ForensicConclusionPanel
Dados: src/data/forensicScenarios.ts
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Resolução de casos criminais através de 3 laboratórios forenses interdependentes + painel de conclusão final.
Estilo "CSI": feedback diferido — o aluno não sabe se acertou até o Painel de Conclusão.

▸ ESTRUTURA DO CENÁRIO (ForensicScenario)
- Narrativa: title, difficulty, narrative, crimeScene
- Vítima: { name, age, description }
- 3 Suspeitos: { name, relation, description }
- 3 Amostras: { id: "s1"|"s2"|"s3", label, description }

▸ LABORATÓRIOS (3 SEQUENCIAIS)
1. Lab Químico (ChemicalLabPanel):
   - Espectro de massa (Recharts LineChart): ~12 picos { mz, intensity 0-100 }
   - Tabela de referência com 5 substâncias: { substance, basePeak, fragments[3] }
   - Aluno identifica: substância + pico base → sem feedback imediato
   - Resultado: ChemResult { identifiedSubstance, basePeakAnswer }

2. Lab Toxicológico (ToxicologyLabPanel):
   - HPLC (Recharts AreaChart): ~15 pontos { time 0-8min, absorbance }
   - Cromatograma ruidoso (duplicado com noise) para comparação
   - Seleção de: matriz biológica (Sangue/Urina/Conteúdo Estomacal) + reagente (3 opções)
   - Estimativa manual de tempo de retenção + comparação com faixas de referência
   - Resultado: ToxResult { matrix, reagent, estimatedRT, selectedClass, identifiedToxin }

3. Lab DNA (DNALabPanel):
   - Eletroferogramas (Recharts BarChart): 5 loci (vWA, TH01, TPOX, D13S317, FGA)
   - Amostra da cena vs 3 perfis de suspeitos (com alelos)
   - Comparação locus-por-locus com perfis ambíguos e misturas (degradedLoci, mixtureLoci)
   - Resultado: DnaResult { matchedSuspect, locusComparison }

▸ CONCLUSÃO (ForensicConclusionPanel)
- Aluno cruza evidências para acusar 1 dos 3 suspeitos
- Score calculado por precisão em cada etapa (química, tox, DNA, acusação)
- Feedback detalhado: chemicalExplanation, toxExplanation, dnaExplanation, solutionExplanation
- Relatório final exportável em PDF

▸ INTEGRAÇÃO SALA VIRTUAL
- useVirtualRoomCase("pericia-forense") para submissão de resultados em salas virtuais
- submitVRResults: envia score, actions (caseTitle, resultados por lab, suspeito acusado)

▸ GERAÇÃO POR IA
Schema complexo: scenario_json (string JSON completa do ForensicScenario)
Regra crítica: CULPADO deve ter DNA match PERFEITO. Outros suspeitos com sobreposição parcial.`,
  },

  "simulacao-realistica": {
    name: "Simulação Realística",
    slug: "lab-simulacao-realistica",
    prompt: `═══════════════════════════════════════════════════════════════
BANCADA: SIMULAÇÃO REALÍSTICA
Arquivo principal: src/pages/lab-virtual/BancadaSimulacaoRealistica.tsx (401 linhas)
Subcomponentes: PatientRecordPanel, BranchingDecisionPanel, PatientMonitorPanel, DecisionTimelinePanel
═══════════════════════════════════════════════════════════════

▸ PROPÓSITO
Simulação clínica com árvore de decisões ramificadas, sinais vitais dinâmicos e integração com API OpenFDA.

▸ CENÁRIOS NATIVOS (8)
Emergência Hipertensiva, Choque Séptico, Cetoacidose Diabética, Intoxicação Medicamentosa,
Reação Anafilática, IRA, Dor Torácica, Politerapia no Idoso
Campos: id, title, specialty, difficulty

▸ ARQUITETURA DE DECISÃO
- Geração 100% via IA: Edge Function "generate-simulation-scenario"
  Retorna: { patient: PatientData, nodes: DecisionNode[], outcome: { good, bad } }
- PatientData: name, age, sex, weight, height, mainComplaint, history, allergies, currentMeds, vitals
- DecisionNode: { id, title, description, vitals (estado atual), options: DecisionOption[] }
- DecisionOption: { id, label, feedback, isIdeal, nextNodeId, vitalChanges: Partial<PatientVitals> }

▸ FLUXO DINÂMICO
1. Seleção do cenário (Select com 8 nativos + campo de tema livre)
2. loadScenario → chama Edge Function → recebe ScenarioData
3. Loop de decisão:
   a. BranchingDecisionPanel exibe nó atual com 3-4 opções
   b. Aluno escolha → applyVitalChanges modifica sinais vitais atuais
   c. PatientMonitorPanel atualiza em tempo real (FC, PA, SpO2, FR, Temp, Glicemia)
   d. Decisão registrada em decisions[] com timestamp + isIdeal
   e. Avança para nextNodeId do nó
4. Ao completar todos os nós → exibe outcome (bom ou mau, baseado em % de decisões ideais)

▸ INTEGRAÇÃO OpenFDA
- Quando uma decisão envolve medicamento, consulta:
  GET https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:{drug}
- Exibe alertas de eventos adversos reais em fdaAlerts[]

▸ VISUALIZAÇÕES
- PatientMonitorPanel: gauges/barras de sinais vitais com cores de alerta
- DecisionTimelinePanel: timeline vertical das decisões tomadas (com ícones ideal/subótimo)
- vitalsHistory[]: array de snapshots para gráfico de evolução temporal

▸ INTEGRAÇÃO SALA VIRTUAL
- useVirtualRoomCase("simulacao-realistica")
- Submissão: score (% ideais), actions (título, decisões, vitais finais, outcome)

▸ GERAÇÃO POR IA
Edge Function: generate-simulation-scenario
Entrada: { scenarioId, title, specialty, difficulty }
Retorno: ScenarioData completo com árvore de decisão e desfechos
Usado tanto para cenários nativos (com title/specialty predefinidos) quanto para temas livres`,
  },
};
