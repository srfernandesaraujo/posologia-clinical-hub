// ─── Forensic Lab Scenario Data ─────────────────────────────
// Each scenario includes chemical spectra, HPLC chromatograms, DNA profiles,
// and the correct answers for each lab module.

export interface ForensicSample {
  id: string;
  label: string;
  description: string;
}

export interface SpectrumPeak {
  mz: number;
  intensity: number;
}

export interface ChemicalAnalysis {
  sampleId: string;
  spectrum: SpectrumPeak[];
  correctSubstance: string;
  dbMatches: { substance: string; similarity: number }[];
}

export interface ChromatogramPoint {
  time: number;
  absorbance: number;
}

export interface ToxicologyAnalysis {
  matrices: string[];
  correctMatrix: string;
  reagents: string[];
  correctReagent: string;
  chromatogram: ChromatogramPoint[];
  peakRetentionTime: number;
  library: { substance: string; retentionTime: number }[];
  correctSubstance: string;
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
}

const LOCI = ["vWA", "TH01", "TPOX", "D13S317", "FGA"];

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
        { mz: 50, intensity: 5 }, { mz: 80, intensity: 12 }, { mz: 120, intensity: 8 },
        { mz: 162, intensity: 15 }, { mz: 215, intensity: 10 }, { mz: 264, intensity: 55 },
        { mz: 282, intensity: 20 }, { mz: 334, intensity: 95 }, { mz: 350, intensity: 30 },
        { mz: 380, intensity: 8 }, { mz: 400, intensity: 3 },
      ],
      correctSubstance: "Estricnina",
      dbMatches: [
        { substance: "Estricnina", similarity: 97 },
        { substance: "Brucina", similarity: 68 },
        { substance: "Cafeína", similarity: 32 },
        { substance: "Sacarose", similarity: 15 },
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
      peakRetentionTime: 4.2,
      library: [
        { substance: "Paracetamol", retentionTime: 2.1 },
        { substance: "Estricnina", retentionTime: 4.2 },
        { substance: "Arsênico", retentionTime: 6.0 },
        { substance: "Cianeto", retentionTime: 1.3 },
      ],
      correctSubstance: "Estricnina",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA da taça da vítima (borda)", peaks: [
        { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [7, 9] },
        { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [11, 13] },
        { locus: "FGA", alleles: [21, 24] },
      ]},
      suspects: [
        { label: "Suspeita A — Ana", peaks: [
          { locus: "vWA", alleles: [14, 17] }, { locus: "TH01", alleles: [6, 9] },
          { locus: "TPOX", alleles: [8, 10] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito B — Roberto", peaks: [
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [11, 13] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
        { label: "Suspeito C — Marcos", peaks: [
          { locus: "vWA", alleles: [15, 19] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [9, 12] }, { locus: "D13S317", alleles: [10, 14] },
          { locus: "FGA", alleles: [20, 23] },
        ]},
      ],
      correctSuspectIndex: 1,
    },
    correctCulpritIndex: 1,
    solutionExplanation: "O resíduo cristalino na taça foi identificado como Estricnina pelo espectrômetro de massa. A toxicologia confirmou Estricnina no conteúdo estomacal. O DNA na borda da taça da vítima correspondeu ao perfil genético de Roberto Leal, que tinha motivo financeiro (dívida de R$500 mil) e oportunidade (teve acesso à taça durante o jantar).",
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
      { name: "Sandra Costa", relation: "Gerente", description: "Demitida na semana anterior. Ameaçou 'dar o troco'." },
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
        { mz: 40, intensity: 8 }, { mz: 57, intensity: 45 }, { mz: 71, intensity: 60 },
        { mz: 85, intensity: 95 }, { mz: 99, intensity: 70 }, { mz: 113, intensity: 50 },
        { mz: 127, intensity: 35 }, { mz: 141, intensity: 20 }, { mz: 155, intensity: 12 },
        { mz: 170, intensity: 5 },
      ],
      correctSubstance: "Gasolina",
      dbMatches: [
        { substance: "Gasolina", similarity: 94 },
        { substance: "Querosene", similarity: 72 },
        { substance: "Diesel", similarity: 58 },
        { substance: "Acetona", similarity: 25 },
      ],
    },
    toxicologyAnalysis: {
      matrices: ["Sangue", "Urina", "Conteúdo Estomacal"],
      correctMatrix: "Sangue",
      reagents: ["Hexano", "Acetonitrila", "Diclorometano"],
      correctReagent: "Hexano",
      chromatogram: [
        { time: 0, absorbance: 0 }, { time: 1, absorbance: 3 }, { time: 2, absorbance: 10 },
        { time: 3, absorbance: 25 }, { time: 3.5, absorbance: 70 }, { time: 3.8, absorbance: 30 },
        { time: 4, absorbance: 15 }, { time: 5, absorbance: 8 }, { time: 6, absorbance: 5 },
        { time: 7, absorbance: 2 }, { time: 8, absorbance: 1 },
      ],
      peakRetentionTime: 3.5,
      library: [
        { substance: "Etanol", retentionTime: 1.8 },
        { substance: "Benzeno (componente da gasolina)", retentionTime: 3.5 },
        { substance: "Tolueno", retentionTime: 5.2 },
        { substance: "Acetona", retentionTime: 2.3 },
      ],
      correctSubstance: "Benzeno (componente da gasolina)",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA do pavio (suor/contato)", peaks: [
        { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [8, 9.3] },
        { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [12, 14] },
        { locus: "FGA", alleles: [22, 25] },
      ]},
      suspects: [
        { label: "Suspeito A — Pedro", peaks: [
          { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 8] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [11, 13] },
          { locus: "FGA", alleles: [20, 23] },
        ]},
        { label: "Suspeita B — Sandra", peaks: [
          { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [8, 9.3] },
          { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito C — Jorge", peaks: [
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [6, 9] },
          { locus: "TPOX", alleles: [8, 10] }, { locus: "D13S317", alleles: [13, 15] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
      ],
      correctSuspectIndex: 1,
    },
    correctCulpritIndex: 1,
    solutionExplanation: "A gasolina foi identificada como acelerante nos escombros. Vestígios de benzeno (componente da gasolina) foram encontrados no sangue coletado na cena. O DNA no pavio corresponde a Sandra Costa, ex-gerente demitida, que tinha motivo (vingança) e acesso ao galpão com suas chaves.",
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
        { mz: 150, intensity: 20 }, { mz: 182, intensity: 45 }, { mz: 272, intensity: 25 },
        { mz: 303, intensity: 92 }, { mz: 320, intensity: 18 }, { mz: 350, intensity: 5 },
      ],
      correctSubstance: "Cocaína",
      dbMatches: [
        { substance: "Cocaína", similarity: 95 },
        { substance: "Lidocaína", similarity: 55 },
        { substance: "Procaína", similarity: 42 },
        { substance: "Manitol", similarity: 18 },
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
      peakRetentionTime: 5.5,
      library: [
        { substance: "Anfetamina", retentionTime: 2.5 },
        { substance: "Diazepam", retentionTime: 7.1 },
        { substance: "Fentanil", retentionTime: 5.5 },
        { substance: "Cocaína", retentionTime: 3.8 },
      ],
      correctSubstance: "Fentanil",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA do saco plástico (toque)", peaks: [
        { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 8] },
        { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [9, 11] },
        { locus: "FGA", alleles: [23, 26] },
      ]},
      suspects: [
        { label: "Suspeito A — Thiago", peaks: [
          { locus: "vWA", alleles: [15, 17] }, { locus: "TH01", alleles: [6, 9] },
          { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
        { label: "Suspeita B — Camila", peaks: [
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [9, 13] }, { locus: "D13S317", alleles: [10, 13] },
          { locus: "FGA", alleles: [22, 25] },
        ]},
        { label: "Suspeito C — Diego", peaks: [
          { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 8] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [9, 11] },
          { locus: "FGA", alleles: [23, 26] },
        ]},
      ],
      correctSuspectIndex: 2,
    },
    correctCulpritIndex: 2,
    solutionExplanation: "O pó branco foi identificado como Cocaína. Porém a toxicologia revelou Fentanil no sangue — substância muito mais letal, adicionada à cocaína (adulteração). O DNA no saco plástico correspondeu a Diego Nunes, o fornecedor, que adulterou a droga com Fentanil, causando a overdose fatal.",
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
        { mz: 44, intensity: 15 }, { mz: 77, intensity: 25 }, { mz: 91, intensity: 40 },
        { mz: 119, intensity: 30 }, { mz: 148, intensity: 90 }, { mz: 164, intensity: 35 },
        { mz: 180, intensity: 20 }, { mz: 210, intensity: 10 },
      ],
      correctSubstance: "Anfetamina",
      dbMatches: [
        { substance: "Anfetamina", similarity: 93 },
        { substance: "Efedrina", similarity: 65 },
        { substance: "Enalapril", similarity: 12 },
        { substance: "Amido", similarity: 8 },
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
      peakRetentionTime: 2.5,
      library: [
        { substance: "Enalapril", retentionTime: 4.8 },
        { substance: "Anfetamina", retentionTime: 2.5 },
        { substance: "Cafeína", retentionTime: 3.2 },
        { substance: "Metformina", retentionTime: 1.5 },
      ],
      correctSubstance: "Anfetamina",
    },
    dnaAnalysis: {
      sceneSample: { label: "DNA da embalagem (impressão digital)", peaks: [
        { locus: "vWA", alleles: [17, 19] }, { locus: "TH01", alleles: [6, 8] },
        { locus: "TPOX", alleles: [10, 13] }, { locus: "D13S317", alleles: [11, 15] },
        { locus: "FGA", alleles: [20, 22] },
      ]},
      suspects: [
        { label: "Suspeito A — Farmácia (funcionário)", peaks: [
          { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [7, 9] },
          { locus: "TPOX", alleles: [8, 11] }, { locus: "D13S317", alleles: [12, 14] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
        { label: "Suspeito B — MedBrasil (responsável)", peaks: [
          { locus: "vWA", alleles: [17, 19] }, { locus: "TH01", alleles: [6, 8] },
          { locus: "TPOX", alleles: [10, 13] }, { locus: "D13S317", alleles: [11, 15] },
          { locus: "FGA", alleles: [20, 22] },
        ]},
        { label: "Suspeito C — Carlos Mendes", peaks: [
          { locus: "vWA", alleles: [15, 18] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [9, 12] }, { locus: "D13S317", alleles: [10, 13] },
          { locus: "FGA", alleles: [23, 25] },
        ]},
      ],
      correctSuspectIndex: 1,
    },
    correctCulpritIndex: 1,
    solutionExplanation: "Os comprimidos rotulados como Enalapril continham Anfetamina, explicando taquicardia e insônia nos pacientes. A toxicologia dos pacientes confirmou Anfetamina na urina. O DNA na embalagem correspondeu ao responsável da Distribuidora MedBrasil, empresa fantasma que fabricava medicamentos falsificados.",
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
        { mz: 150, intensity: 60 }, { mz: 197, intensity: 25 }, { mz: 225, intensity: 8 },
      ],
      correctSubstance: "Arsênico (trióxido)",
      dbMatches: [
        { substance: "Arsênico (trióxido)", similarity: 96 },
        { substance: "Antimônio", similarity: 45 },
        { substance: "Tálio", similarity: 38 },
        { substance: "Chumbo", similarity: 22 },
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
      peakRetentionTime: 5.0,
      library: [
        { substance: "Chumbo", retentionTime: 3.0 },
        { substance: "Mercúrio", retentionTime: 6.8 },
        { substance: "Arsênico", retentionTime: 5.0 },
        { substance: "Tálio", retentionTime: 7.5 },
      ],
      correctSubstance: "Arsênico",
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
          { locus: "vWA", alleles: [16, 18] }, { locus: "TH01", alleles: [7, 8] },
          { locus: "TPOX", alleles: [9, 11] }, { locus: "D13S317", alleles: [11, 13] },
          { locus: "FGA", alleles: [21, 25] },
        ]},
        { label: "Suspeito C — Dr. Paulo", peaks: [
          { locus: "vWA", alleles: [14, 16] }, { locus: "TH01", alleles: [6, 10] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [13, 15] },
          { locus: "FGA", alleles: [20, 23] },
        ]},
      ],
      correctSuspectIndex: 0,
    },
    correctCulpritIndex: 0,
    solutionExplanation: "O frasco continha Arsênico (trióxido). A análise segmentar do cabelo revelou exposição crônica ao Arsênico ao longo de 6 semanas. O DNA no frasco correspondeu a Renata Souza, a neta, que administrava doses sub-letais progressivas para simular morte natural e herdar a fortuna.",
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
        { mz: 168, intensity: 50 }, { mz: 204, intensity: 88 }, { mz: 232, intensity: 25 },
        { mz: 260, intensity: 12 }, { mz: 290, intensity: 5 },
      ],
      correctSubstance: "Tetrahidrozolina (colírio)",
      dbMatches: [
        { substance: "Tetrahidrozolina (colírio)", similarity: 94 },
        { substance: "Nafazolina", similarity: 62 },
        { substance: "Clonidina", similarity: 48 },
        { substance: "Histamina", similarity: 15 },
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
      peakRetentionTime: 4.5,
      library: [
        { substance: "Histamina (frutos do mar)", retentionTime: 2.0 },
        { substance: "Tetrahidrozolina", retentionTime: 4.5 },
        { substance: "Escopolamina", retentionTime: 6.2 },
        { substance: "Atropina", retentionTime: 3.5 },
      ],
      correctSubstance: "Tetrahidrozolina",
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
          { locus: "vWA", alleles: [14, 17] }, { locus: "TH01", alleles: [8, 10] },
          { locus: "TPOX", alleles: [10, 12] }, { locus: "D13S317", alleles: [11, 14] },
          { locus: "FGA", alleles: [20, 23] },
        ]},
        { label: "Suspeito C — Fernando", peaks: [
          { locus: "vWA", alleles: [15, 18] }, { locus: "TH01", alleles: [6, 8] },
          { locus: "TPOX", alleles: [8, 13] }, { locus: "D13S317", alleles: [12, 15] },
          { locus: "FGA", alleles: [21, 24] },
        ]},
      ],
      correctSuspectIndex: 0,
    },
    correctCulpritIndex: 0,
    solutionExplanation: "O colírio continha Tetrahidrozolina em concentração elevada. A toxicologia confirmou Tetrahidrozolina no conteúdo estomacal — a substância foi adicionada ao copo da vítima. O DNA externo (toque) no copo correspondeu a Ricardo, o marido, que despejou o colírio no vinho de Juliana para simular intoxicação alimentar e receber o seguro de vida.",
  },
];
