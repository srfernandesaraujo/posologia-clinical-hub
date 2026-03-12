// ─── Forensic Lab Scenario Data (CSI-style investigative) ─────────────────
// No obvious answers. Students must interpret raw data and compare manually.
// Feedback is deferred to the conclusion panel only.

export interface ForensicSample {
  id: string;
  label: string;
  description: string;
}

export interface SpectrumPeak {
  mz: number;
  intensity: number;
}

export interface ChemicalReference {
  substance: string;
  basePeak: number;
  fragments: number[];
}

export interface ChemicalAnalysis {
  sampleId: string;
  spectrum: SpectrumPeak[];
  correctSubstance: string;
  correctBasePeak: number;
  referenceTable: ChemicalReference[];
}

export interface ChromatogramPoint {
  time: number;
  absorbance: number;
}

export interface RetentionRange {
  className: string;
  rangeMin: number;
  rangeMax: number;
  substances: string[];
}

export interface ToxicologyAnalysis {
  matrices: string[];
  correctMatrix: string;
  reagents: string[];
  correctReagent: string;
  chromatogram: ChromatogramPoint[];
  noisyChromatogram: ChromatogramPoint[];
  correctRetentionTime: number;
  retentionRanges: RetentionRange[];
  correctSubstance: string;
  correctClass: string;
}

export interface AllelePeak {
  locus: string;
  alleles: number[];
}

export interface DNAProfile {
  label: string;
  peaks: AllelePeak[];
}

export interface DNAAnalysis {
  sceneSample: DNAProfile;
  suspects: DNAProfile[];
  correctSuspectIndex: number;
  degradedLoci: string[];
  mixtureLoci: string[];
}

export interface ForensicScenario {
  id: string;
  title: string;
  difficulty: string;
  narrative: string;
  crimeScene: string;
  victim: { name: string; age: number; description: string };
  suspects: { name: string; relation: string; description: string }[];
  samples: ForensicSample[];
  chemicalAnalysis: ChemicalAnalysis;
  toxicologyAnalysis: ToxicologyAnalysis;
  dnaAnalysis: DNAAnalysis;
  correctCulpritIndex: number;
  solutionExplanation: string;
  chemicalExplanation: string;
  toxExplanation: string;
  dnaExplanation: string;
}

const LOCI = ["vWA", "TH01", "TPOX", "D13S317", "FGA"];

export { LOCI };

export const FORENSIC_SCENARIOS: ForensicScenario[] = [
  // ──── 1. Envenenamento no Jantar ────
  {
    id: "envenenamento-jantar",
    title: "Envenenamento no Jantar",
    difficulty: "Difícil",
    narrative: "Durante um jantar de confraternização, o anfitrião colapsa após beber vinho tinto. O SAMU constata óbito por parada respiratória. A perícia é acionada.",
    crimeScene: "Sala de jantar — mesa posta com 4 taças de vinho, pratos e garrafas. Resíduo cristalino encontrado no fundo de uma taça.",
    victim: { name: "Carlos Mendonça", age: 58, description: "Empresário, saudável, sem histórico de doenças." },
    suspects: [
      { name: "Ana Mendonça", relation: "Esposa", description: "Herdeira universal. Relação conflituosa nos últimos meses." },
      { name: "Roberto Leal", relation: "Sócio", description: "Devia R$500 mil a Carlos. Processo judicial em andamento." },
      { name: "Marcos Duarte", relation: "Chef contratado", description: "Preparou o jantar. Sem vínculo pessoal aparente." },
    ],
    samples: [
      { id: "s1", label: "Resíduo cristalino (taça)", description: "Pó branco fino encontrado no fundo da taça da vítima" },
      { id: "s2", label: "Vinho tinto (garrafa)", description: "Amostra do vinho servido — garrafa aberta" },
      { id: "s3", label: "Tempero da cozinha", description: "Pó branco do recipiente de temperos do chef" },
    ],
    chemicalAnalysis: {
      sampleId: "s1",
      spectrum: [
        { mz: 50, intensity: 5 }, { mz: 80, intensity: 12 }, { mz: 120, intensity: 18 },
        { mz: 162, intensity: 22 }, { mz: 215, intensity: 15 }, { mz: 264, intensity: 55 },
        { mz: 282, intensity: 38 }, { mz: 334, intensity: 95 }, { mz: 350, intensity: 30 },
        { mz: 380, intensity: 12 }, { mz: 394, intensity: 28 }, { mz: 400, intensity: 8 },
      ],
      correctSubstance: "Estricnina",
      correctBasePeak: 334,
      referenceTable: [
        { substance: "Estricnina", basePeak: 334, fragments: [264, 282, 120] },
        { substance: "Brucina", basePeak: 394, fragments: [264, 324, 162] },
        { substance: "Cafeína", basePeak: 194, fragments: [109, 137, 82] },
        { substance: "Sacarose", basePeak: 342, fragments: [180, 163, 127] },
        { substance: "Atropina", basePeak: 289, fragments: [124, 94, 67] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Conteúdo Estomacal",
      reagents: ["Metanol", "Acetonitrila", "Éter dietílico"],
      correctReagent: "Acetonitrila",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 0.5, absorbance: 2 }, { time: 1, absorbance: 5 },
        { time: 1.5, absorbance: 3 }, { time: 2, absorbance: 8 }, { time: 2.5, absorbance: 4 },
        { time: 3, absorbance: 6 }, { time: 3.5, absorbance: 10 }, { time: 4, absorbance: 15 },
        { time: 4.2, absorbance: 85 }, { time: 4.4, absorbance: 20 }, { time: 5, absorbance: 8 },
        { time: 5.5, absorbance: 5 }, { time: 6, absorbance: 12 }, { time: 6.5, absorbance: 6 },
        { time: 7, absorbance: 3 }, { time: 8, absorbance: 1 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 3 }, { time: 0.5, absorbance: 8 }, { time: 1, absorbance: 12 },
        { time: 1.5, absorbance: 9 }, { time: 2, absorbance: 15 }, { time: 2.5, absorbance: 11 },
        { time: 3, absorbance: 14 }, { time: 3.5, absorbance: 18 }, { time: 4, absorbance: 22 },
        { time: 4.2, absorbance: 55 }, { time: 4.4, absorbance: 28 }, { time: 5, absorbance: 16 },
        { time: 5.5, absorbance: 13 }, { time: 6, absorbance: 19 }, { time: 6.5, absorbance: 14 },
        { time: 7, absorbance: 10 }, { time: 8, absorbance: 7 },
      ],
      correctRetentionTime: 4.2,
      retentionRanges: [
        { className: "Analgésicos / Anti-inflamatórios", rangeMin: 1.5, rangeMax: 2.5, substances: ["Paracetamol", "Ibuprofeno", "AAS"] },
        { className: "Alcaloides naturais", rangeMin: 3.8, rangeMax: 4.5, substances: ["Estricnina", "Brucina", "Nicotina"] },
        { className: "Metais pesados", rangeMin: 5.5, rangeMax: 6.5, substances: ["Arsênico", "Tálio", "Chumbo"] },
        { className: "Cianetos / Compostos inorgânicos", rangeMin: 1.0, rangeMax: 1.5, substances: ["Cianeto de potássio", "Fluoreto de sódio"] },
        { className: "Opioides sintéticos", rangeMin: 5.0, rangeMax: 5.8, substances: ["Fentanil", "Metadona", "Tramadol"] },
      ],
      correctSubstance: "Estricnina",
      correctClass: "Alcaloides naturais",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA da taça da vítima (borda)", peaks: [
        { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [7, 9] },
        { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [11, 13] },
        { locus: "FGA", alleles: [21, 24] },
      ]},
      suspects: [
        { label: "Suspeita A — Ana", peaks: [
          { locus: "vWA", alleles: [16, 17] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [8, 10] }, { locus: "D13S317", alleles: [11, 14] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito B — Roberto", peaks: [
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [11, 13] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
        { label: "Suspeito C — Marcos", peaks: [
          { locus: "vWA", alleles: [16, 19] }, { locus: "TH01", alleles: [8, 9] },
          { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [10, 13] },
          { locus: "FGA", alleles: [21, 23] },
        ]},
      ],
      correctSuspectIndex: 1,
      degradedLoci: [],
      mixtureLoci: [],
    },
    correctCulpritIndex: 1,
    solutionExplanation: "O resíduo cristalino na taça foi identificado como Estricnina pelo espectrômetro de massa. A toxicologia confirmou Estricnina no conteúdo estomacal. O DNA na borda da taça da vítima correspondeu ao perfil genético de Roberto Leal, que tinha motivo financeiro (dívida de R$500 mil) e oportunidade (teve acesso à taça durante o jantar).",
    chemicalExplanation: "O espectro de massa apresenta pico base em m/z 334 com fragmentos relevantes em 264 e 282 — padrão característico da Estricnina. Embora haja um pico em 394 (que poderia sugerir Brucina), ele está com intensidade muito inferior ao pico base, indicando contaminação residual ou fragmento secundário. A Sacarose teria pico base em 342, próximo mas distinto.",
    toxExplanation: "O conteúdo estomacal é a matriz ideal pois o veneno foi ingerido oralmente com o vinho. O pico principal do cromatograma aparece em aproximadamente 4.2 minutos, dentro da faixa de Alcaloides naturais (3.8-4.5 min), confirmando Estricnina. A Acetonitrila é o reagente ideal para extração de alcaloides em meio biológico.",
    dnaExplanation: "A comparação locus-por-locus mostra que Roberto (Suspeito B) tem match perfeito em todos os 5 loci com a amostra da cena. Ana compartilha 3 loci parcialmente (vWA tem um alelo diferente: 17 vs 18; TPOX: 10 vs 11; D13S317: 14 vs 13), o que é esperado por ser da mesma família. Marcos compartilha alguns alelos mas difere em vWA, TH01 e FGA.",
  },

  // ──── 2. Incêndio Criminoso ────
  {
    id: "incendio-criminoso",
    title: "Incêndio Criminoso",
    difficulty: "Médio",
    narrative: "Um galpão comercial foi destruído por incêndio durante a madrugada. O seguro milionário levanta suspeitas. Acelerante encontrado nos escombros.",
    crimeScene: "Galpão comercial incendiado — padrões de queima em V, múltiplos pontos de origem, resíduos líquidos em áreas não completamente consumidas.",
    victim: { name: "Patrimônio — Galpão Logística Sul", age: 0, description: "Galpão avaliado em R$2 milhões. Seguro recém-atualizado." },
    suspects: [
      { name: "Pedro Alves", relation: "Proprietário", description: "Atualizou seguro 2 semanas antes. Empresa com dívidas." },
      { name: "Sandra Costa", relation: "Ex-gerente", description: "Demitida na semana anterior. Ameaçou 'dar o troco'." },
      { name: "Jorge Lima", relation: "Vigilante noturno", description: "Não estava no posto na noite do incêndio." },
    ],
    samples: [
      { id: "s1", label: "Resíduo líquido (piso)", description: "Líquido com odor forte encontrado em área não queimada" },
      { id: "s2", label: "Tecido chamuscado", description: "Fragmento de tecido com acelerante impregnado" },
      { id: "s3", label: "Resíduo de pavio", description: "Material fibroso encontrado em ponto de origem" },
    ],
    chemicalAnalysis: {
      sampleId: "s1",
      spectrum: [
        { mz: 40, intensity: 8 }, { mz: 43, intensity: 30 }, { mz: 57, intensity: 45 },
        { mz: 71, intensity: 60 }, { mz: 85, intensity: 95 }, { mz: 99, intensity: 70 },
        { mz: 113, intensity: 50 }, { mz: 127, intensity: 35 }, { mz: 141, intensity: 20 },
        { mz: 155, intensity: 12 }, { mz: 170, intensity: 5 },
      ],
      correctSubstance: "Gasolina",
      correctBasePeak: 85,
      referenceTable: [
        { substance: "Gasolina", basePeak: 85, fragments: [57, 71, 99, 113] },
        { substance: "Querosene", basePeak: 85, fragments: [71, 99, 113, 127, 141, 155] },
        { substance: "Diesel", basePeak: 57, fragments: [71, 85, 99, 113, 141] },
        { substance: "Acetona", basePeak: 43, fragments: [58, 42, 15] },
        { substance: "Etanol", basePeak: 31, fragments: [45, 46, 29] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Sangue",
      reagents: ["Hexano", "Acetonitrila", "Diclorometano"],
      correctReagent: "Hexano",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 1, absorbance: 3 }, { time: 2, absorbance: 10 },
        { time: 2.5, absorbance: 18 }, { time: 3, absorbance: 25 }, { time: 3.5, absorbance: 70 },
        { time: 3.8, absorbance: 30 }, { time: 4, absorbance: 15 }, { time: 5, absorbance: 8 },
        { time: 6, absorbance: 5 }, { time: 7, absorbance: 2 }, { time: 8, absorbance: 1 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 5 }, { time: 1, absorbance: 10 }, { time: 2, absorbance: 18 },
        { time: 2.5, absorbance: 24 }, { time: 3, absorbance: 30 }, { time: 3.5, absorbance: 48 },
        { time: 3.8, absorbance: 34 }, { time: 4, absorbance: 22 }, { time: 5, absorbance: 15 },
        { time: 6, absorbance: 12 }, { time: 7, absorbance: 9 }, { time: 8, absorbance: 6 },
      ],
      correctRetentionTime: 3.5,
      retentionRanges: [
        { className: "Álcoois simples", rangeMin: 1.5, rangeMax: 2.2, substances: ["Etanol", "Metanol", "Isopropanol"] },
        { className: "Hidrocarbonetos aromáticos (BTEX)", rangeMin: 3.2, rangeMax: 3.8, substances: ["Benzeno", "Tolueno", "Xileno"] },
        { className: "Cetonas", rangeMin: 2.0, rangeMax: 2.8, substances: ["Acetona", "MEK", "Ciclohexanona"] },
        { className: "Solventes clorados", rangeMin: 4.5, rangeMax: 5.5, substances: ["Clorofórmio", "Diclorometano", "Tricloroetileno"] },
        { className: "Hidrocarbonetos pesados", rangeMin: 5.8, rangeMax: 7.0, substances: ["Querosene", "Diesel", "Óleo mineral"] },
      ],
      correctSubstance: "Benzeno",
      correctClass: "Hidrocarbonetos aromáticos (BTEX)",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA do pavio (suor/contato)", peaks: [
        { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [8, 9.3] },
        { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [12, 14] },
        { locus: "FGA", alleles: [22, 25] },
      ]},
      suspects: [
        { label: "Suspeito A — Pedro", peaks: [
          { locus: "vWA", alleles: [15, 16] }, { locus: "TH01", alleles: [7, 8] },
          { locus: "TPOX", alleles: [9, 12] }, { locus: "D13S317", alleles: [11, 14] },
          { locus: "FGA", alleles: [22, 23] },
        ]},
        { label: "Suspeita B — Sandra", peaks: [
          { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [8, 9.3] },
          { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito C — Jorge", peaks: [
          { locus: "vWA", alleles: [15, 18] }, { locus: "TH01", alleles: [8, 9] },
          { locus: "TPOX", alleles: [9, 10] }, { locus: "D13S317", alleles: [12, 15] },
          { locus: "FGA", alleles: [22, 24] },
        ]},
      ],
      correctSuspectIndex: 1,
      degradedLoci: [],
      mixtureLoci: [],
    },
    correctCulpritIndex: 1,
    solutionExplanation: "A gasolina foi identificada como acelerante nos escombros. Vestígios de benzeno (componente da gasolina) foram encontrados no sangue coletado na cena. O DNA no pavio corresponde a Sandra Costa, ex-gerente demitida, que tinha motivo (vingança) e acesso ao galpão com suas chaves.",
    chemicalExplanation: "O espectro mostra pico base em m/z 85 com série homóloga descendente (57, 71, 99, 113) — padrão típico de hidrocarbonetos de cadeia longa. Gasolina e Querosene compartilham o pico base 85, mas a gasolina apresenta uma distribuição mais concentrada nos fragmentos menores (57, 71), enquanto o querosene mostra intensidade relativa maior nos fragmentos pesados (127, 141, 155). O padrão de intensidades decrescente sem picos em fragmentos pesados confirma Gasolina.",
    toxExplanation: "O sangue é a matriz correta pois detecta a inalação de vapores do acelerante. O pico principal aparece em ~3.5 min, na faixa de Hidrocarbonetos aromáticos BTEX (3.2-3.8 min). O Benzeno é o marcador primário da exposição à gasolina. Hexano é o reagente ideal para extração de hidrocarbonetos apolares em sangue.",
    dnaExplanation: "Sandra (Suspeita B) apresenta match perfeito em todos os 5 loci. Pedro compartilha vWA parcialmente (15 mas 16 no lugar de 17) e FGA parcialmente (22 mas 23 no lugar de 25). Jorge compartilha vWA parcialmente e vários alelos individuais, mas difere em TH01 (9 vs 9.3), TPOX (10 vs 11) e FGA (24 vs 25).",
  },

  // ──── 3. Overdose Suspeita ────
  {
    id: "overdose-suspeita",
    title: "Overdose Suspeita",
    difficulty: "Médio",
    narrative: "Jovem de 24 anos encontrado inconsciente em seu apartamento. O SAMU constata óbito. Frascos de medicamentos e pó desconhecido ao lado do corpo.",
    crimeScene: "Quarto — corpo na cama, 3 frascos de medicamentos na mesinha, saco plástico com pó branco, copo com restos de líquido.",
    victim: { name: "Lucas Ribeiro", age: 24, description: "Estudante universitário sem histórico de uso de drogas conhecido." },
    suspects: [
      { name: "Thiago Santos", relation: "Colega de quarto", description: "Última pessoa a ver Lucas vivo. Histórico com drogas." },
      { name: "Camila Ferreira", relation: "Ex-namorada", description: "Rompimento recente conturbado. Acesso ao apartamento." },
      { name: "Diego Nunes", relation: "Fornecedor", description: "Conhecido do bairro. Mensagens no celular de Lucas." },
    ],
    samples: [
      { id: "s1", label: "Pó branco (saco plástico)", description: "Substância em pó encontrada ao lado do corpo" },
      { id: "s2", label: "Comprimidos (frasco 1)", description: "Comprimidos brancos sem identificação" },
      { id: "s3", label: "Resíduo no copo", description: "Líquido turvo com precipitado" },
    ],
    chemicalAnalysis: {
      sampleId: "s1",
      spectrum: [
        { mz: 42, intensity: 10 }, { mz: 82, intensity: 30 }, { mz: 105, intensity: 15 },
        { mz: 150, intensity: 20 }, { mz: 182, intensity: 45 }, { mz: 234, intensity: 18 },
        { mz: 272, intensity: 25 }, { mz: 303, intensity: 92 }, { mz: 320, intensity: 18 },
        { mz: 350, intensity: 5 },
      ],
      correctSubstance: "Cocaína",
      correctBasePeak: 303,
      referenceTable: [
        { substance: "Cocaína", basePeak: 303, fragments: [182, 82, 272] },
        { substance: "Lidocaína", basePeak: 234, fragments: [86, 120, 206] },
        { substance: "Procaína", basePeak: 236, fragments: [120, 99, 164] },
        { substance: "Manitol", basePeak: 181, fragments: [73, 103, 163] },
        { substance: "Fentanil", basePeak: 245, fragments: [146, 189, 336] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Sangue",
      reagents: ["Metanol", "Acetonitrila", "Clorofórmio"],
      correctReagent: "Metanol",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 1, absorbance: 5 }, { time: 1.5, absorbance: 12 },
        { time: 2, absorbance: 8 }, { time: 2.5, absorbance: 40 }, { time: 2.8, absorbance: 15 },
        { time: 3, absorbance: 10 }, { time: 4, absorbance: 6 }, { time: 5, absorbance: 18 },
        { time: 5.5, absorbance: 88 }, { time: 5.8, absorbance: 22 }, { time: 6, absorbance: 8 },
        { time: 7, absorbance: 3 }, { time: 8, absorbance: 1 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 4 }, { time: 1, absorbance: 10 }, { time: 1.5, absorbance: 18 },
        { time: 2, absorbance: 14 }, { time: 2.5, absorbance: 35 }, { time: 2.8, absorbance: 20 },
        { time: 3, absorbance: 16 }, { time: 4, absorbance: 12 }, { time: 5, absorbance: 22 },
        { time: 5.5, absorbance: 60 }, { time: 5.8, absorbance: 28 }, { time: 6, absorbance: 15 },
        { time: 7, absorbance: 10 }, { time: 8, absorbance: 7 },
      ],
      correctRetentionTime: 5.5,
      retentionRanges: [
        { className: "Estimulantes / Anfetaminas", rangeMin: 2.2, rangeMax: 2.8, substances: ["Anfetamina", "Metanfetamina", "MDMA"] },
        { className: "Cocaína e metabolitos", rangeMin: 3.5, rangeMax: 4.2, substances: ["Cocaína", "Benzoilecgonina", "Ecgonina"] },
        { className: "Opioides sintéticos", rangeMin: 5.2, rangeMax: 5.8, substances: ["Fentanil", "Carfentanil", "Sufentanil"] },
        { className: "Benzodiazepínicos", rangeMin: 6.8, rangeMax: 7.5, substances: ["Diazepam", "Midazolam", "Alprazolam"] },
        { className: "Analgésicos comuns", rangeMin: 1.5, rangeMax: 2.2, substances: ["Paracetamol", "Dipirona", "AAS"] },
      ],
      correctSubstance: "Fentanil",
      correctClass: "Opioides sintéticos",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA do saco plástico (toque)", peaks: [
        { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 8] },
        { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [9, 11] },
        { locus: "FGA", alleles: [23, 26] },
      ]},
      suspects: [
        { label: "Suspeito A — Thiago", peaks: [
          { locus: "vWA", alleles: [14, 17] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [10, 11] }, { locus: "D13S317", alleles: [9, 14] },
          { locus: "FGA", alleles: [23, 24] },
        ]},
        { label: "Suspeita B — Camila", peaks: [
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [10, 13] }, { locus: "D13S317", alleles: [10, 13] },
          { locus: "FGA", alleles: [22, 26] },
        ]},
        { label: "Suspeito C — Diego", peaks: [
          { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 8] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [9, 11] },
          { locus: "FGA", alleles: [23, 26] },
        ]},
      ],
      correctSuspectIndex: 2,
      degradedLoci: [],
      mixtureLoci: [],
    },
    correctCulpritIndex: 2,
    solutionExplanation: "O pó branco foi identificado como Cocaína. Porém a toxicologia revelou Fentanil no sangue — substância muito mais letal, adicionada à cocaína (adulteração). O DNA no saco plástico correspondeu a Diego Nunes, o fornecedor, que adulterou a droga com Fentanil, causando a overdose fatal.",
    chemicalExplanation: "O espectro mostra pico base em m/z 303 com fragmentos em 182 e 82 — assinatura clássica da Cocaína. Note que a Lidocaína (adulterante comum) teria pico base em 234 e a Fentanil em 245 — ambos ausentes como picos dominantes. O pico em 272 é um fragmento secundário da Cocaína, não o pico base de outra substância.",
    toxExplanation: "O sangue é a matriz ideal para detectar substâncias na corrente sanguínea. O cromatograma mostra DOIS picos significativos: um em ~2.5 min (faixa de estimulantes — Cocaína/metabolito) e outro maior em ~5.5 min (faixa de opioides sintéticos — Fentanil). O pico PRINCIPAL (mais alto) está em 5.5 min, identificando Fentanil como a substância predominante no sangue.",
    dnaExplanation: "Diego (Suspeito C) apresenta match perfeito em todos os 5 loci. Thiago compartilha vWA parcialmente (14, mas 17 em vez de 16), TH01 parcialmente (7 mas 9 em vez de 8) e FGA parcialmente (23 mas 24 em vez de 26). Camila compartilha alguns alelos isolados mas difere significativamente em vários loci.",
  },

  // ──── 4. Falsificação de Medicamentos ────
  {
    id: "falsificacao-medicamentos",
    title: "Falsificação de Medicamentos",
    difficulty: "Fácil",
    narrative: "Pacientes de uma farmácia apresentam reações adversas após usar um anti-hipertensivo. A ANVISA aciona a perícia para investigar lote suspeito.",
    crimeScene: "Farmácia Centro — lote 2024-0892 de Enalapril 10mg, 200 unidades distribuídas. 12 pacientes com queixas.",
    victim: { name: "Pacientes diversos", age: 0, description: "12 pacientes com reações: taquicardia, tremores, insônia — incompatíveis com Enalapril." },
    suspects: [
      { name: "Farmácia Popular Centro", relation: "Dispensadora", description: "Comprou o lote de distribuidor não autorizado." },
      { name: "Distribuidora MedBrasil", relation: "Distribuidora", description: "Empresa recém-aberta. Sem registro na ANVISA." },
      { name: "Carlos Mendes", relation: "Farmacêutico RT", description: "Responsável técnico que aceitou o lote sem conferir nota fiscal." },
    ],
    samples: [
      { id: "s1", label: "Comprimido do lote suspeito", description: "Comprimido branco rotulado como Enalapril 10mg" },
      { id: "s2", label: "Comprimido referência", description: "Enalapril 10mg original do fabricante" },
      { id: "s3", label: "Embalagem", description: "Blister e caixa do lote suspeito" },
    ],
    chemicalAnalysis: {
      sampleId: "s1",
      spectrum: [
        { mz: 44, intensity: 15 }, { mz: 51, intensity: 12 }, { mz: 77, intensity: 25 },
        { mz: 91, intensity: 40 }, { mz: 119, intensity: 30 }, { mz: 134, intensity: 28 },
        { mz: 148, intensity: 90 }, { mz: 164, intensity: 35 }, { mz: 180, intensity: 20 },
        { mz: 210, intensity: 10 },
      ],
      correctSubstance: "Anfetamina",
      correctBasePeak: 148,
      referenceTable: [
        { substance: "Anfetamina", basePeak: 148, fragments: [91, 119, 44] },
        { substance: "Efedrina", basePeak: 146, fragments: [77, 117, 131] },
        { substance: "Enalapril", basePeak: 376, fragments: [234, 206, 160] },
        { substance: "Metanfetamina", basePeak: 134, fragments: [91, 58, 77] },
        { substance: "Pseudoefedrina", basePeak: 146, fragments: [117, 77, 132] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Urina",
      reagents: ["Metanol", "Acetonitrila", "Éter dietílico"],
      correctReagent: "Metanol",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 0.5, absorbance: 3 }, { time: 1, absorbance: 8 },
        { time: 1.5, absorbance: 5 }, { time: 2, absorbance: 12 }, { time: 2.5, absorbance: 82 },
        { time: 2.8, absorbance: 25 }, { time: 3, absorbance: 10 }, { time: 4, absorbance: 5 },
        { time: 5, absorbance: 3 }, { time: 6, absorbance: 1 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 5 }, { time: 0.5, absorbance: 9 }, { time: 1, absorbance: 14 },
        { time: 1.5, absorbance: 11 }, { time: 2, absorbance: 17 }, { time: 2.5, absorbance: 55 },
        { time: 2.8, absorbance: 30 }, { time: 3, absorbance: 16 }, { time: 4, absorbance: 11 },
        { time: 5, absorbance: 9 }, { time: 6, absorbance: 6 },
      ],
      correctRetentionTime: 2.5,
      retentionRanges: [
        { className: "Analgésicos / Anti-inflamatórios", rangeMin: 1.2, rangeMax: 1.8, substances: ["Paracetamol", "Dipirona", "AAS"] },
        { className: "Estimulantes / Anfetaminas", rangeMin: 2.2, rangeMax: 2.8, substances: ["Anfetamina", "Metanfetamina", "MDMA"] },
        { className: "Cafeína e xantinas", rangeMin: 3.0, rangeMax: 3.5, substances: ["Cafeína", "Teofilina", "Teobromina"] },
        { className: "Anti-hipertensivos (IECA)", rangeMin: 4.5, rangeMax: 5.2, substances: ["Enalapril", "Captopril", "Lisinopril"] },
        { className: "Hipoglicemiantes", rangeMin: 1.2, rangeMax: 1.8, substances: ["Metformina", "Glibenclamida"] },
      ],
      correctSubstance: "Anfetamina",
      correctClass: "Estimulantes / Anfetaminas",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA da embalagem (impressão digital)", peaks: [
        { locus: "vWA", alleles: [17, 19] }, { locus: "TH01", alleles: [6, 8] },
        { locus: "TPOX", alleles: [10, 13] }, { locus: "D13S317", alleles: [11, 15] },
        { locus: "FGA", alleles: [20, 22] },
      ]},
      suspects: [
        { label: "Suspeito A — Farmácia (funcionário)", peaks: [
          { locus: "vWA", alleles: [17, 16] }, { locus: "TH01", alleles: [6, 9] },
          { locus: "TPOX", alleles: [10, 11] }, { locus: "D13S317", alleles: [11, 14] },
          { locus: "FGA", alleles: [20, 24] },
        ]},
        { label: "Suspeito B — MedBrasil (responsável)", peaks: [
          { locus: "vWA", alleles: [17, 19] }, { locus: "TH01", alleles: [6, 8] },
          { locus: "TPOX", alleles: [10, 13] }, { locus: "D13S317", alleles: [11, 15] },
          { locus: "FGA", alleles: [20, 22] },
        ]},
        { label: "Suspeito C — Carlos Mendes", peaks: [
          { locus: "vWA", alleles: [17, 18] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [11, 13] },
          { locus: "FGA", alleles: [20, 25] },
        ]},
      ],
      correctSuspectIndex: 1,
      degradedLoci: [],
      mixtureLoci: [],
    },
    correctCulpritIndex: 1,
    solutionExplanation: "Os comprimidos rotulados como Enalapril continham Anfetamina, explicando taquicardia e insônia nos pacientes. A toxicologia dos pacientes confirmou Anfetamina na urina. O DNA na embalagem correspondeu ao responsável da Distribuidora MedBrasil, empresa fantasma que fabricava medicamentos falsificados.",
    chemicalExplanation: "O pico base em m/z 148 com fragmentos em 91 e 119 é característico da Anfetamina. Note que Efedrina e Pseudoefedrina teriam pico base em 146 (2 unidades de diferença — isômeros distintos). Se fosse realmente Enalapril, o pico base seria 376. A presença de picos em regiões de baixo peso molecular (44, 77, 91) é inconsistente com IECA.",
    toxExplanation: "A urina é a melhor matriz para confirmar uso recente de estimulantes, pois concentra metabólitos. O pico principal em ~2.5 min está na faixa de Estimulantes/Anfetaminas (2.2-2.8 min), confirmando Anfetamina. Note que o Enalapril teria tempo de retenção na faixa 4.5-5.2 min — completamente ausente.",
    dnaExplanation: "O responsável da MedBrasil (Suspeito B) tem match perfeito em todos os 5 loci. O funcionário da farmácia compartilha vWA parcialmente (17 mas 16 vs 19) e vários alelos individuais. Carlos Mendes compartilha vWA parcialmente (17 mas 18 vs 19) e D13S317 parcialmente (11 mas 13 vs 15).",
  },

  // ──── 5. Intoxicação Crônica ────
  {
    id: "intoxicacao-cronica",
    title: "Homicídio por Intoxicação Crônica",
    difficulty: "Difícil",
    narrative: "Idosa de 72 anos falece após semanas de deterioração progressiva: perda de cabelo, neuropatia, vômitos. Família suspeita de envenenamento crônico.",
    crimeScene: "Residência — amostras de cabelo da vítima, água e alimentos da cozinha coletados. Frasco de raticida encontrado escondido.",
    victim: { name: "Dona Helena Souza", age: 72, description: "Aposentada, viúva rica. Sintomas crônicos nas últimas 6 semanas." },
    suspects: [
      { name: "Renata Souza", relation: "Neta", description: "Mora com a avó. Principal beneficiária do testamento." },
      { name: "Maria (cuidadora)", relation: "Cuidadora", description: "Contratada há 3 meses. Prepara as refeições diárias." },
      { name: "Dr. Paulo", relation: "Médico", description: "Prescrevia manipulados. Acesso a substâncias." },
    ],
    samples: [
      { id: "s1", label: "Raticida (frasco escondido)", description: "Frasco de raticida encontrado atrás do armário da cozinha" },
      { id: "s2", label: "Amostra de cabelo", description: "Fio de cabelo da vítima para análise segmentar" },
      { id: "s3", label: "Água da garrafa", description: "Água da garrafa pessoal da vítima na geladeira" },
    ],
    chemicalAnalysis: {
      sampleId: "s1",
      spectrum: [
        { mz: 75, intensity: 90 }, { mz: 91, intensity: 15 }, { mz: 107, intensity: 10 },
        { mz: 121, intensity: 22 }, { mz: 150, intensity: 60 }, { mz: 197, intensity: 25 },
        { mz: 225, intensity: 8 },
      ],
      correctSubstance: "Arsênico (trióxido)",
      correctBasePeak: 75,
      referenceTable: [
        { substance: "Arsênico (trióxido)", basePeak: 75, fragments: [150, 197, 107] },
        { substance: "Antimônio", basePeak: 121, fragments: [91, 75, 197] },
        { substance: "Tálio", basePeak: 205, fragments: [203, 81, 115] },
        { substance: "Chumbo", basePeak: 208, fragments: [206, 207, 104] },
        { substance: "Warfarina", basePeak: 308, fragments: [161, 121, 91] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Cabelo (segmentar)"],
      correctMatrix: "Cabelo (segmentar)",
      reagents: ["Ácido nítrico", "Acetonitrila", "Metanol"],
      correctReagent: "Ácido nítrico",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 1, absorbance: 5 }, { time: 2, absorbance: 15 },
        { time: 3, absorbance: 25 }, { time: 3.5, absorbance: 40 }, { time: 4, absorbance: 55 },
        { time: 4.5, absorbance: 78 }, { time: 5, absorbance: 92 }, { time: 5.3, absorbance: 60 },
        { time: 6, absorbance: 30 }, { time: 7, absorbance: 10 }, { time: 8, absorbance: 3 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 5 }, { time: 1, absorbance: 12 }, { time: 2, absorbance: 22 },
        { time: 3, absorbance: 30 }, { time: 3.5, absorbance: 42 }, { time: 4, absorbance: 50 },
        { time: 4.5, absorbance: 62 }, { time: 5, absorbance: 68 }, { time: 5.3, absorbance: 50 },
        { time: 6, absorbance: 35 }, { time: 7, absorbance: 18 }, { time: 8, absorbance: 10 },
      ],
      correctRetentionTime: 5.0,
      retentionRanges: [
        { className: "Metais leves (alcalinos)", rangeMin: 2.5, rangeMax: 3.5, substances: ["Lítio", "Bário", "Cálcio"] },
        { className: "Metaloides / Semimetais", rangeMin: 4.5, rangeMax: 5.5, substances: ["Arsênico", "Selênio", "Telúrio"] },
        { className: "Metais pesados (grupo 1)", rangeMin: 5.8, rangeMax: 6.8, substances: ["Mercúrio", "Cádmio", "Cromo"] },
        { className: "Metais pesados (grupo 2)", rangeMin: 7.0, rangeMax: 8.0, substances: ["Tálio", "Chumbo", "Bismuto"] },
        { className: "Raticidas orgânicos", rangeMin: 3.0, rangeMax: 4.0, substances: ["Warfarina", "Brodifacum", "Bromadiolona"] },
      ],
      correctSubstance: "Arsênico",
      correctClass: "Metaloides / Semimetais",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA do frasco de raticida (toque)", peaks: [
        { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [9, 9.3] },
        { locus: "TPOX", alleles: [8, 10] }, { locus: "D13S317", alleles: [12, 14] },
        { locus: "FGA", alleles: [22, 24] },
      ]},
      suspects: [
        { label: "Suspeita A — Renata", peaks: [
          { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [9, 9.3] },
          { locus: "TPOX", alleles: [8, 10] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [22, 24] },
        ]},
        { label: "Suspeita B — Maria", peaks: [
          { locus: "vWA", alleles: [15, 18] }, { locus: "TH01", alleles: [9, 8] },
          { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [12, 13] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito C — Dr. Paulo", peaks: [
          { locus: "vWA", alleles: [14, 17] }, { locus: "TH01", alleles: [9.3, 10] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [13, 15] },
          { locus: "FGA", alleles: [20, 24] },
        ]},
      ],
      correctSuspectIndex: 0,
      degradedLoci: ["D13S317"],
      mixtureLoci: [],
    },
    correctCulpritIndex: 0,
    solutionExplanation: "O frasco continha Arsênico (trióxido). A análise segmentar do cabelo revelou exposição crônica ao Arsênico ao longo de 6 semanas. O DNA no frasco correspondeu a Renata Souza, a neta, que administrava doses sub-letais progressivas para simular morte natural e herdar a fortuna.",
    chemicalExplanation: "O pico base em m/z 75 corresponde ao íon As⁺ (arsênico). O fragmento em 150 (2×75) confirma o dímero As₂⁺, e 197 corresponde ao As₂O₃⁺ (trióxido completo). O Antimônio, embora próximo quimicamente, teria pico base em 121 (Sb⁺). A presença simultânea de 75, 150 e 197 é diagnóstica para Arsênico trióxido.",
    toxExplanation: "O cabelo segmentar é a única matriz que revela exposição CRÔNICA (ao longo de semanas). Sangue e urina mostram apenas exposição aguda recente. O pico principal em ~5.0 min está na faixa de Metaloides/Semimetais (4.5-5.5 min). O ácido nítrico é obrigatório para digestão da matriz de cabelo e solubilização de metais.",
    dnaExplanation: "Renata (Suspeita A) apresenta match perfeito nos 4 loci avaliáveis (D13S317 estava degradado). Maria compartilha vWA parcialmente (15 mas 18 vs 17) e vários alelos individuais, mas difere em TH01 (8 vs 9.3), TPOX (11 vs 10) e FGA (25 vs 24). Dr. Paulo difere em vWA (14 vs 15), TH01 (10 vs 9) e TPOX (12 vs 8).",
  },

  // ──── 6. Acidente ou Crime? ────
  {
    id: "acidente-ou-crime",
    title: "Acidente ou Crime?",
    difficulty: "Médio",
    narrative: "Mulher de 40 anos dá entrada no PS com convulsões e coma após 'jantar romântico' com o marido. Marido alega intoxicação alimentar por frutos do mar.",
    crimeScene: "Apartamento — restos de jantar (lagosta, vinho branco, sobremesa), frasco de colírio no banheiro, copos na pia.",
    victim: { name: "Juliana Martins", age: 40, description: "Professora, saudável. Em coma no hospital." },
    suspects: [
      { name: "Ricardo Martins", relation: "Marido", description: "Caso extraconjugal descoberto. Seguro de vida no nome de Juliana." },
      { name: "Lúcia (empregada)", relation: "Empregada doméstica", description: "Preparou parte do jantar. Saiu antes da refeição." },
      { name: "Fernando Almeida", relation: "Amante de Ricardo", description: "Receberia dinheiro do seguro via Ricardo." },
    ],
    samples: [
      { id: "s1", label: "Resíduo no copo", description: "Líquido no copo usado pela vítima — cheiro levemente diferente" },
      { id: "s2", label: "Colírio (banheiro)", description: "Frasco de colírio com nível suspeito de uso" },
      { id: "s3", label: "Vinho branco", description: "Garrafa de vinho servida durante o jantar" },
    ],
    chemicalAnalysis: {
      sampleId: "s2",
      spectrum: [
        { mz: 60, intensity: 10 }, { mz: 100, intensity: 18 }, { mz: 131, intensity: 35 },
        { mz: 168, intensity: 50 }, { mz: 204, intensity: 88 }, { mz: 215, intensity: 30 },
        { mz: 232, intensity: 25 }, { mz: 260, intensity: 12 }, { mz: 289, intensity: 22 },
        { mz: 290, intensity: 5 },
      ],
      correctSubstance: "Tetrahidrozolina",
      correctBasePeak: 204,
      referenceTable: [
        { substance: "Tetrahidrozolina", basePeak: 204, fragments: [131, 168, 100] },
        { substance: "Nafazolina", basePeak: 210, fragments: [141, 168, 115] },
        { substance: "Clonidina", basePeak: 230, fragments: [213, 44, 132] },
        { substance: "Atropina", basePeak: 289, fragments: [124, 94, 67] },
        { substance: "Histamina", basePeak: 111, fragments: [82, 54, 28] },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Conteúdo Estomacal",
      reagents: ["Acetonitrila", "Metanol", "Clorofórmio"],
      correctReagent: "Acetonitrila",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 1, absorbance: 8 }, { time: 2, absorbance: 15 },
        { time: 3, absorbance: 10 }, { time: 3.5, absorbance: 22 }, { time: 4, absorbance: 30 },
        { time: 4.5, absorbance: 75 }, { time: 4.8, absorbance: 25 }, { time: 5, absorbance: 12 },
        { time: 6, absorbance: 5 }, { time: 7, absorbance: 2 },
      ],
      noisyChromatogram: [
        { time: 0, absorbance: 5 }, { time: 1, absorbance: 14 }, { time: 2, absorbance: 20 },
        { time: 3, absorbance: 16 }, { time: 3.5, absorbance: 26 }, { time: 4, absorbance: 32 },
        { time: 4.5, absorbance: 52 }, { time: 4.8, absorbance: 30 }, { time: 5, absorbance: 18 },
        { time: 6, absorbance: 12 }, { time: 7, absorbance: 8 },
      ],
      correctRetentionTime: 4.5,
      retentionRanges: [
        { className: "Histamina / Aminas biogênicas", rangeMin: 1.5, rangeMax: 2.2, substances: ["Histamina", "Tiramina", "Putrescina"] },
        { className: "Anticolinérgicos / Antimuscarínicos", rangeMin: 3.2, rangeMax: 3.8, substances: ["Atropina", "Escopolamina", "Difenidramina"] },
        { className: "Imidazolinas / Descongestionantes", rangeMin: 4.2, rangeMax: 4.8, substances: ["Tetrahidrozolina", "Nafazolina", "Oximetazolina"] },
        { className: "Agonistas α-adrenérgicos", rangeMin: 5.5, rangeMax: 6.2, substances: ["Clonidina", "Dexmedetomidina", "Fenilefrina"] },
        { className: "Toxinas marinhas", rangeMin: 6.5, rangeMax: 7.5, substances: ["Saxitoxina", "Tetrodotoxina", "Ácido ocadaico"] },
      ],
      correctSubstance: "Tetrahidrozolina",
      correctClass: "Imidazolinas / Descongestionantes",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA no copo da vítima (saliva + toque externo)", peaks: [
        { locus: "vWA", alleles: [16, 19] }, { locus: "TH01", alleles: [7, 9] },
        { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [10, 13] },
        { locus: "FGA", alleles: [22, 25] },
      ]},
      suspects: [
        { label: "Suspeito A — Ricardo", peaks: [
          { locus: "vWA", alleles: [16, 19] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [10, 13] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeita B — Lúcia", peaks: [
          { locus: "vWA", alleles: [16, 17] }, { locus: "TH01", alleles: [7, 10] },
          { locus: "TPOX", alleles: [9, 12] }, { locus: "D13S317", alleles: [10, 14] },
          { locus: "FGA", alleles: [22, 23] },
        ]},
        { label: "Suspeito C — Fernando", peaks: [
          { locus: "vWA", alleles: [15, 19] }, { locus: "TH01", alleles: [9, 8] },
          { locus: "TPOX", alleles: [11, 13] }, { locus: "D13S317", alleles: [12, 13] },
          { locus: "FGA", alleles: [21, 25] },
        ]},
      ],
      correctSuspectIndex: 0,
      degradedLoci: [],
      mixtureLoci: ["vWA"],
    },
    correctCulpritIndex: 0,
    solutionExplanation: "O colírio continha Tetrahidrozolina em concentração elevada. A toxicologia confirmou Tetrahidrozolina no conteúdo estomacal — a substância foi adicionada ao copo da vítima. O DNA externo (toque) no copo correspondeu a Ricardo, o marido, que despejou o colírio no vinho de Juliana para simular intoxicação alimentar e receber o seguro de vida.",
    chemicalExplanation: "O pico base em m/z 204 com fragmentos em 131 e 168 identifica Tetrahidrozolina. A Nafazolina (outro descongestionante) teria pico base em 210 — 6 unidades acima. Note o pico em 289 que poderia sugerir Atropina, mas como pico secundário (22% de intensidade) é apenas um fragmento coincidente, não o pico base. A Clonidina seria identificada por pico base em 230.",
    toxExplanation: "O conteúdo estomacal é a melhor matriz pois a vítima ingeriu a substância oralmente (misturada ao vinho). O pico em ~4.5 min está na faixa de Imidazolinas/Descongestionantes (4.2-4.8 min), confirmando Tetrahidrozolina. Se fosse intoxicação alimentar real, esperaríamos Histamina na faixa 1.5-2.2 min, o que está ausente como pico principal.",
    dnaExplanation: "Ricardo (Suspeito A) apresenta match perfeito em todos os 5 loci. Note que a amostra da cena possui indicação de mistura no locus vWA (possível terceiro alelo da vítima), o que é esperado em amostras de contato. Lúcia compartilha vWA (16) e TPOX (9) parcialmente, mas difere em TH01 (10 vs 9), D13S317 (14 vs 13) e FGA (23 vs 25). Fernando compartilha FGA (25) e vWA (19) parcialmente.",
  },
];
